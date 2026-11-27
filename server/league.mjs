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
import { rememberPractice, recognizeHistory } from './exam-results.mjs'
import { academicCard, canEquip, classroomAppearance, recordBatch, recordDay, refreshAcademic } from './academics.mjs'
import { thumbnail, storePhoto, readPhoto, dropPhoto } from './profile-photo-store.mjs'
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
export async function enroll({ name }) {
  if (typeof name !== 'string' || !name.trim() || name.length > 80)
    fail(400, 'Introduce el nombre del alumno (hasta 80 caracteres).')
  return state(s => {
    const id = randomBytes(32).toString('hex')
    const p = { name: name.trim(), seen: {}, points: 0 }
    const code = setCode(s, p, id)
    s.students[id] = p
    return { name: p.name, code }
  }, true)
}
export function directory() {
  return state(s => Object.entries(s.students).map(([id, p]) => ({
    id, name: p.name,
    points: p.points, hasCode: !!p.protectedCode,
  })).sort((a, b) => a.name.localeCompare(b.name, 'es')))
}
export async function manageStudent({ id, operation, code }) {
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) fail(400, 'Alumno inválido.')
  const result = await state(s => {
    const p = s.students[id]
    if (!p) fail(404, 'El alumno ya no figura en el padrón.')
    const tag = p.tag ?? id
    if (operation === 'reveal') return { code: reveal(tag, 'code', p.protectedCode) }
    if (operation === 'code') return { code: setCode(s, p, tag, code) }
    if (!['reset', 'delete'].includes(operation)) fail(400, 'Operación desconocida.')
    for (const a of Object.values(s.assignments ?? {})) delete a.attempts[id]
    if (s.round) delete s.round.best[id]
    delete s.students[id]
    if (s.byDni) delete s.byDni[tag]
    if (operation === 'delete') return { removedPhoto: p.photo }
    // A new identity also invalidates old exercise tickets and browser practice history.
    const next = randomBytes(32).toString('hex')
    const { seen, tried, stats, weeks, activity, examResults, academics, ...account } = p
    s.students[next] = { ...account, tag, points: 0, seen: {} }
    return { id: next }
  }, operation !== 'reveal')
  if (operation === 'delete') {
    await dropPhoto(result.removedPhoto)
    return {}
  }
  return result
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
export async function identify({ admin, password, name, code }, forSession = false) {
  if (admin === true) {
    if (!process.env.MATHX_ADMIN_PASSWORD || !matches(password, process.env.MATHX_ADMIN_PASSWORD))
      fail(401, 'Credenciales incorrectas.')
    return forSession ? { id: 'admin' } : 'admin'
  }
  if (typeof name !== 'string' || !name.trim() || name.length > 80 ||
      typeof code !== 'string' || !/^\d{6}$/.test(code))
    fail(401, 'Credenciales incorrectas.')
  const normalized = nameKey(name)
  const denied = 'Credenciales incorrectas o acceso temporalmente bloqueado.'
  // Names may be shared. The personal code distinguishes the accounts.
  function authenticate(s, write) {
    const candidates = Object.entries(s.students).filter(([, p]) => nameKey(p.name) === normalized)
    if (!candidates.length) fail(401, denied)
    const now = Date.now()
    const found = candidates.find(([id, p]) => matches(p.pin, sign('pin', [p.tag ?? id, code])))
    if (found) {
      const [id, p] = found
      if (p.until > now) fail(401, denied)
      if (!write && (p.failures || p.until || !p.protectedCode)) return null
      if (write) {
        p.protectedCode ??= protect(p.tag ?? id, 'code', code)
        p.failures = p.until = 0
      }
      return forSession ? { id, version: p.version } : id
    }
    if (write) {
      for (const [, p] of candidates) {
        if (p.until > now) continue
        p.failures = (p.failures ?? 0) + 1
        if (p.failures >= 5) { p.until = now + 600000; p.failures = 0 }
      }
    }
    return null
  }
  const ok = await state(s => authenticate(s, false)) ??
    await state(s => authenticate(s, true), true)
  if (!ok) fail(401, denied)
  return ok
}
const photoReaders = new Map()
export async function profilePhoto(identity, id) {
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id ?? '')) fail(404, 'Foto no disponible.')
  // All thumbnails arriving together share the same access and membership read.
  const viewer = identity.id + ':' + identity.version
  if (!photoReaders.has(viewer)) {
    photoReaders.set(viewer, accountState(identity, s => new Set([
      s.adminPhoto, ...Object.values(s.students).map(p => p.photo),
    ])).finally(() => photoReaders.delete(viewer)))
  }
  const visible = await photoReaders.get(viewer)
  if (!visible.has(id)) fail(404, 'Foto no disponible.')
  const bytes = await readPhoto(id)
  if (!bytes) fail(404, 'Foto no disponible.')
  return Buffer.from(bytes)
}
export async function setProfilePhoto(identity, pixels) {
  const bytes = pixels === null ? null : thumbnail(pixels)
  if (pixels !== null && !bytes) fail(400, 'La imagen no se pudo procesar.')
  await checkAccess(identity)
  const photo = bytes ? await storePhoto(bytes) : null
  const previous = await accountState(identity, s => {
    const account = identity.admin ? s : s.students[identity.id]
    const key = identity.admin ? 'adminPhoto' : 'photo'
    const old = account[key]
    if (photo) account[key] = photo
    else delete account[key]
    return old
  }, true)
  await dropPhoto(previous)
  return { photo }
}
export function boards(identity) {
  return accountState(identity, (s) => {
    const row = (id, points) => {
      const p = s.students[id]
      return { member: sign('class-card', id), name: p.name, points, ...classroomAppearance(p), ...(p.photo && { photo: p.photo }) }
    }
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
        Object.entries(s.students).map(([id, p]) => row(id, p.points)),
      ),
      exams: exam
        ? list(
            Object.entries(exam.attempts)
              .filter(([, t]) => t.grade)
              .map(([id, t]) => row(id, t.grade.points)),
          )
        : s.round
          ? list(
              Object.entries(s.round.best).map(([id, points]) => row(id, points)),
            )
          : null,
    }
  })
}
export async function academicProfile(identity, member = null, choices = undefined) {
  if (choices !== undefined && member !== null) fail(403, 'Solo puedes personalizar tu perfil.')
  if (member === null && identity.admin) fail(403, 'Elige un estudiante en las clasificaciones.')
  return accountState(identity, s => {
    const id = member === null ? identity.id : Object.keys(s.students).find(id => sign('class-card', id) === member)
    const p = id && s.students[id]
    if (!p) fail(404, 'Este perfil ya no está disponible.')
    recognizeHistory(s, id)
    refreshAcademic(p)
    if (choices !== undefined) {
      if (!canEquip(p, choices)) fail(400, 'Elige elementos desbloqueados y hasta tres insignias distintas.')
      p.academics.equipped = choices
    }
    return academicCard(p, member === null)
  }, true)
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
export async function drillHelp(identity, { drill, signature }) {
  if (!drill?.batch || !matches(signature, drillTicket(identity.id, drill))) fail(400, 'Ejercicio inválido.')
  return accountState(identity, s => {
    if (!identity.admin) recordBatch(s.students[identity.id], drill, 'help')
    return { recorded: true }
  }, true)
}
export async function examTicket(id, questions, deadline, paper) {
  const round = await state((s) => s.round?.id)
  if ((!round && !paper) || id === 'admin') return null
  const iv = randomBytes(12)
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(sign('exam-key', id), 'hex'),
    iv,
  )
  const content = JSON.stringify({
    round, paper,
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
      // Earlier versions kept solved exercises before they tracked first attempts.
      if (!p.tried[key] && p.seen[key]) p.tried[key] = 2
      const fresh = !p.tried[key]
      if (fresh) {
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
      if (fresh) recordDay(p, drill.tema, p.activity)
      recordBatch(p, drill, 'answer', fresh && right)
      refreshAcademic(p)
      return { correct: right }
    }, true)
  }
  if (!body.ticket || !body.answers || typeof body.answers !== 'object')
    fail(400, 'Entrega inválida.')
  const ticket = openExam(id, body.ticket)
  let resultId
  const counted = await accountState(identity, (s) => {
    if (ticket.paper) resultId = rememberPractice(s.students[id], ticket, body)
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
  return { counted, questions: ticket.questions, ...(resultId && { resultId }) }
}
