import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { state } from '../server/league.mjs'

const require = createRequire(import.meta.url)
const { MockAgent, getGlobalDispatcher, setGlobalDispatcher } =
  createRequire(require.resolve('@vercel/blob'))('undici')

test('Blob serializa escrituras locales y vuelve a leer tras un conflicto externo', async (t) => {
  let stored = { students: {}, round: null, updates: [] }
  let revision = 0
  let conflicts = 0
  let writeExternally = true
  let rejectWrites = false
  const etag = () => '"' + revision + '"'
  const agent = new MockAgent()
  const dispatcher = getGlobalDispatcher()
  agent.disableNetConnect()
  setGlobalDispatcher(agent)
  t.after(async () => {
    setGlobalDispatcher(dispatcher)
    await agent.close()
  })
  process.env.VERCEL_BLOB_API_URL = 'https://blob-api.example.test'
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_fixture'
  process.env.VERCEL_BLOB_RETRIES = '0'
  delete process.env.BLOB_STORE_ID
  agent
    .get('https://test.private.blob.vercel-storage.com')
    .intercept({ path: '/classroom/v1.json?cache=0' })
    .reply(() => ({
      statusCode: 200,
      data: JSON.stringify(stored),
      responseOptions: { headers: { etag: etag() } },
    }))
    .delay(4)
    .persist()
  agent
    .get('https://blob-api.example.test')
    .intercept({ method: 'PUT', path: '/?pathname=classroom%2Fv1.json' })
    .reply(({ body, headers }) => {
      if (writeExternally) {
        writeExternally = false
        stored.updates.push('otra instancia')
        revision++
      }
      if (rejectWrites || new Headers(headers).get('x-if-match') !== etag()) {
        conflicts++
        return { statusCode: 412, data: { error: { code: 'precondition_failed' } } }
      }
      stored = JSON.parse(body)
      revision++
      return { statusCode: 200, data: { etag: etag() } }
    })
    .delay(10)
    .persist()

  const updates = Array.from({ length: 16 }, (_, i) => i)
  const append = (value) => state((s) => {
    s.updates.push(value)
  }, true)
  await Promise.all(updates.map(append))
  assert.deepEqual(stored.updates, ['otra instancia', ...updates])
  assert.equal(conflicts, 1)

  rejectWrites = true
  await assert.rejects(append('rechazado'), { status: 503 })
  assert.equal(conflicts, 7)
  assert.deepEqual(stored.updates, ['otra instancia', ...updates])

  rejectWrites = false
  await append('recuperado')
  assert.deepEqual(stored.updates, ['otra instancia', ...updates, 'recuperado'])
})
