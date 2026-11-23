import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  timingSafeEqual,
  randomInt,
  randomUUID,
} from 'node:crypto'
import { get, put, BlobPreconditionFailedError } from '@vercel/blob'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const initial = () => ({ students: {}, round: null })
let db
const sign = (domain, value) =>
  createHmac('sha256', process.env.MATHX_SESSION_SECRET)
    .update(JSON.stringify([domain, value]))
    .digest('hex')
export const matches = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  timingSafeEqual(
    Buffer.from(sign('compare', a)),
    Buffer.from(sign('compare', b)),
  )
export class ClassroomError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
const fail = (status, message) => {
  throw new ClassroomError(status, message)
}
// Mutations are synchronous so retries recalculate from the winning revision.
export async function state(fn, write = false) {
  if (!process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    if (!process.env.MATHX_LEAGUE_DB)
      mkdirSync('.private', { recursive: true, mode: 0o700 })
    db ??= new DatabaseSync(
      process.env.MATHX_LEAGUE_DB || '.private/classroom.sqlite',
    )
    db.exec(
      'CREATE TABLE IF NOT EXISTS classroom(id INTEGER PRIMARY KEY, data TEXT); BEGIN IMMEDIATE',
    )
    try {
      const row = db.prepare('SELECT data FROM classroom WHERE id=1').get()
      const s = row ? JSON.parse(row.data) : initial(),
        result = fn(s)
      if (write)
        db.prepare('INSERT OR REPLACE INTO classroom VALUES(1,?)').run(
          JSON.stringify(s),
        )
      db.exec('COMMIT')
      return result
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
  const path = 'classroom/v1.json'
  for (let i = 0; i < 12; i++) {
    const current = await get(path, { access: 'private', useCache: false })
    const s = current ? await new Response(current.stream).json() : initial(),
      before = JSON.stringify(s),
      result = fn(s)
    if (!write || before === JSON.stringify(s)) return result
    try {
      await put(path, JSON.stringify(s), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: !!current,
        ifMatch: current?.blob.etag,
        contentType: 'application/json',
      })
      return result
    } catch (e) {
      if (
        !(e instanceof BlobPreconditionFailedError) &&
        !(!current && /already exists/i.test(e.message))
      )
        throw e
    }
    await new Promise((r) => setTimeout(r, randomInt(25, 120) * (i + 1)))
  }
  fail(503, 'El aula está ocupada. Vuelve a intentarlo.')
}
const nameKey = (name) =>
  name.trim().normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('es')
export async function enroll({ name, dni }) {
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > 80 ||
    typeof dni !== 'string' ||
    !/^\d{8}$/.test(dni)
  )
    fail(400, 'Introduce un nombre y un DNI de ocho dígitos.')
  const id = sign('dni', dni)
  return state((s) => {
    if (s.students[id]) fail(409, 'Este DNI ya está inscrito.')
    const assigned = new Set(Object.values(s.students).map((p) => p.codeTag))
    let code, codeTag
    do {
      code = String(randomInt(1000000)).padStart(6, '0')
      codeTag = sign('assigned-code', code)
    } while (assigned.has(codeTag))
    s.students[id] = {
      name: name.trim(),
      codeTag,
      pin: sign('pin', [id, code]),
      seen: {},
      points: 0,
      failures: 0,
      until: 0,
    }
    return { name: name.trim(), code }
  }, true)
}
export async function identify({ admin, password, dni, name, code }) {
  if (admin === true) {
    if (
      !process.env.MATHX_ADMIN_PASSWORD ||
      !matches(password, process.env.MATHX_ADMIN_PASSWORD)
    )
      fail(401, 'Credenciales incorrectas.')
    return 'admin'
  }
  if (
    typeof name !== 'string' ||
    name.length > 80 ||
    typeof dni !== 'string' ||
    !/^\d{8}$/.test(dni) ||
    typeof code !== 'string' ||
    !/^\d{6}$/.test(code)
  )
    fail(401, 'Credenciales incorrectas.')
  const id = sign('dni', dni)
  const ok = await state((s) => {
    const p = s.students[id]
    if (!p || p.until > Date.now()) return false
    if (
      !matches(p.pin, sign('pin', [id, code])) ||
      nameKey(name) !== nameKey(p.name)
    ) {
      if (++p.failures >= 5) {
        p.until = Date.now() + 600000
        p.failures = 0
      }
      return false
    }
    p.failures = 0
    p.until = 0
    return true
  }, true)
  if (!ok)
    fail(401, 'Credenciales incorrectas o acceso temporalmente bloqueado.')
  return id
}
export function boards() {
  return state((s) => {
    const list = (entries) =>
      entries.sort(
        (a, b) => b.points - a.points || a.name.localeCompare(b.name, 'es'),
      )
    const exam = Object.values(s.assignments ?? {}).find(
      (a) => a.kind === 'exam' && a.showTop && Date.now() >= a.opens,
    )
    return {
      ...(exam ? { examTitle: exam.title } : s.round ? { legacy: true } : {}),
      exercises: list(
        Object.values(s.students).map(({ name, points }) => ({ name, points })),
      ),
      exams: exam
        ? list(
            Object.entries(exam.attempts)
              .filter(([, t]) => t.grade)
              .map(([id, t]) => ({
                name: s.students[id].name,
                points: t.grade.points,
              })),
          )
        : s.round
          ? list(
              Object.entries(s.round.best).map(([id, points]) => ({
                name: s.students[id].name,
                points,
              })),
            )
          : null,
    }
  })
}
export const toggle = (active) =>
  state((s) => {
    if (typeof active !== 'boolean') fail(400, 'Estado inválido.')
    if (active && !s.round)
      s.round = { id: randomUUID(), best: {}, submitted: {} }
    if (!active) s.round = null
    return { active: !!s.round }
  }, true)
