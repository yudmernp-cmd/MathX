import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import {
  enroll,
  identify,
  boards,
  toggle,
  submit,
  examTicket,
  drillTicket,
} from '../server/league.mjs'
import { drills } from '../server/drills/index.mjs'
test('identidad, concurrencia, clasificación y aislamiento entre convocatorias', async () => {
  process.env.MATHX_LEAGUE_DB = ':memory:'
  delete process.env.BLOB_READ_WRITE_TOKEN
  delete process.env.VERCEL
  process.env.MATHX_SESSION_SECRET = randomBytes(32).toString('hex')
  const a = await enroll({ name: 'Ana', dni: '00000001' }),
    b = await enroll({ name: 'Luis', dni: '00000002' })
  assert.match(a.code, /^\d{6}$/)
  await assert.rejects(enroll({ name: 'Otro', dni: '00000001' }))
  const id = await identify({ ...a, dni: '00000001' }),
    other = await identify({ ...b, dni: '00000002' })
  await assert.rejects(identify({ ...a, name: 'Luis', dni: '00000001' }))
  const q = drills('Funciones', 3, 10)[0],
    proof = { drill: q, signature: drillTicket(id, q), answer: q.respuesta }
  await assert.rejects(submit(other, proof))
  await assert.rejects(
    submit(id, { ...proof, drill: { ...q, respuesta: '0' } }),
  )
  await Promise.all([submit(id, proof), submit(id, proof)])
  assert.deepEqual(await boards(), {
    exams: null,
    exercises: [
      { name: 'Ana', points: 1 },
      { name: 'Luis', points: 0 },
    ],
  })
  const questions = [{ parts: [{ value: 2 }, { value: null }] }],
    until = Date.now() + 90000
  assert.equal(await examTicket(id, questions, until), null)
  await toggle(true)
  const ticket = await examTicket(id, questions, until)
  await assert.rejects(submit(other, { ticket, answers: { '0-0': '2' } }))
  await submit(id, { ticket, answers: { '0-0': '4/2' } })
  assert.deepEqual((await boards()).exams, [{ name: 'Ana', points: 1 }])
  await submit(id, { ticket, answers: {} })
  await toggle(false)
  await toggle(true)
  assert.deepEqual(await submit(id, { ticket, answers: { '0-0': '2' } }), {
    counted: false,
    questions,
  })
  assert.deepEqual((await boards()).exams, [])
  await toggle(false)
})
