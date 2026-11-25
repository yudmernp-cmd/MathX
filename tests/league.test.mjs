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
  const a = await enroll({ name: 'Ana' }),
    b = await enroll({ name: 'Luis' })
  assert.match(a.code, /^\d{6}$/)
  await assert.rejects(enroll({ name: '  ' }))
  const id = await identify(a),
    other = await identify(b)
  await assert.rejects(identify({ ...a, name: 'Luis' }))
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

test('padrón histórico, rotación, reinicio y baja mantienen aislados accesos y datos', async () => {
  process.env.MATHX_LEAGUE_DB = ':memory:'
  delete process.env.BLOB_READ_WRITE_TOKEN
  delete process.env.VERCEL
  process.env.MATHX_SESSION_SECRET ||= randomBytes(32).toString('hex')
  const { createHmac } = await import('node:crypto')
  const { state, directory, manageStudent, checkAccess } = await import('../server/league.mjs')
  const sign = (domain, value) => createHmac('sha256', process.env.MATHX_SESSION_SECRET)
    .update(JSON.stringify([domain, value])).digest('hex')
  const dni = '00000123', code = '009876', name = 'Cuenta histórica'
  const id = sign('dni', dni)
  await state(s => {
    s.students[id] = { name, points: 3, seen: { x: 1 }, weeks: { last: {} },
      pin: sign('pin', [id, code]), codeTag: sign('assigned-code', code) }
    s.assignments = { x: { attempts: { [id]: { grade: { points: 2 } } } } }
    s.round = { best: { [id]: 2 }, submitted: {} }
  }, true)
  const detail = () => directory().then(rows => rows.find(r => r.name === name))
  assert.equal(Object.hasOwn(await detail(), 'dni'), false)
  assert.equal((await manageStudent({ id, operation: 'reveal' })).code, null)
  const old = await identify({ code, name }, true)
  assert.equal(Object.hasOwn(await detail(), 'dni'), false)
  assert.equal((await manageStudent({ id, operation: 'reveal' })).code, code)
  assert.ok(!(await state(s => JSON.stringify(s))).includes(JSON.stringify(dni)))
  await manageStudent({ id, operation: 'code', code: '000124' })
  await assert.rejects(checkAccess(old), { status: 401 })
  await assert.rejects(identify({ name, code }), { status: 401 })
  const login = { name, code: '000124' }
  const active = await identify(login, true)
  assert.equal(await checkAccess(active), true)
  assert.equal((await detail()).points, 3)
  const fresh = await manageStudent({ id, operation: 'reset' })
  assert.notEqual(fresh.id, id)
  assert.equal(await identify(login), fresh.id)
  assert.equal((await detail()).points, 0)
  assert.ok(await state(s => !s.students[id] && !s.round.best[id] && !s.assignments.x.attempts[id] &&
    !s.students[fresh.id].weeks && !Object.keys(s.students[fresh.id].seen).length))
  await assert.rejects(checkAccess(active), { status: 401 })
  const session = await identify(login, true)
  await manageStudent({ id: fresh.id, operation: 'delete' })
  assert.equal(await detail(), undefined)
  await assert.rejects(identify(login), { status: 401 })
  await enroll({ name })
  await assert.rejects(checkAccess(session), { status: 401 })
  assert.notEqual((await detail()).id, fresh.id)
})

test('los alumnos con el mismo nombre conservan cuentas independientes', async () => {
  const first = await enroll({ name: 'María Pérez' })
  const second = await enroll({ name: 'María Pérez' })
  assert.notEqual(first.code, second.code)
  assert.notEqual(await identify({ ...first, name: '  MARÍA   PÉREZ  ' }), await identify(second))
})
