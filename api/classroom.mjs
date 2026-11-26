import { readFile } from 'node:fs/promises'
import { cookie, digest, mac, session, paperViewSignature } from '../server/session.mjs'
import { examReport } from '../server/exam-results.mjs'
import { assignments } from '../server/assignments.mjs'
import {
  randomBytes,
  randomInt,
} from 'node:crypto'
import {
  identify,
  enroll,
  checkAccess, directory, manageStudent,
  boards, profilePhoto, setProfilePhoto,
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
const lifetime = 8 * 60 * 60
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
    const revision = process.env.VERCEL_GIT_COMMIT_SHA
    if (revision && /^[0-9a-f]{40}$/.test(revision))
      res.setHeader('X-MathX-Revision', revision.slice(0, 12))
  }
  if ((process.env.MATHX_SESSION_SECRET?.length || 0) < 32) {
    return send(503, {
      error: 'El acceso del aula está pendiente de configuración.',
    })
  }
  const until = session(req)

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
    if (req.method === 'GET' && action === 'status') {
      if (until && !until.admin) {
        try { await checkAccess(until) }
        catch (e) { if (e.status === 401) return send(200, { authenticated: false, expires: 0 }); throw e }
      }
      return send(200, until ? { authenticated: true, expires: until.expires, id: until.id, admin: until.admin }
        : { authenticated: false, expires: 0 })
    }
    const selection = ['practice', 'exam', 'drills'].includes(action)
    const limit =
      selection || action === 'submit' || action === 'report' || action === 'task' ? 1024 * 1024 : action === 'photo' ? 40 * 1024 : 8192
    if (req.method === 'POST' && Number(req.headers['content-length']) > limit)
      return send(413, { error: 'Solicitud demasiado extensa.' })
    if (req.method === 'POST' && action === 'login') {
      const body = await read(req)
      const { id, version } = await identify(body, true)
      const exp = Math.floor(Date.now() / 1000) + lifetime,
        value = [exp, id, randomBytes(16).toString('hex'), version].filter(Boolean).join('.')
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
    if (action === 'photo') {
      if (req.method === 'POST') {
        const body = await read(req, limit)
        return send(200, await setProfilePhoto(until, body?.pixels))
      }
      if (req.method === 'GET') {
        const bytes = await profilePhoto(until, url.searchParams.get('id'))
        res.setHeader('Cache-Control', 'private, max-age=300')
        res.setHeader('Vary', 'Cookie')
        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Content-Length', bytes.length)
        return res.end(bytes)
      }
      return send(405, { error: 'Método no permitido.' })
    }
    if (action === 'directory' || action === 'student') {
      if (!until.admin) return send(403, { error: 'Acceso exclusivo de administración.' })
      if (req.method === 'GET' && action === 'directory') return send(200, await directory())
      if (req.method === 'POST' && action === 'student') return send(200, await manageStudent(await read(req)))
      return send(405, { error: 'Método no permitido.' })
    }
    if (!until.admin && (selection || ['catalog', 'asset', 'pro-exam'].includes(action)))
      await checkAccess(until)
    if (req.method === 'POST' && action === 'pro-exam') {
      if (until.admin) return send(403, { error: 'Acceso exclusivo de estudiantes.' })
      const { paper } = await read(req)
      if (![1, 2].includes(paper)) return send(400, { error: 'Elige Prueba 1 o Prueba 2.' })
      const catalog = JSON.parse(await readFile('server-data/pro/catalog.json', 'utf8'))
      const choices = catalog.filter(entry => entry.paper === paper)
      if (!choices.length) return send(503, { error: 'No hay cuadernillos disponibles para esta prueba.' })
      const { id, title } = choices[randomInt(choices.length)]
      const deadline = Date.now() + 90 * 60000
      return send(200, {
        ticket: mac(['pro-attempt', until.id, id, deadline].join(':')),
        paper, title, id, signature: paperViewSignature(until.id, id),
        deadline,
      })
    }
    if (req.method === 'POST' && action === 'logout') {
      res.setHeader(
        'Set-Cookie',
        cookie + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
      )
      return send(200, { authenticated: false })
    }
    if (req.method === 'POST' && action === 'report')
      return send(200, await examReport(until, await read(req, limit)))
    if (req.method === 'GET' && action === 'learning')
      return send(200, await assignments(until.id, 'learning', {}, until))
    if (req.method === 'POST' && action === 'task') {
      const body = await read(req, limit)
      return send(200, await assignments(until.id, body.action, body, until))
    }
    if (req.method === 'GET' && action === 'boards')
      return send(200, await boards(until))
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
      return send(200, await submit(until.id, await read(req, limit), until))
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
        ? await examTicket(until.id, questions, deadline, paper)
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
