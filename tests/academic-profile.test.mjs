import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import catalog from '../shared/academic.json' with { type: 'json' }
import { academicCard, recordDay, recordExam, refreshAcademic } from '../server/academics.mjs'
import { academicProfile, boards, enroll, identify, drillTicket, drillHelp, manageStudent, state, submit } from '../server/league.mjs'
import { assignments } from '../server/assignments.mjs'
import { examReport } from '../server/exam-results.mjs'

process.env.MATHX_LEAGUE_DB = ':memory:'
process.env.MATHX_SESSION_SECRET = randomBytes(32).toString('hex')
delete process.env.BLOB_READ_WRITE_TOKEN
delete process.env.VERCEL
const register = async name => identify(await enroll({ name }), true)
const admin = { id: 'admin', admin: true }
const plain = { color: null, title: null, frame: null, badges: [] }
const range = count => Array.from({ length: count }, (_, i) => i)
const subjects = catalog.filter(row => row.topic)
const seen = n => Object.fromEntries(range(n).map(i => [i, 1]))

test('los rangos respetan cantidades, temas, precisión, días de Lima y bandas revisadas', () => {
  const p = { seen: seen(49), points: 5000, stats: {} }
  const earned = id => (refreshAcademic(p), academicCard(p, true).earned.includes(id))
  assert.ok(!earned('bronze'))
  p.seen = seen(50)
  assert.ok(earned('bronze'))
  p.seen = seen(150)
  for (const { topic } of subjects.slice(0, 2)) p.stats[topic + ' · 1'] = { tried: 40, solved: 35, first: 33 }
  assert.ok(!earned('silver'))
  p.stats['Cálculo · 5'] = { tried: 60, solved: 40, first: 25 }
  assert.ok(earned('silver'))
  assert.ok(!earned('all-topics'))
  p.seen = seen(300)
  for (const { topic } of subjects) {
    p.stats[topic + ' · 1'] = { tried: 50, solved: 49, first: 40 }
    for (const day of ['2026-09-01T05:00Z', '2026-09-02T01:00Z', '2026-09-03T18:00Z']) recordDay(p, topic, Date.parse(day))
  }
  assert.ok(earned('all-topics') && earned('recovery'))
  assert.ok(!earned('functions') && !earned('gold'))
  recordExam(p, 1, 79, true, 59)
  recordExam(p, 1, 80, false, 59)
  recordExam(p, 1, 80, true)
  assert.ok(earned('p1') && !earned('band-5'))
  recordExam(p, 2, 80, true, 40)
  assert.ok(!earned('band-5'))
  recordExam(p, 2, 80, true, 41)
  assert.ok(earned('gold') && earned('expert-p2'))
  recordExam(p, 1, 80, true, 58)
  for (const { topic } of subjects) recordDay(p, topic, Date.parse('2026-09-04T05:00Z'))
  assert.ok(earned('functions') && !earned('calculus') && !earned('ruby'))
  p.stats['Cálculo · 5'] = { tried: 60, solved: 58, first: 48 }
  assert.ok(earned('ruby'))
  assert.ok(!earned('exam-master'))
  recordExam(p, 2, 80, true, 53)
  recordExam(p, 1, 80, true, 12)
  p.stats['Funciones · 1'].tried += 300
  assert.ok(earned('exam-master') && earned('ruby') && earned('functions') && earned('band-7'))
  assert.equal(academicCard(p).rank, 'ruby')
})

test('la tanda firmada distingue intentos, repeticiones, ayudas y cuentas', async () => {
  const owner = await register('Perfil Tandista'), other = await register('Perfil Acompañante')
  function batch(start) {
    const group = randomUUID()
    return range(15).map(slot => {
      const drill = { tema: 'Funciones', dificultad: 3, batch: group, slot, instruccion: 'Evalúa',
        expresion: '2+' + (start + slot), respuesta: String(start + slot + 2), tipo_tarea: 'evaluar_funcion' }
      return { drill, signature: drillTicket(owner.id, drill), answer: drill.respuesta }
    })
  }
  const answer = q => submit(owner.id, q, owner)
  const card = () => academicProfile(owner)
  const first = batch(1)
  await assert.rejects(drillHelp(other, first[0]), { status: 400 })
  await assert.rejects(answer({ ...first[0], drill: { ...first[0].drill, slot: 2 } }), { status: 400 })
  for (const q of first) { await answer({ ...q, answer: '123456' }); await answer(q) }
  assert.deepEqual(new Set((await card()).earned), new Set(['first-batch', 'recovery']))
  for (const q of batch(1)) await answer(q)
  assert.ok(!(await card()).earned.includes('perfect'))
  const second = batch(101)
  await answer(second[0])
  await drillHelp(owner, second[0])
  for (const q of second.slice(1)) await answer(q)
  assert.ok((await card()).earned.includes('perfect') && !(await card()).earned.includes('unaided'))
  const third = batch(201)
  for (const q of third.slice(0, -1)) await answer(q)
  assert.ok(!(await card()).earned.includes('unaided'))
  await Promise.all([answer(third.at(-1)), answer(third.at(-1))])
  await drillHelp(owner, third.at(-1))
  assert.ok((await card()).earned.includes('unaided'))
  assert.equal((await boards()).exercises.find(p => p.name === 'Perfil Tandista').points, 45)
  assert.ok(!(await academicProfile(other)).earned.length)
  // A legacy account may have credited this question before first attempts were stored.
  const old = { ...first[0], signature: drillTicket(other.id, first[0].drill) }
  await submit(other.id, old, other)
  await state(s => {
    const p = s.students[other.id]
    delete p.stats
    delete p.tried
    delete p.academics
  }, true)
  await submit(other.id, old, other)
  assert.equal(await state(s => Object.values(s.students[other.id].stats)[0].first), 0)
})

