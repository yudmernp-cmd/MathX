import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  timingSafeEqual,
  randomInt,
  randomUUID,
} from 'node:crypto'
import {
  get, head, put, BlobNotFoundError, BlobPreconditionFailedError,
} from '@vercel/blob'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { setTimeout as delay } from 'node:timers/promises'
const require = createRequire(import.meta.url)
const initial = () => ({ students: {}, round: null })
let db
let blobWrites = Promise.resolve()
const blobAttempts = 6
const blobTimeout = 8000
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
  const controller = new AbortController()
  const { signal } = controller
  let timer
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new ClassroomError(
        503,
        'El almacenamiento del aula tardó demasiado en responder. Vuelve a intentarlo.',
      ))
      controller.abort()
    }, blobTimeout)
  })
  const run = () => blobState(fn, write, signal)
  // The queue prevents races in this instance. The ETag guards other instances.
  const work = write ? blobWrites.then(run) : run()
  if (write) blobWrites = work.catch(() => {})
  try {
    return await Promise.race([work, deadline])
  } finally {
    clearTimeout(timer)
  }
}
async function blobState(fn, write, signal) {
  const path = 'classroom/v1.json'
  for (let i = 0; i < blobAttempts; i++) {
    if (i > 0)
      await delay(randomInt(30, 100) * i, undefined, { signal })
    signal.throwIfAborted()
    // Capture the storage revision BEFORE reading the body. If another instance
    // writes between these calls, put must reject the old revision.
    let metadata
    if (write) {
      try {
        metadata = await head(path, { abortSignal: signal })
      } catch (error) {
        if (!(error instanceof BlobNotFoundError)) throw error
      }
    }
    const current = await get(path, {
      access: 'private',
      useCache: false,
      abortSignal: signal,
    })
    if (write && !!metadata !== !!current) {
      await current?.stream.cancel()
      continue
    }
    const s = current ? await new Response(current.stream).json() : initial()
    if (!write) return fn(s)
    const before = JSON.stringify(s)
    const result = fn(s)
    const after = JSON.stringify(s)
    if (before === after) return result
    if (metadata && !metadata.etag) throw new Error('Falta la revisión del aula')
    signal.throwIfAborted()
    try {
      await put(path, after, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: !!current,
        ifMatch: metadata?.etag,
        contentType: 'application/json',
        abortSignal: signal,
      })
      return result
    } catch (e) {
      if (
        !(e instanceof BlobPreconditionFailedError) &&
        !(!current && /already exists/i.test(e.message))
      )
        throw e
    }
  }
  console.warn('MathX: se agotaron los intentos de escritura condicional en Blob')
  fail(503, 'El aula está ocupada. Vuelve a intentarlo.')
}
const nameKey = (name) =>
  name.trim().normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('es')
