import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { accountState, ClassroomError } from './league.mjs'
import { mac, same, paperSignature, paperViewSignature } from './session.mjs'

const require = createRequire(import.meta.url)
const load = (path) => JSON.parse(readFileSync(path, 'utf8'))
const fail = (status, message) => {
  throw new ClassroomError(status, message)
}
const uuid = /^[\da-f-]{36}$/
const hash = /^[\da-f]{64}$/
let solutions, catalog
const paperCache = new Map()
function proMaterial(id) {
  catalog ??= load('server-data/pro/catalog.json')
  const entry = catalog.find((p) => p.id === id)
  if (!entry) fail(404, 'Cuadernillo desconocido.')
  if (!paperCache.has(id)) {
    solutions ??= load('server-data/pro-worked.json')
    const questions = load('server-data/pro-es/' + id + '/questions.json')
    paperCache.set(
      id,
      questions.map((q) => ({
        blocks: q.blocks,
        parts: q.blocks
          .filter((b) => b.answer)
          .map((b) => {
            const guide = solutions[id][q.number][b.answer]
            return {
              ...guide,
              steps: [guide.steps],
              label: b.answer,
              key:
                b.answer === 'question'
                  ? String(q.number)
                  : q.number + ':' + b.answer,
            }
          }),
      })),
    )
  }
  return { entry, questions: paperCache.get(id) }
}
export function examFields(values) {
  if (values == null) return {}
  if (
    typeof values !== 'object' ||
    Array.isArray(values) ||
    Object.keys(values).length > 300
  )
    fail(400, 'Respuestas inválidas.')
  const fields = {}
  for (const [k, v] of Object.entries(values)) {
    if (
      !/^(?:\d+-\d+|\d+(?::[a-z]+(?:\.[a-z]+)?)?)$/.test(k) ||
      typeof v !== 'string' ||
      v.length > 16000
    )
      fail(400, 'Respuesta inválida o demasiado extensa.')
    if (v.trim()) fields[k] = v
  }
  return fields
}
export function rememberPractice(student, ticket, body) {
  const reports = (student.examResults ??= {})
  if (!reports[ticket.attempt]) {
    const record = {
      paper: ticket.paper,
      title: 'Prueba tipo IB',
      at: Date.now(),
      packedQuestions: deflateRawSync(
        JSON.stringify(ticket.questions),
      ).toString('base64'),
      answers: examFields(body.answers),
      notes: examFields(body.notes),
    }
    record.pendingReview = ticket.questions.some((q, i) =>
      q.parts.some(
        (p, j) =>
          markPart(
            p,
            record.answers[i + '-' + j] ?? '',
            record.notes[i + '-' + j] ?? '',
          ).pending,
      ),
    )
    reports[ticket.attempt] = record
  }
  return ticket.attempt
}
function markPart(p, answer, notes) {
  const {
    correct,
    acceptsDrill,
    answerNumber,
  } = require('../server-data/league-grading.cjs')
  const max = p.marks ?? p.rubric.length
  const final = answer
    .trim()
    .split(/\n/)
    .at(-1)
    .replace(/^(?:respuesta(?: final)?|resultado)\s*[:=]\s*/i, '')
    .trim()
  const clean = (s) =>
    s
      .normalize('NFC')
      .toLocaleLowerCase('es')
      .replaceAll('−', '-')
      .replace(/\s+/g, ' ')
      .trim()
  const numeric = Number.isFinite(p.value)
  const alternatives = p.accepted ?? []
  const quantity = final.replace(/^[a-zα-ω](?:_[a-z0-9]+)?\s*[=≈]\s*/iu, '')
  const number = answerNumber(quantity, p.percentage, p.unit)
  const inRange = p.range && number !== null && number > p.range.minExclusive
  const matches =
    inRange ||
    (numeric && correct(quantity, p.value, p.percentage, p.unit)) ||
    alternatives.some(
      (v) =>
        clean(v) === clean(final) ||
        acceptsDrill({ respuesta: v, tipo_tarea: '', instruccion: '' }, final),
    )
  // This is a practice score for the final response. Open reasoning and partial credit are reviewed.
  const pending =
    !matches &&
    (!!notes.trim() ||
      (!!answer.trim() &&
        (!numeric || answer.includes('\n') || number === null)))
  return { max, earned: matches ? max : 0, pending: pending ? max : 0 }
}
function questionsFor(record) {
  if (record.proId) return proMaterial(record.proId).questions
  if (record.questions) return record.questions
  return JSON.parse(
    inflateRawSync(Buffer.from(record.packedQuestions, 'base64'), {
      maxOutputLength: 4 * 1024 * 1024,
    }).toString('utf8'),
  )
}
function render(record, questions, identity, ref) {
  const rows = questions.map((q, i) => {
    const parts = q.parts.map((p, j) => {
      const key = p.key ?? i + '-' + j
      const answer = record.answers[key] ?? '',
        notes = record.notes?.[key] ?? ''
      return {
        label: p.label ?? String.fromCharCode(97 + j),
        ask: p.ask,
        answer,
        notes,
        steps: p.steps,
        rubric: p.rubric,
        figure: p.figure,
        ...markPart(p, answer, notes),
      }
    })
    const review = record.reviews?.[i]
    const awarded = record.grade?.scores[i] ?? review?.score
    const legacy =
      record.proId && q.parts.every((p) => p.key !== String(i + 1))
        ? record.answers[i + 1]
        : undefined
    const max = parts.reduce((n, p) => n + p.max, 0)
    const earned = awarded ?? parts.reduce((n, p) => n + p.earned, 0)
    const pending =
      awarded !== undefined
        ? 0
        : legacy || record.legacyNotes
          ? max - earned
          : parts.reduce((n, p) => n + p.pending, 0)
    return {
      stem: q.stem,
      topic: q.topic,
      theme: q.theme,
      figure: q.figure,
      assets: q.assets,
      blocks: q.blocks,
      parts,
      legacy,
      max,
      earned,
      pending,
      review,
      teacherScore: awarded,
    }
  })
  return {
    ref,
    title: record.title,
    paper: record.paper,
    rows,
    at: record.at,
    legacyNotes: record.legacyNotes,
    comment: record.grade?.comment,
    assetURL: record.proId
      ? '/api/pro-paper?id=' +
        record.proId +
        '&signature=' +
        paperViewSignature(identity.id, record.proId) +
        '&asset='
      : undefined,
  }
}
export function resultLinks(s, identity) {
  const personal = [],
    requested = []
  const push = (ref, record, name, kind) => {
    const waiting = Object.values(record.reviews ?? {}).filter(
      (r) => r.reason && !r.resolved,
    ).length
    const item = {
      ref,
      title: record.title,
      paper: record.paper,
      name,
      at: record.at,
      waiting,
    }
    if (identity.admin) {
      if (waiting || (kind === 'personal' && record.pendingReview))
        requested.push(item)
    } else if (kind === 'personal') personal.push(item)
  }
  for (const [student, p] of identity.admin
    ? Object.entries(s.students)
    : [[identity.id, s.students[identity.id]]]) {
    for (const [id, r] of Object.entries(p.examResults ?? {}))
      push({ id, student }, r, p.name, 'personal')
  }
  if (identity.admin)
    for (const a of Object.values(s.assignments ?? {}))
      if (a.kind === 'exam')
        for (const [student, t] of Object.entries(a.attempts))
          if (t.reviews)
            push(
              { id: a.id, student, assigned: true },
              {
                ...t,
                title: a.title,
                paper: a.snapshots?.[t.snapshot]?.paper ?? a.paper,
                at: t.sent ?? t.deadline,
              },
              s.students[student].name,
              'assigned',
            )
  return (identity.admin ? requested : personal).sort((a, b) => b.at - a.at)
}
export function examReport(identity, body) {
  const { action, ref = {} } = body
  if (!['finishPro', 'open', 'appeal', 'resolve'].includes(action))
    fail(400, 'Acción desconocida.')
  if (
    (action === 'resolve' && !identity.admin) ||
    (['finishPro', 'appeal'].includes(action) && identity.admin)
  )
    fail(403, 'Acción no permitida para esta cuenta.')
  return accountState(
    identity,
    (s) => {
      const student = identity.admin ? ref.student : identity.id
      if (!hash.test(student) || !Object.hasOwn(s.students, student))
        fail(404, 'Entrega no encontrada.')
      const profile = s.students[student]
      let id = ref.id,
        record,
        questions,
        stored
      if (action === 'finishPro') {
        if (
          !hash.test(body.proId) ||
          typeof body.signature !== 'string' ||
          !(
            same(body.signature, paperSignature(student, body.proId)) ||
            (body.ticket &&
              same(body.signature, paperViewSignature(student, body.proId)))
          )
        )
          fail(403, 'Cuadernillo no asignado.')
        if (
          !Number.isSafeInteger(body.deadline) ||
          body.deadline <= 0 ||
          body.deadline > Date.now() + 91 * 60000
        )
          fail(400, 'Plazo de intento inválido.')
        if (
          body.ticket !== undefined &&
          (typeof body.ticket !== 'string' ||
            !same(
              body.ticket,
              mac(
                ['pro-attempt', student, body.proId, body.deadline].join(':'),
              ),
            ))
        )
          fail(403, 'Intento de simulacro inválido.')
        id = mac(
          ['pro-result', student, body.proId, body.ticket ?? 'legacy'].join(
            ':',
          ),
        )
        const reports = (profile.examResults ??= {})
        if (!reports[id]) {
          const { entry, questions: qs } = proMaterial(body.proId)
          const answers = examFields(body.answers)
          if (
            body.legacyNotes &&
            (typeof body.legacyNotes !== 'string' ||
              body.legacyNotes.length > 100000)
          )
            fail(400, 'Borrador demasiado largo.')
          reports[id] = {
            proId: entry.id,
            title: 'Simulacro Pro · ' + entry.title,
            paper: entry.paper,
            at: Date.now(),
            answers,
            legacyNotes: body.legacyNotes,
            pendingReview: !!body.legacyNotes || !!Object.keys(answers).length,
          }
          questions = qs
        }
      } else if (!uuid.test(id) && !hash.test(id))
        fail(400, 'Entrega inválida.')
      if (ref.assigned && action !== 'finishPro') {
        const a = s.assignments?.[id]
        stored = a?.attempts?.[student]
        if (a?.kind !== 'exam' || !stored) fail(404, 'Entrega no encontrada.')
        if (!stored.sent && Date.now() < stored.deadline)
          fail(409, 'Entrega primero la prueba.')
        const snap = a.snapshots?.[stored.snapshot] ?? a
        questions = snap.questions
        record = {
          ...stored,
          at: stored.sent ?? stored.deadline,
          title: a.title,
          paper: snap.paper,
        }
      } else {
        stored = profile.examResults?.[id]
        if (!stored) fail(404, 'Entrega no encontrada.')
        record = stored
        questions ??= questionsFor(record)
      }
      const index = body.index
      if (['appeal', 'resolve'].includes(action)) {
        if (!Number.isInteger(index) || !questions[index])
          fail(400, 'Pregunta no válida.')
        const reviews = (stored.reviews ??= {})
        record.reviews = reviews
        const previous = reviews[index] ?? {}
        if (action === 'appeal') {
          const reason = body.reason
          if (
            typeof reason !== 'string' ||
            !reason.trim() ||
            reason.length > 2000
          )
            fail(400, 'Explica qué debería revisar el profesor.')
          if (!previous.reason || previous.resolved)
            reviews[index] = {
              ...previous,
              reason: reason.trim(),
              requested: Date.now(),
              resolved: false,
            }
        } else {
          const max = questions[index].parts.reduce(
            (n, p) => n + (p.marks ?? p.rubric.length),
            0,
          )
          if (
            !Number.isInteger(body.score) ||
            body.score < 0 ||
            body.score > max ||
            typeof body.feedback !== 'string' ||
            !body.feedback.trim() ||
            body.feedback.length > 2000
          )
            fail(400, 'Revisa los puntos y escribe el motivo de tu decisión.')
          reviews[index] = {
            ...previous,
            score: body.score,
            feedback: body.feedback.trim(),
            resolved: Date.now(),
          }
          if (stored.grade) {
            stored.grade.scores[index] = body.score
            stored.grade.points = stored.grade.scores.reduce((n, v) => n + v, 0)
          }
        }
      }
      const report = render(record, questions, identity, {
        id,
        student,
        assigned: !!ref.assigned && action !== 'finishPro',
      })
      if (action !== 'open') {
        const pending = report.rows.some((q) => q.pending > 0)
        if (!ref.assigned) stored.pendingReview = pending
        else if (action === 'resolve' && !pending && !stored.grade) {
          const scores = report.rows.map((q) => q.earned)
          stored.grade = {
            scores,
            points: scores.reduce((n, v) => n + v, 0),
            at: Date.now(),
            comment: '',
          }
        }
      }
      return report
    },
    action !== 'open',
  )
}