test('los datos previos, las revisiones, los permisos y las preferencias sobreviven a correcciones y a otra sesión', async () => {
  const account = await enroll({ name: 'Personalizable' })
  const owner = await identify(account, true), other = await register('Visitante de la tarjeta')
  const task = randomUUID(), now = Date.now(), challenges = range(3).map(() => randomUUID())
  const questions = [{ parts: [{ value: 5, marks: 40, rubric: [] }] }, { parts: [{ value: null, marks: 40, rubric: [] }] }]
  await state(s => {
    const p = s.students[owner.id]
    p.stats = { 'Funciones · 3': { tried: 60, first: 50, solved: 55 } }
    p.seen = seen(55)
    p.weeks = Object.fromEntries(['2026-01-05', '2026-01-12', '2026-01-19'].map(w => [w, { 3: { tried: 10, first: 8 } }]))
    s.assignments ??= {}
    s.assignments[task] = { id: task, kind: 'exam', paper: 1, showTop: true, opens: 0, questions: [],
      snapshots: { old: { paper: 2, questions } },
      attempts: { [owner.id]: { snapshot: 'old', deadline: now - 500, answers: { '0-0': '5', '1-0': 'Resolución' }, notes: {} } } }
    for (const id of challenges) s.assignments[id] = { id, kind: 'challenge', attempts: {
      [owner.id]: { deadline: now-1000, grade: { points: id === challenges[2] ? 14 : 20 } } } }
  }, true)
  const call = data => assignments('admin', 'grade', { task, student: owner.id, comment: '', ...data }, admin)
  let own = await academicProfile(owner)
  assert.deepEqual(new Set(own.earned), new Set(['bronze','weeks','recovery','p2','exam-complete','challenge-perfect']))
  assert.ok(!own.earned.includes('challenge-frame'))
  const ref = { id: task, assigned: true, student: owner.id }
  await examReport(admin, { action: 'resolve', ref, index: 0, score: 40, feedback: 'Primer apartado revisado.' })
  assert.ok(!(await academicProfile(owner)).earned.includes('band-5'))
  await call({ scores: [40, 23] })
  await call({ scores: [0, 0] })
  await call({ task: challenges[2], scores: [16] })
  await assignments('admin', 'delete', { task: challenges[2], editVersion: 0 }, admin)
  own = await academicProfile(owner)
  assert.ok(own.earned.includes('band-7') && own.earned.includes('expert-p2') && own.earned.includes('challenge-frame'))
  assert.ok(!own.earned.includes('expert-p1'))
  const choice = { color: 'bronze', frame: 'p2', title: 'expert-p2', badges: ['band-7', 'weeks', 'recovery'] }
  for (const invalid of [{ color: 'ruby' }, { frame: 'weeks' }, { badges: ['weeks','weeks'] }, { badges: [...choice.badges,'p2'] }])
    await assert.rejects(academicProfile(owner, null, { ...choice, ...invalid }), { status: 400 })
  const list = await boards(other)
  const row = list.exercises.find(p => p.name === account.name)
  assert.notEqual(row.member, owner.id)
  await assert.rejects(academicProfile(other, row.member, plain), { status: 403 })
  await assert.rejects(academicProfile({ ...owner, version: 'caducada' }), { status: 401 })
  await assert.rejects(academicProfile(other, owner.id), { status: 404 })
  await academicProfile(owner, null, choice)
  assert.deepEqual((await academicProfile(await identify(account, true))).equipped, choice)
  const publicCard = await academicProfile(other, row.member)
  assert.deepEqual(publicCard.equipped, choice)
  assert.deepEqual(Object.keys(publicCard).sort(), ['name','photo','rank','equipped','earned'].sort())
  assert.ok(publicCard.earned.includes('challenge-perfect') && !publicCard.earned.includes('expert-p2'))
  assert.equal((await boards(other)).exams[0].color, 'bronze')
  await academicProfile(owner, null, plain)
  assert.ok((await academicProfile(owner)).earned.includes('band-7'))
  await manageStudent({ id: owner.id, operation: 'reset' })
  assert.deepEqual((await academicProfile(await identify(account, true))).earned, [])
  await assert.rejects(academicProfile(other, row.member), { status: 404 })
})
