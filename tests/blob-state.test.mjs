import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { state } from '../server/league.mjs'
import { assignments } from '../server/assignments.mjs'

const require = createRequire(import.meta.url)
const { MockAgent, getGlobalDispatcher, setGlobalDispatcher } =
  createRequire(require.resolve('@vercel/blob'))('undici')

test('publicar un reto conserva cambios concurrentes y usa la revisión del almacén', async (t) => {
  let stored = { students: {}, round: null, updates: [] }
  let revision = 0
  let conflicts = 0
  let writeExternally = true
  let rejectWrites = false
  const etag = () => 'revision-' + revision
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
    .reply(() => stored ? {
      statusCode: 200,
      data: JSON.stringify(stored),
      responseOptions: { headers: { etag: 'W/"' + etag() + '"' } },
    } : { statusCode: 404, data: '' })
    .delay(4)
    .persist()
  agent
    .get('https://blob-api.example.test')
    .intercept({ path: '/?url=classroom%2Fv1.json' })
    .reply(() => stored
      ? { statusCode: 200, data: { etag: etag() } }
      : { statusCode: 404, data: { error: { code: 'not_found' } } }
    )
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
      const options = new Headers(headers)
      if (!stored) assert.equal(options.get('x-allow-overwrite'), '0')
      if (rejectWrites || options.get('x-if-match') !== (stored ? etag() : null)) {
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
  const question = {
    kind: 'challenge',
    title: 'Área',
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    stem: 'Calcula el área de un cuadrado de lado 2.',
  }
  const otherInstance = await import('../server/league.mjs?second-instance')
  const [published] = await Promise.all([
    assignments('admin', 'publish', question),
    otherInstance.state((s) => { s.otherClassActive = true }, true),
    ...updates.map(append),
  ])
  assert.equal(stored.assignments[published.id].questions[0].stem, question.stem)
  assert.equal(stored.otherClassActive, true)
  await assert.rejects(assignments('admin', 'publish', question), { status: 409 })
  assert.deepEqual(stored.updates, ['otra instancia', ...updates])
  const externalConflicts = conflicts
  assert.ok(externalConflicts >= 1)

  rejectWrites = true
  await assert.rejects(append('rechazado'), { status: 503 })
  assert.equal(conflicts, externalConflicts + 6)
  assert.deepEqual(stored.updates, ['otra instancia', ...updates])

  rejectWrites = false
  await append('recuperado')
  assert.deepEqual(stored.updates, ['otra instancia', ...updates, 'recuperado'])

  stored = null
  const first = await assignments('admin', 'publish', question)
  assert.equal(stored.assignments[first.id].questions[0].stem, question.stem)
})
