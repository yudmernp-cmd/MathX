import { assignments } from '../server/assignments.mjs'
import {
  createHash,
  createHmac,
  timingSafeEqual,
  randomBytes,
  randomInt,
} from 'node:crypto'
import {
  identify,
  enroll,
  boards,
  toggle,
  submit,
  examTicket,
  examPrompts,
  drillTicket,
  ClassroomError,
} from '../server/league.mjs'
import { drills, topics } from '../server/drills/index.mjs'
import { bank } from '../server/bank.mjs'
import { levels, themes, Unavailable } from '../server/hybrid.mjs'
const cookie = '__Host-mathx',
  lifetime = 8 * 60 * 60
const digest = (s) => createHash('sha256').update(s).digest()
const same = (a, b) => timingSafeEqual(digest(a), digest(b))
function mac(s) {
  return createHmac('sha256', process.env.MATHX_SESSION_SECRET)
    .update(s)
    .update('\0')
    .update('identity-v1')
    .digest('hex')
}
function session(req) {
  const match = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(cookie + '='))
    ?.slice(cookie.length + 1)
  if (
    !match ||
    !/^\d{10,12}\.(?:admin|[a-f0-9]{64})\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(
      match,
    )
  )
    return 0
  const [exp, id, nonce, sig] = match.split('.')
  return Number(exp) > Date.now() / 1000 &&
    same(mac([exp, id, nonce].join('.')), sig)
    ? { expires: Number(exp) * 1000, id, admin: id === 'admin' }
    : 0
}
async function read(req, limit = 8192) {
  if (req.body !== undefined)
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (Buffer.byteLength(text) > limit) throw Error('body')
  }
  return JSON.parse(text || '{}')
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  const send = (status, json) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(json))
  }
  const url = new URL(req.url, 'http://localhost'),
    action = url.searchParams.get('action')
  if (req.method === 'GET' && action === 'status') {
    try {
      bank()
    } catch {
      return send(503, {
        error: 'El banco del aula está pendiente de instalación.',
      })
    }
  }
  if ((process.env.MATHX_SESSION_SECRET?.length || 0) < 32) {
    return send(503, {
      error: 'El acceso del aula está pendiente de configuración.',
    })
  }
  const until = session(req)
  if (req.method === 'GET' && action === 'status')
    return send(200, { authenticated: !!until, expires: 0, ...until })
  if (req.method === 'POST') {
    try {
      if (
        new URL(req.headers.origin).host !== req.headers.host ||
        !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')
      )
        return send(403, { error: 'Solicitud no permitida.' })
    } catch {
      return send(403, { error: 'Origen no permitido.' })
    }
  }
  try {
    const selection = ['practice', 'exam', 'drills'].includes(action)
    const limit =
      selection || action === 'submit' || action === 'task' ? 1024 * 1024 : 8192
    if (req.method === 'POST' && Number(req.headers['content-length']) > limit)
      return send(413, { error: 'Solicitud demasiado extensa.' })
    if (req.method === 'POST' && action === 'login') {
      const body = await read(req)
      const id = await identify(body)
      const exp = Math.floor(Date.now() / 1000) + lifetime,
        value = exp + '.' + id + '.' + randomBytes(16).toString('hex')
      res.setHeader(
        'Set-Cookie',
        cookie +
          '=' +
          value +
          '.' +
          mac(value) +
          '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' +
          lifetime,
      )
      return send(200, {
        authenticated: true,
        id,
        admin: id === 'admin',
        expires: exp * 1000,
      })
    }
    if (!until) return send(401, { error: 'Inicia sesión en el aula.' })
    if (req.method === 'POST' && action === 'logout') {
      res.setHeader(
        'Set-Cookie',
        cookie + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
      )
      return send(200, { authenticated: false })
    }
    if (req.method === 'GET' && action === 'learning')
      return send(200, await assignments(until.id, 'learning'))
    if (req.method === 'POST' && action === 'task') {
      const body = await read(req, limit)
      return send(200, await assignments(until.id, body.action, body))
    }
    if (req.method === 'GET' && action === 'boards')
      return send(200, await boards())
    if (req.method === 'POST' && ['enroll', 'toggle'].includes(action)) {
      if (!until.admin)
        return send(403, { error: 'Acceso exclusivo de administración.' })
      const data = await read(req)
      if (action === 'toggle' && data.active === true)
        return send(409, {
          error: 'Publica una convocatoria desde Asignar actividad.',
        })
      return send(
        200,
        action === 'enroll' ? await enroll(data) : await toggle(data.active),
      )
    }
    if (req.method === 'POST' && action === 'submit')
      return send(200, await submit(until.id, await read(req, limit)))
    if (req.method === 'GET' && action === 'catalog')
      return send(200, bank().catalog)
    if (req.method === 'GET' && action === 'asset') {
      const id = url.searchParams.get('id')
      const data = /^[a-f0-9]{64}$/.test(id || '') && bank().asset(id)
      if (!data) return send(404, { error: 'Gráfico no disponible.' })
      res.setHeader('Content-Type', 'image/webp')
      res.end(Buffer.from(data))
      return
    }
    if (req.method === 'POST' && action === 'drills') {
      const {
        tema,
        dificultad_objetivo = 3,
        cantidad = 15,
        recent = [],
        draw,
        offset = 0,
      } = await read(req, limit)
      if (
        typeof tema !== 'string' ||
        !Object.hasOwn(topics, tema) ||
        (draw !== undefined && (!Number.isSafeInteger(draw) || draw < 0)) ||
        !Number.isInteger(offset) ||
        offset < 0 ||
        offset >= 330 ||
        cantidad !== 15 ||
        !Number.isInteger(dificultad_objetivo) ||
        dificultad_objetivo < 1 ||
        dificultad_objetivo > 5 ||
        !Array.isArray(recent) ||
        recent.length > 15000 ||
        recent.some((s) => typeof s !== 'string' || s.length > 160)
      )
        return send(400, {
          error:
            'Elige un tema y una dificultad del 1 al 5 para la tanda de 15 ejercicios.',
        })
      return send(
        200,
        drills(
          tema,
          dificultad_objetivo,
          draw === undefined
            ? randomInt(2 ** 32)
            : digest(
                JSON.stringify([tema, dificultad_objetivo, offset, draw]),
              ).readUInt32BE(),
          recent,
          draw,
          offset,
        ).map((q) => ({ ...q, signature: drillTicket(until.id, q) })),
      )
    }
    if (req.method === 'POST' && selection) {
      const {
        paper,
        difficulty,
        theme,
        recent = [],
        draw,
        offset,
      } = await read(req, limit)
      if (
        ![1, 2].includes(paper) ||
        (draw !== undefined && (!Number.isSafeInteger(draw) || draw < 0)) ||
        (offset !== undefined &&
          (!Number.isInteger(offset) || offset < 0 || offset >= 330)) ||
        !Array.isArray(recent) ||
        recent.length > 15000 ||
        !recent.every((s) => typeof s === 'string' && s.length < 160) ||
        (action === 'practice' &&
          (!levels.includes(difficulty) || (theme && !themes.includes(theme))))
      )
        return send(400, { error: 'Configuración de práctica inválida.' })
      const sim = action === 'exam',
        config = {
          course: 'MAI',
          paper,
          difficulty: sim ? 'Medio' : difficulty,
          ...(!sim && { theme }),
        }
      const seed = randomInt(2 ** 32)
      const questions = bank().questions(
        config,
        sim,
        recent,
        seed,
        draw ?? (recent.length ? seed % 330 : 0),
        offset,
      )
      const deadline = Date.now() + 90 * 60000
      const ticket = sim
        ? await examTicket(until.id, questions, deadline)
        : null
      return send(200, {
        ticket,
        mode: sim ? 'Simulacros' : 'Ejercicios',
        config,
        seed,
        questions: ticket ? examPrompts(questions) : questions,
        index: 0,
        answers: {},
        notes: {},
        finished: false,
        checked: false,
        deadline,
      })
    }
    return send(404, { error: 'Recurso desconocido.' })
  } catch (e) {
    if (e instanceof ClassroomError) return send(e.status, { error: e.message })
    if (e instanceof Unavailable) {
      console.info('Disponibilidad MathX', JSON.stringify(e.details))
      return send(409, { error: e.message, ...e.details })
    }
    if (e instanceof SyntaxError || e?.message === 'body')
      return send(400, { error: 'Datos de solicitud inválidos.' })
    console.error('Error de aula', e?.code || e?.name)
    return send(503, { error: 'No se pudo completar la operación del aula.' })
  }
}
