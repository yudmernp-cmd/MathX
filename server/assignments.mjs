import { randomInt, randomUUID } from 'node:crypto'
import { state, ClassroomError, examPrompts } from './league.mjs'
import { bank } from './bank.mjs'
const fail = (message, status = 400) => {
  throw new ClassroomError(status, message)
}
const text = (v, max) =>
  typeof v === 'string' && v.length <= max
    ? v.trim()
    : fail('Texto inválido o demasiado largo.')
const marks = (q) =>
  q.parts.reduce((n, p) => n + (p.marks ?? p.rubric.length), 0)
const today = (t) => new Date(t - 5 * 3600000).toISOString().slice(0, 10)
const events = new Set([
  'Pestaña oculta',
  'Pestaña visible',
  'Salida de pantalla completa',
  'Pantalla completa',
  'Pantalla completa no disponible',
  'Salida de la página',
  'Regreso al reto',
])
function summary(a) {
  const { id, kind, title, opens, closes, minutes, paper, showTop } = a
  return { id, kind, title, opens, closes, minutes, paper, showTop }
}
function finished(t, now) {
  return !!t && (!!t.sent || now >= t.deadline)
}
function recordContact(t, now, monitor) {
  if (monitor && now - t.last > 90000) {
    t.events.push({
      id: randomUUID(),
      kind: 'Señal restablecida tras una interrupción',
      at: now,
    })
    t.events = t.events.slice(-500)
  }
  t.last = now
}
function fields(values, questions) {
  const result = {}
  if (!values || typeof values !== 'object') return result
  questions.forEach((q, i) =>
    q.parts.forEach((_, j) => {
      const k = i + '-' + j
      if (values[k] !== undefined) result[k] = text(values[k], 6000)
    }),
  )
  return result
}
export async function assignments(id, action, b = {}) {
  const admin = id === 'admin',
    now = Date.now()
  const teacher = ['sources', 'source', 'publish', 'grade', 'manage', 'inspect']
  if (teacher.includes(action) && !admin)
    fail('Acceso exclusivo del profesor.', 403)
  if (
    ['beginTask', 'saveTask', 'sendTask', 'signal', 'taskStatus'].includes(
      action,
    ) &&
    admin
  )
    fail('Acceso exclusivo del estudiante.', 403)
  if (action === 'sources') return bank().sourceList()
  if (action === 'source') {
    const q = bank().source(b.sourceId)
    if (!q) fail('Pregunta no disponible.', 404)
    return q
  }
  if (action === 'publish') {
    const kind = b.kind,
      title = text(b.title, 100)
    if (!title || !['exam', 'challenge'].includes(kind))
      fail('Indica el título y la modalidad.')
    let opens, closes, questions
    const paper = Number(b.paper),
      minutes = Number(b.minutes)
    if (kind === 'challenge') {
      if (!/^\d{4}-\d\d-\d\d$/.test(b.date)) fail('Fecha inválida.')
      opens = Date.parse(b.date + 'T00:00:00-05:00')
      closes = opens + 86400000
      if (!Number.isFinite(opens) || today(opens) !== b.date)
        fail('Fecha inválida.')
      if (b.sourceId) {
        const q = bank().source(b.sourceId)
        if (!q) fail('Pregunta no disponible.')
        questions = [q]
      } else {
        const stem = text(b.stem, 6000),
          solution = text(b.solution ?? '', 6000)
        if (!stem) fail('Escribe el enunciado.')
        questions = [
          {
            topic: title,
            stem,
            parts: [
              {
                ask: 'Respuesta y procedimiento',
                value: null,
                steps: solution ? [solution] : [],
                rubric: [],
                marks: 20,
              },
            ],
          },
        ]
      }
    } else {
      opens = Number(b.opens)
      closes = Number(b.closes)
      if (
        !Number.isSafeInteger(opens) ||
        !Number.isSafeInteger(closes) ||
        opens >= closes ||
        ![1, 2].includes(paper) ||
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 240
      )
        fail('Revisa las fechas, la prueba y la duración.')
      questions = bank().questions(
        { course: 'MAI', paper, difficulty: 'Medio' },
        true,
        [],
        randomInt(2 ** 32),
      )
    }
    if (closes <= now) fail('El plazo debe terminar en el futuro.')
    const a = {
      id: randomUUID(),
      kind,
      title,
      opens,
      closes,
      questions,
      attempts: {},
      ...(kind === 'exam' && { paper, minutes, showTop: b.showTop === true }),
    }
    return state((s) => {
      const all = (s.assignments ??= {})
      if (
        kind === 'challenge' &&
        Object.values(all).some(
          (x) => x.kind === kind && today(x.opens) === b.date,
        )
      )
        fail('Ya existe un reto para ese día.', 409)
      if (a.showTop)
        Object.values(all).forEach((x) => {
          if (x.kind === 'exam') x.showTop = false
        })
      all[a.id] = a
      return summary(a)
    }, true)
  }
  return state((s) => {
    const all = Object.values(s.assignments ?? {})
    if (action === 'learning') {
      const list = all
        .filter(
          (a) =>
            admin || (a.opens <= now && (a.closes > now || a.attempts[id])),
        )
        .sort((a, b) => b.opens - a.opens)
      const rows = list.map((a) => {
        const t = a.attempts[id]
        return {
          ...summary(a),
          started: !!t,
          submitted: finished(t, now),
          grade: t?.grade ?? null,
        }
      })
      const profile = (p) => ({
        name: p.name,
        points: p.points,
        activity: p.activity,
        stats: p.stats ?? {},
        weeks: p.weeks ?? {},
      })
      if (!admin) return { tasks: rows, profile: profile(s.students[id]) }
      const reviews = [],
        alerts = []
      for (const a of all)
        for (const [student, t] of Object.entries(a.attempts)) {
          const name = s.students[student].name
          if (finished(t, now))
            reviews.push({
              task: a.id,
              student,
              name,
              title: a.title,
              grade: t.grade ?? null,
              time: t.sent ?? t.deadline,
            })
          if (a.kind === 'challenge') {
            for (const e of t.events ?? [])
              alerts.push({ name, title: a.title, ...e })
            if (Math.min(now, t.sent ?? t.deadline) - t.last > 90000)
              alerts.push({
                name,
                title: a.title,
                at: t.last,
                kind: 'Reto sin conexión confirmada · última señal',
              })
          }
        }
      return {
        tasks: rows,
        legacyRound: !!s.round,
        reviews: reviews.sort((a, b) => b.time - a.time),
        alerts: alerts.sort((a, b) => b.at - a.at).slice(0, 100),
        students: Object.values(s.students).map(profile),
      }
    }
    const a = s.assignments?.[b.task]
    if (!a || !Object.hasOwn(a, 'attempts'))
      fail('Actividad no encontrada.', 404)
    if (action === 'manage') {
      if (b.close === true) {
        a.closes = Math.min(a.closes, now)
        for (const t of Object.values(a.attempts))
          t.deadline = Math.min(t.deadline, now)
      }
      if (typeof b.showTop === 'boolean' && a.kind === 'exam') {
        if (b.showTop)
          all.forEach((x) => {
            if (x.kind === 'exam') x.showTop = false
          })
        a.showTop = b.showTop
      }
      return summary(a)
    }
    const student = admin ? b.student : id
    let t = Object.hasOwn(a.attempts, student) ? a.attempts[student] : undefined
    if (action === 'beginTask') {
      if (now < a.opens || now >= a.closes)
        fail('La actividad está fuera de plazo.', 409)
      if (!t) {
        t = a.attempts[id] = {
          started: now,
          last: now,
          deadline:
            a.kind === 'exam'
              ? Math.min(a.closes, now + a.minutes * 60000)
              : a.closes,
          answers: {},
          notes: {},
          events: [],
          revision: 0,
        }
      }
      s.students[id].activity = now
    }
    if (!t) fail('Intento no encontrado.', 404)
    const done = finished(t, now)
    if (action === 'grade') {
      if (!done) fail('La entrega sigue en curso.')
      const max = a.kind === 'challenge' ? [20] : a.questions.map(marks)
      if (
        !Array.isArray(b.scores) ||
        b.scores.length !== max.length ||
        b.scores.some((n, i) => !Number.isInteger(n) || n < 0 || n > max[i])
      )
        fail('Puntuación fuera del baremo.')
      const points = b.scores.reduce((v, n) => v + n, 0),
        comment = text(b.comment ?? '', 2000)
      if (a.kind === 'challenge')
        s.students[student].points += points - (t.grade?.points ?? 0)
      t.grade = { points, scores: b.scores, comment, at: now }
      return t.grade
    }
    if (action === 'taskStatus') return { active: !done }
    if (action === 'signal') {
      if (done || a.kind !== 'challenge') return { active: false }
      recordContact(t, now, true)
      if (
        events.has(b.event) &&
        typeof b.eventId === 'string' &&
        b.eventId.length <= 64 &&
        !t.events.some((e) => e.id === b.eventId)
      ) {
        t.events.push({ id: b.eventId, kind: b.event, at: now })
      }
      t.events = t.events.slice(-500)
      return { active: true }
    }
    if (action === 'saveTask' || action === 'sendTask') {
      if (done) return { submitted: true, revision: t.revision }
      if (b.revision !== t.revision)
        fail(
          'El intento cambió en otra pestaña. Vuelve a abrirlo para continuar.',
          409,
        )
      t.answers = fields(b.answers, a.questions)
      t.notes = fields(b.notes, a.questions)
      t.revision++
      recordContact(t, now, a.kind === 'challenge')
      s.students[id].activity = now
      if (action === 'sendTask') t.sent = now
      return { submitted: !!t.sent, revision: t.revision }
    }
    if (!['beginTask', 'inspect', 'myTask'].includes(action))
      fail('Acción inválida.')
    const reveal = admin || now >= a.closes
    return {
      ...summary(a),
      deadline: t.deadline,
      submitted: done,
      answers: t.answers,
      notes: t.notes,
      revision: t.revision,
      grade: t.grade ?? null,
      questions: reveal ? a.questions : examPrompts(a.questions),
      reveal,
    }
  }, !['learning', 'inspect', 'myTask', 'taskStatus'].includes(action))
}
