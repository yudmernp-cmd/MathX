import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { bank } from '../server/bank.mjs'
import { assignments } from '../server/assignments.mjs'
import {
  enroll,
  identify,
  boards,
  submit,
  drillTicket,
} from '../server/league.mjs'
import { drills } from '../server/drills/index.mjs'

process.env.MATHX_LEAGUE_DB = ':memory:'
process.env.MATHX_SESSION_SECRET = randomBytes(32).toString('hex')
delete process.env.BLOB_READ_WRITE_TOKEN
delete process.env.VERCEL
const teacher = (action, body) => assignments('admin', action, body)
const day = (ms = Date.now()) =>
  new Date(ms - 5 * 3600000).toISOString().slice(0, 10)
async function student(name) {
  const p = await enroll({ name })
  return identify(p)
}

test('reto privado con borrador, avisos, corrección manual y cambios de nota', async () => {
  const user = await student('Alumna del reto'),
    other = await student('Otro alumno')
  const spec = {
    kind: 'challenge',
    title: 'Área de un círculo',
    date: day(),
    stem: 'Calcula el área para radio 2.',
    solution: 'Cuatro pi.',
  }
  const { id: task } = await teacher('publish', spec)
  await assert.rejects(teacher('publish', spec), { status: 409 })
  await assert.rejects(assignments(user, 'publish', spec), { status: 403 })
  await assert.rejects(
    assignments(user, 'source', { sourceId: 'cualquiera' }),
    { status: 403 },
  )
  const attempt = await assignments(user, 'beginTask', { task })
  assert.equal(attempt.reveal, false)
  assert.ok(!JSON.stringify(attempt).includes(spec.solution))
  assert.equal(attempt.questions[0].parts[0].marks, 20)
  assert.equal(
    (await assignments(user, 'beginTask', { task })).deadline,
    attempt.deadline,
  )
  for (let i = 0; i < 2; i++)
    await assignments(user, 'signal', {
      task,
      event: 'Pestaña oculta',
      eventId: 'uno',
    })
  assert.equal(
    (await teacher('learning')).alerts.filter(
      (e) => e.kind === 'Pestaña oculta',
    ).length,
    1,
  )
  assert.equal((await assignments(other, 'learning')).alerts, undefined)
  const data = {
    task,
    answers: { '0-0': '4π' },
    notes: { '0-0': 'πr²' },
    revision: 0,
  }
  await assignments(user, 'saveTask', data)
  await assert.rejects(assignments(user, 'saveTask', data), { status: 409 })
  await assert.rejects(teacher('grade', { task, student: user, scores: [19] }))
  await assert.rejects(teacher('inspect', { task, student: '__proto__' }), {
    status: 404,
  })
  await assert.rejects(assignments(other, 'myTask', { task, student: user }), {
    status: 404,
  })
  assert.deepEqual(
    (await assignments(user, 'myTask', { task })).notes,
    data.notes,
  )
  await assignments(user, 'sendTask', { ...data, revision: 1 })
  await assignments(user, 'sendTask', { ...data, answers: {}, revision: 2 })
  assert.deepEqual(
    (await teacher('inspect', { task, student: user })).answers,
    data.answers,
  )
  assert.equal(
    (
      await assignments(user, 'signal', {
        task,
        event: 'Salida de la página',
        eventId: 'dos',
      })
    ).active,
    false,
  )
  assert.equal((await teacher('learning')).reviews[0].grade, null)
  await assert.rejects(
    assignments(user, 'grade', { task, student: user, scores: [20] }),
    { status: 403 },
  )
  await assert.rejects(teacher('grade', { task, student: user, scores: [21] }))
  const drill = drills('Funciones', 3, 44)[0],
    proof = { drill, signature: drillTicket(user, drill) }
  for (const answer of ['', drill.respuesta, drill.respuesta])
    await submit(user, { ...proof, answer })
  const profile = (await assignments(user, 'learning')).profile
  assert.deepEqual(Object.values(profile.stats)[0], {
    tried: 1,
    first: 0,
    solved: 1,
  })
  assert.deepEqual(Object.values(Object.values(profile.weeks)[0])[0], {
    tried: 1,
    first: 0,
  })
  for (const score of [15, 15, 17, 12]) {
    await teacher('grade', {
      task,
      student: user,
      scores: [score],
      comment: 'Revisado',
    })
    assert.equal(
      (await boards()).exercises.find((x) => x.name === 'Alumna del reto')
        .points,
      1 + score,
    )
  }
  assert.equal((await assignments(user, 'myTask', { task })).reveal, false)
  await teacher('manage', { task, close: true })
  assert.equal(
    (await assignments(user, 'myTask', { task })).questions[0].parts[0]
      .steps[0],
    spec.solution,
  )
  await assert.rejects(assignments(other, 'beginTask', { task }), {
    status: 409,
  })
})

