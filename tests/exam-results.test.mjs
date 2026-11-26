import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { assignments } from '../server/assignments.mjs'
import { examReport } from '../server/exam-results.mjs'
import { boards, enroll, examTicket, identify, state, submit } from '../server/league.mjs'
import { mac, paperSignature } from '../server/session.mjs'

process.env.MATHX_LEAGUE_DB = ':memory:'
process.env.MATHX_SESSION_SECRET = randomBytes(32).toString('hex')
delete process.env.BLOB_READ_WRITE_TOKEN
delete process.env.VERCEL

const admin = { id: 'admin', admin: true }
async function student(name) {
  return identify(await enroll({ name }), true)
}
const questions = [
  { stem: 'Calcula 3+2.', parts: [{ value: 5, marks: 40, steps: ['3+2=5.'], rubric: [] }] },
  { stem: 'Explica el resultado.', parts: [{ value: null, marks: 40, steps: ['Justifica el método.'], rubric: [] }] },
]
const learning = who => assignments(who.id, 'learning', {}, who)

test('informe personal conserva el primer envío y la revisión cambia los puntos de la pregunta', async () => {
  const owner = await student('Alumna de práctica')
  const other = await student('Otro alumno de práctica')
  const ticket = await examTicket(owner.id, questions, Date.now() + 60000, 1)
  const answers = { '0-0': '10/2', '1-0': 'Mi explicación' }
  const notes = { '1-0': 'Cada sumando contribuye al total.' }
  const { resultId } = await submit(owner.id, { ticket, answers, notes }, owner)
  const ref = { id: resultId, student: owner.id }
  const open = who => examReport(who, { action: 'open', ref })
  const first = await open(owner)
  assert.equal(first.paper, 1)
  assert.deepEqual(first.rows.map(q => [q.earned, q.pending, q.max]), [[40, 0, 40], [0, 40, 40]])
  assert.equal(first.rows[0].parts[0].steps[0], '3+2=5.')
  assert.equal(first.rows[1].parts[0].notes, notes['1-0'])
  assert.ok((await learning(owner)).results.some(result => result.ref.id === resultId))
  assert.ok(!(await learning(other)).results.some(result => result.ref.id === resultId))
  assert.equal((await submit(owner.id, { ticket, answers: {}, notes: {} }, owner)).resultId, resultId)
  assert.deepEqual(await open(owner), first)
  await assert.rejects(open(other), { status: 404 })
  await assert.rejects(open({ ...owner, version: 'revocada' }), { status: 401 })

  const appeal = { action: 'appeal', ref, index: 1, reason: 'Revisa mi procedimiento.' }
  await assert.rejects(examReport(other, appeal), { status: 404 })
  await examReport(owner, appeal)
  await examReport(owner, appeal)
  const requests = (await learning(admin)).results.filter(result => result.ref.id === resultId)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].waiting, 1)
  const decision = { action: 'resolve', ref, index: 1, score: 20, feedback: 'Método parcialmente correcto.' }
  assert.throws(() => examReport(owner, decision), { status: 403 })
  await assert.rejects(examReport(admin, { ...decision, score: 41 }), { status: 400 })
  for (const points of [20, 20, 18]) {
    await examReport(admin, { ...decision, score: points })
    const reviewed = await open(owner)
    assert.deepEqual(reviewed.rows.map(q => q.earned), [40, points])
    assert.equal(reviewed.rows[1].pending, 0)
    assert.equal(reviewed.rows[1].parts[0].answer, answers['1-0'])
    assert.equal(reviewed.rows[1].review.feedback, decision.feedback)
  }
  assert.ok(!(await learning(admin)).results.some(result => result.ref.id === resultId))
})