export function drillTicket(id, q) {
  return sign('drill', [id, q])
}
export async function examTicket(id, questions, deadline) {
  const round = await state((s) => s.round?.id)
  if (!round || id === 'admin') return null
  const iv = randomBytes(12)
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(sign('exam-key', id), 'hex'),
    iv,
  )
  const content = JSON.stringify({
    round,
    attempt: randomUUID(),
    deadline,
    questions,
  })
  return Buffer.concat([
    iv,
    cipher.update(content, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64url')
}
function openExam(id, proof) {
  try {
    const data = Buffer.from(proof, 'base64url')
    const cipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(sign('exam-key', id), 'hex'),
      data.subarray(0, 12),
    )
    cipher.setAuthTag(data.subarray(-16))
    return JSON.parse(
      Buffer.concat([
        cipher.update(data.subarray(12, -16)),
        cipher.final(),
      ]).toString('utf8'),
    )
  } catch {
    fail(400, 'Simulacro inválido.')
  }
}
export function examPrompts(questions) {
  return questions.map((q) => ({
    ...q,
    parts: q.parts.map((p) => ({
      ...p,
      numeric: p.value !== null,
      value: null,
      steps: [],
      rubric: [],
      marks: p.marks ?? p.rubric.length,
    })),
  }))
}
export async function submit(id, body) {
  if (id === 'admin') fail(403, 'Acción exclusiva de estudiantes.')
  const { acceptsDrill, correct } = require('../server-data/league-grading.cjs')
  if (body.drill) {
    const { drill, signature, answer } = body
    if (
      !matches(signature, drillTicket(id, drill)) ||
      typeof answer !== 'string'
    )
      fail(400, 'Ejercicio inválido.')
    const right = acceptsDrill(drill, answer)
    const key = sign('exercise', [drill.instruccion, drill.expresion])
    return state((s) => {
      const p = s.students[id]
      p.activity = Date.now()
      p.tried ??= {}
      p.stats ??= {}
      const group = drill.tema + ' · ' + drill.dificultad
      const stat = (p.stats[group] ??= { tried: 0, first: 0, solved: 0 })
      if (!p.tried[key]) {
        p.tried[key] = 1
        stat.tried++
        const monday = new Date(p.activity - 5 * 3600000)
        monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
        const week = monday.toISOString().slice(0, 10)
        p.weeks ??= {}
        const levels = (p.weeks[week] ??= {})
        const w = (levels[drill.dificultad] ??= { tried: 0, first: 0 })
        w.tried++
        if (right) w.first++
        if (right) stat.first++
      }
      if (right && p.tried[key] === 1) {
        stat.solved++
        p.tried[key] = 2
      }
      if (right && !p.seen[key]) {
        p.seen[key] = 1
        p.points++
      }
      return { correct: right }
    }, true)
  }
  if (!body.ticket || !body.answers || typeof body.answers !== 'object')
    fail(400, 'Entrega inválida.')
  const ticket = openExam(id, body.ticket)
  const counted = await state((s) => {
    const r = s.round
    if (!r || r.id !== ticket.round) return false
    if (Object.hasOwn(r.submitted, ticket.attempt)) return true
    if (Date.now() > ticket.deadline + 60000) return false
    let points = 0
    ticket.questions.forEach((q, i) =>
      q.parts.forEach((p, j) => {
        const answer = body.answers[i + '-' + j]
        if (
          q.scheme !== 'sin esquema' &&
          p.value !== null &&
          typeof answer === 'string' &&
          correct(answer, p.value, p.percentage, p.unit)
        )
          points++
      }),
    )
    r.best[id] = Math.max(r.best[id] ?? 0, points)
    r.submitted[ticket.attempt] = points
    return true
  }, true)
  return { counted, questions: ticket.questions }
}