test('selección P1/P2, examen común de 80 puntos, expiración y top con notas manuales', async (t) => {
  const sources = await teacher('sources')
  if (!sources.length) {
    t.skip('Edición privada ausente')
    return
  }
  for (const paper of [1, 2]) {
    const source = sources.find((s) => s.paper === paper)
    assert.ok(source)
    const q = await teacher('source', { sourceId: source.id })
    assert.ok(q.parts.length)
    const future = await teacher('publish', {
      kind: 'challenge',
      title: 'Selección P' + paper,
      date: day(Date.now() + paper * 86400000),
      sourceId: source.id,
    })
    const a = await student('Revisión P' + paper),
      b = await student('Segunda P' + paper)
    await assert.rejects(assignments(a, 'beginTask', { task: future.id }), {
      status: 409,
    })
    const { id: task } = await teacher('publish', {
      kind: 'exam',
      paper,
      title: 'Prueba ' + paper,
      minutes: 90,
      opens: Date.now() - 1000,
      closes: Date.now() + 3 * 3600000,
      showTop: true,
    })
    const start = Date.now(),
      aa = await assignments(a, 'beginTask', { task }),
      bb = await assignments(b, 'beginTask', { task })
    assert.deepEqual(aa.questions, bb.questions)
    assert.ok(
      aa.deadline >= start + 90 * 60000 &&
        aa.deadline <= Date.now() + 90 * 60000,
    )
    const maxima = aa.questions.map((q) =>
      q.parts.reduce((sum, p) => sum + p.marks, 0),
    )
    assert.equal(
      maxima.reduce((a, b) => a + b),
      80,
    )
    assert.ok(
      aa.questions.every((q) =>
        q.parts.every(
          (p) => p.value === null && !p.steps.length && !p.rubric.length,
        ),
      ),
    )
    await assignments(a, 'sendTask', {
      task,
      revision: 0,
      answers: { '0-0': '2' },
    })
    assert.deepEqual((await boards()).exams, [])
    await teacher('grade', {
      task,
      student: a,
      scores: maxima,
      comment: 'Revisado',
    })
    assert.deepEqual((await boards()).exams, [
      { name: 'Revisión P' + paper, points: 80 },
    ])
    assert.equal(
      (await boards()).exercises.find((x) => x.name === 'Revisión P' + paper)
        .points,
      0,
    )
    await assignments(b, 'saveTask', {
      task,
      revision: 0,
      answers: { '0-0': 'borrador' },
    })
    await teacher('manage', { task, close: true })
    assert.equal((await assignments(b, 'taskStatus', { task })).active, false)
    await assignments(b, 'sendTask', {
      task,
      revision: 1,
      answers: { '0-0': 'fuera de plazo' },
    })
    assert.equal(
      (await teacher('inspect', { task, student: b })).answers['0-0'],
      'borrador',
    )
    await teacher('manage', { task, showTop: false })
    assert.equal((await boards()).exams, null)
  }
})
test('un corte de red y el vencimiento del plazo se reconocen aunque el alumno cierre la página', async (t) => {
  const start = Date.parse('2030-06-09T14:00:00-05:00')
  t.mock.timers.enable({ apis: ['Date'], now: start })
  const user = await student('Entrega automática')
  const { id: task } = await teacher('publish', {
    kind: 'challenge',
    date: day(),
    title: 'Entrega al cierre',
    stem: 'Halla la derivada de x al cubo.',
  })
  const a = await assignments(user, 'beginTask', { task })
  await assignments(user, 'saveTask', {
    task,
    revision: 0,
    answers: { '0-0': '3x²' },
  })
  t.mock.timers.tick(90001)
  assert.ok(
    (await teacher('learning')).alerts.some(
      (e) =>
        e.kind.startsWith('Reto sin conexión') &&
        e.name === 'Entrega automática',
    ),
  )
  await assignments(user, 'signal', { task, event: '', eventId: 'latido' })
  assert.ok(
    (await teacher('learning')).alerts.some(
      (e) =>
        e.kind.startsWith('Señal restablecida') &&
        e.name === 'Entrega automática',
    ),
  )
  t.mock.timers.setTime(a.deadline + 1)
  assert.equal((await assignments(user, 'myTask', { task })).submitted, true)
  assert.deepEqual(
    (await teacher('inspect', { task, student: user })).answers,
    { '0-0': '3x²' },
  )
  assert.equal(
    (await teacher('grade', { task, student: user, scores: [20] })).points,
    20,
  )
})