test('una convocatoria vencida conserva el cuadernillo original y aplica la corrección al top', async t => {
  const owner = await student('Alumna de convocatoria')
  const id = randomUUID()
  const now = Date.now()
  t.mock.timers.enable({ apis: ['Date'], now })
  // Simula una convocatoria importada con un intento previo a un cambio de cuadernillo.
  await state(s => {
    s.assignments ??= {}
    s.assignments[id] = {
      id, kind: 'exam', title: 'Convocatoria de revisión', opens: now - 1000, closes: now + 90000,
      paper: 1, minutes: 1, showTop: true, questions: [], snapshots: { original: { paper: 2, questions } },
      attempts: { [owner.id]: { snapshot: 'original', deadline: now + 60000,
        answers: { '0-0': '5', '1-0': 'Mi explicación' }, notes: {}, revision: 0 } },
    }
  }, true)
  const ref = { id, assigned: true, student: owner.id }
  const open = () => examReport(owner, { action: 'open', ref })
  await assert.rejects(open(), { status: 409 })
  t.mock.timers.tick(60000)
  const report = await open()
  assert.equal(report.paper, 2)
  assert.equal(report.rows[0].parts[0].steps[0], '3+2=5.')
  assert.deepEqual(report.rows.map(q => q.max), [40, 40])
  await examReport(owner, { action: 'appeal', ref, index: 1, reason: 'Valorar justificación.' })
  assert.ok((await learning(admin)).results.some(r => r.ref.id === id && r.waiting === 1))
  for (const score of [20, 20, 25]) {
    await examReport(admin, { action: 'resolve', ref, index: 1, score, feedback: 'Procedimiento revisado.' })
    assert.equal((await open()).rows[1].earned, score)
    const published = await assignments(owner.id, 'myTask', { task: id }, owner)
    assert.deepEqual(published.grade.scores, [40, score])
    assert.equal(published.grade.points, 40 + score)
    assert.equal((await boards(owner)).exams.find(p => p.name === 'Alumna de convocatoria').points, 40 + score)
  }
})

test('Simulacro Pro corrige desde su solucionario y verifica la firma y el propietario del intento', async t => {
  const workedFile = 'server-data/pro-worked.json'
  if (!existsSync(workedFile)) return t.skip('Solucionario privado Pro ausente.')
  const catalog = JSON.parse(readFileSync('server-data/pro/catalog.json', 'utf8'))
  const worked = JSON.parse(readFileSync(workedFile, 'utf8'))
  const owner = await student('Alumna de simulacro')
  const other = await student('Otro alumno de simulacro')
  for (const paper of [1, 2]) {
    const entry = catalog.find(p => p.paper === paper)
    const scheme = worked[entry.id]
    const [number, parts] = Object.entries(scheme).find(([, keys]) =>
      Object.values(keys).some(k => k.marks > 0 && Number.isFinite(k.value)))
    const [part, key] = Object.entries(parts).find(([, k]) => k.marks > 0 && Number.isFinite(k.value))
    const answerKey = part === 'question' ? number : number + ':' + part
    const deadline = Date.now() + 60000
    const body = { action: 'finishPro', proId: entry.id, deadline, signature: paperSignature(owner.id, entry.id),
      ticket: mac(['pro-attempt', owner.id, entry.id, deadline].join(':')), answers: { [answerKey]: String(key.value) } }
    await assert.rejects(examReport(other, body), { status: 403 })
    await assert.rejects(examReport(owner, { ...body, deadline: deadline - 1 }), { status: 403 })
    const report = await examReport(owner, body)
    assert.equal(report.paper, paper)
    assert.equal(report.rows.reduce((n, q) => n + q.max, 0), 80)
    assert.equal(report.rows.reduce((n, q) => n + q.earned, 0), key.marks)
    const marked = report.rows[Number(number) - 1].parts.find(p => p.label === part)
    assert.deepEqual(marked.steps, [key.steps])
    assert.equal(marked.answer, String(key.value))
    const replay = await examReport(owner, { ...body, answers: {} })
    assert.deepEqual(replay, report)
  }
})