function protect(tag, field, value) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(sign('directory-key', [tag, field]), 'hex'), iv)
  return Buffer.concat([iv, cipher.update(value, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64url')
}
function reveal(tag, field, value) {
  if (!value) return null
  const bytes = Buffer.from(value, 'base64url')
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(sign('directory-key', [tag, field]), 'hex'), bytes.subarray(0, 12))
  cipher.setAuthTag(bytes.subarray(-16))
  return Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]).toString('utf8')
}
function setCode(s, p, tag, requested) {
  const used = new Set(Object.values(s.students).map(student => student.codeTag))
  let code = requested
  if (code === undefined) {
    do { code = String(randomInt(1000000)).padStart(6, '0') }
    while (used.has(sign('assigned-code', code)))
  } else {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) fail(400, 'El código debe tener seis dígitos.')
    if (used.has(sign('assigned-code', code))) fail(409, 'Elige otro código.')
  }
  p.codeTag = sign('assigned-code', code)
  p.pin = sign('pin', [tag, code])
  p.protectedCode = protect(tag, 'code', code)
  p.version = randomBytes(16).toString('hex')
  p.failures = p.until = 0
  return code
}
export async function enroll({ name, dni }) {
  if (typeof name !== 'string' || !name.trim() || name.length > 80 ||
      typeof dni !== 'string' || !/^\d{8}$/.test(dni))
    fail(400, 'Introduce un nombre y un DNI de ocho dígitos.')
  const tag = sign('dni', dni)
  return state(s => {
    if (s.students[tag] || s.byDni?.[tag]) fail(409, 'Este DNI ya está inscrito.')
    const id = randomBytes(32).toString('hex')
    const p = { name: name.trim(), tag, protectedDni: protect(tag, 'dni', dni), seen: {}, points: 0 }
    const code = setCode(s, p, tag)
    s.students[id] = p
    s.byDni ??= {}
    s.byDni[tag] = id
    return { name: p.name, code }
  }, true)
}
export function directory() {
  return state(s => Object.entries(s.students).map(([id, p]) => ({
    id, name: p.name, dni: reveal(p.tag ?? id, 'dni', p.protectedDni),
    points: p.points, hasCode: !!p.protectedCode,
  })).sort((a, b) => a.name.localeCompare(b.name, 'es')))
}
export function manageStudent({ id, operation, code, dni }) {
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) fail(400, 'Alumno inválido.')
  return state(s => {
    const p = s.students[id]
    if (!p) fail(404, 'El alumno ya no figura en el padrón.')
    const tag = p.tag ?? id
    if (operation === 'reveal') return { code: reveal(tag, 'code', p.protectedCode) }
    if (operation === 'code') return { code: setCode(s, p, tag, code) }
    if (operation === 'dni') {
      if (typeof dni !== 'string' || !/^\d{8}$/.test(dni) || sign('dni', dni) !== tag)
        fail(400, 'El DNI debe coincidir con el de la inscripción.')
      p.protectedDni = protect(tag, 'dni', dni)
      return {}
    }
    if (!['reset', 'delete'].includes(operation)) fail(400, 'Operación desconocida.')
    for (const a of Object.values(s.assignments ?? {})) delete a.attempts[id]
    if (s.round) delete s.round.best[id]
    delete s.students[id]
    if (s.byDni) delete s.byDni[tag]
    if (operation === 'delete') return {}
    // A new identity also invalidates old exercise tickets and browser practice history.
    const next = randomBytes(32).toString('hex')
    const { seen, tried, stats, weeks, activity, ...account } = p
    s.students[next] = { ...account, tag, points: 0, seen: {} }
    s.byDni ??= {}
    s.byDni[tag] = next
    return { id: next }
  }, operation !== 'reveal')
}
export function accountState(identity, fn, write = false) {
  return state(s => {
    if (identity && !identity.admin) {
      const p = s.students[identity.id]
      if (!p || (p.version && p.version !== identity.version)) fail(401, 'Vuelve a iniciar sesión.')
    }
    return fn(s)
  }, write)
}
// Share only simultaneous read-only checks, e.g. several original figures on one page.
const activeChecks = new Map()
export function checkAccess(identity) {
  const key = identity.id + ':' + identity.version
  if (!activeChecks.has(key)) {
    activeChecks.set(key, accountState(identity, () => true).finally(() => activeChecks.delete(key)))
  }
  return activeChecks.get(key)
}
export async function identify({ admin, password, dni, name, code }, forSession = false) {
  if (admin === true) {
    if (!process.env.MATHX_ADMIN_PASSWORD || !matches(password, process.env.MATHX_ADMIN_PASSWORD))
      fail(401, 'Credenciales incorrectas.')
    return forSession ? { id: 'admin' } : 'admin'
  }
  if (typeof name !== 'string' || name.length > 80 || typeof dni !== 'string' ||
      !/^\d{8}$/.test(dni) || typeof code !== 'string' || !/^\d{6}$/.test(code))
    fail(401, 'Credenciales incorrectas.')
  const tag = sign('dni', dni)
  const valid = p => matches(p.pin, sign('pin', [tag, code])) && nameKey(name) === nameKey(p.name)
  const denied = 'Credenciales incorrectas o acceso temporalmente bloqueado.'
  const result = (id, p) => forSession ? { id, version: p.version } : id
  const authenticated = await state(s => {
    const id = s.byDni?.[tag] ?? tag, p = s.students[id]
    if (!p || p.until > Date.now()) fail(401, denied)
    return !p.failures && !p.until && p.protectedDni && p.protectedCode && valid(p) ? result(id, p) : null
  })
  if (authenticated) return authenticated
  const ok = await state(s => {
    const id = s.byDni?.[tag] ?? tag, p = s.students[id]
    if (!p || p.until > Date.now()) return false
    if (!valid(p)) {
      p.failures = (p.failures ?? 0) + 1
      if (p.failures >= 5) { p.until = Date.now() + 600000; p.failures = 0 }
      return false
    }
    p.protectedDni ??= protect(tag, 'dni', dni)
    p.protectedCode ??= protect(tag, 'code', code)
    p.failures = p.until = 0
    return result(id, p)
  }, true)
  if (!ok) fail(401, denied)
  return ok
}
export function boards(identity) {
  return accountState(identity, (s) => {
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
export async function submit(id, body, identity) {
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
    return accountState(identity, (s) => {
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
  const counted = await accountState(identity, (s) => {
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