test('editar y eliminar actividades conserva la versión de cada entrega y ajusta los puntos', async t => {
  const { state } = await import('../server/league.mjs')
  const user = await student('Participante anterior'), later = await student('Participante posterior')
  const spec = {kind:'challenge', title:'Edición de reto', date:day(Date.now()+7*86400000), stem:'Modelo A', solution:'Solución A'}
  const {id:task} = await teacher('publish', spec)
  // Simulate an existing attempt on a legacy assignment whose dates were later rescheduled.
  await state(s => { s.assignments[task].attempts[user] = {
    started:Date.now(), last:Date.now(), deadline:Date.now()+60000, revision:0, answers:{}, notes:{}, events:[]
  } }, true)
  const def = await teacher('definition', {task})
  for (const action of ['definition','edit','delete'])
    await assert.rejects(assignments(user, action, {...spec, task, editVersion:def.editVersion}), {status:403})
  const edit = { ...spec, task, editVersion:def.editVersion, stem:'Modelo B', solution:'Solución B' }
  await teacher('edit', edit)
  await assert.rejects(teacher('edit', edit), {status:409})
  assert.equal((await teacher('definition',{task})).question.stem,'Modelo B')
  assert.equal((await assignments(user,'beginTask',{task})).questions[0].stem,'Modelo A')
  await assignments(user,'sendTask',{task, revision:0, answers:{'0-0':'A'}, notes:{}})
  await teacher('grade',{task,student:user,scores:[9]})
  assert.equal((await teacher('inspect',{task,student:user})).questions[0].parts[0].steps[0], 'Solución A')
  assert.equal((await assignments(user,'learning')).profile.points,9)
  await assert.rejects(assignments(later,'beginTask',{task}), {status:409})
  await assert.rejects(teacher('delete',{task,editVersion:def.editVersion}), {status:409})
  await teacher('delete',{task,editVersion:(await teacher('definition',{task})).editVersion})
  assert.equal((await assignments(user,'learning')).profile.points,0)
  assert.ok(!(await teacher('learning')).reviews.some(r=>r.task===task))
  await assert.rejects(assignments(user,'myTask',{task}), {status:404})

  const now = Date.now()
  const exam = 'convocatoria-anterior'
  await state(s => { s.assignments[exam] = { id:exam, kind:'exam', title:'Simulacro', opens:now-5000,
    closes:now+3600000, paper:1, minutes:30, attempts:{}, questions:[def.question] } }, true)
  const original = await assignments(user,'beginTask',{task:exam})
  await teacher('edit',{task:exam,editVersion:0,kind:'exam',title:'Nueva convocatoria',opens:now-5000,
    closes:now+7200000, paper:1, minutes:60, showTop:true})
  const retained = await assignments(user,'myTask',{task:exam})
  assert.equal(retained.deadline, original.deadline)
  assert.equal(retained.minutes,30)
  assert.equal((await assignments(later,'beginTask',{task:exam})).minutes,60)
  const generator = t.mock.method(bank(), 'questions', () => [
    { ...def.question, stem:'Versión nueva' }, { ...def.question, stem:'Segundo ejercicio' }
  ])
  const changed = {task:exam, editVersion:1, kind:'exam', title:'Prueba 2', opens:now-5000,
    closes:now+7200000, paper:2, minutes:60}
  await teacher('edit', changed)
  assert.equal(generator.mock.calls[0].arguments[0].paper, 2)
  const newcomer = await student('Nueva participante de P2')
  const newPaper = await assignments(newcomer,'beginTask',{task:exam})
  assert.equal(newPaper.paper,2)
  assert.equal(newPaper.questions.length,2)
  assert.equal((await assignments(user,'myTask',{task:exam})).paper, 1)
  await assignments(user,'sendTask',{task:exam,revision:0,answers:{},notes:{}})
  await teacher('grade',{task:exam,student:user,scores:[10]})
  await teacher('edit', {...changed, editVersion:2, replaceQuestions:true})
  assert.equal(generator.mock.callCount(),2)
  await teacher('delete',{task:exam,editVersion:3})
  assert.ok(!(await teacher('learning')).tasks.some(t=>t.id===exam))
})
