import { checkAccess, ClassroomError } from '../server/league.mjs'
import { readFile } from 'node:fs/promises'
import { session, same, paperSignature, paperViewSignature } from '../server/session.mjs'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'no-referrer')
  const reject = (status, message) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(message)
  }
  if (req.method !== 'GET' && req.method !== 'HEAD')
    return reject(405, 'Método no permitido.')
  if ((process.env.MATHX_SESSION_SECRET?.length || 0) < 32)
    return reject(503, 'El acceso al aula está pendiente de configuración.')
  const identity = session(req)
  if (!identity) return reject(401, 'Inicia sesión en el aula.')
  const params = new URL(req.url, 'http://localhost').searchParams
  const id = params.get('id') || ''
  if (!/^[a-f0-9]{64}$/.test(id) ||
      (!same(params.get('signature') || '', paperSignature(identity.id, id)) && !same(params.get('signature') || '', paperViewSignature(identity.id, id))))
    return reject(403, 'Este cuadernillo no está asignado a tu cuenta.')
  const asset = params.get('asset')
  if (asset !== null && !/^[a-f0-9]{64}$/.test(asset))
    return reject(400, 'Figura no válida.')
  try {
    await checkAccess(identity)
    const filename = asset ? asset + '.webp' : 'questions.json'
    const content = await readFile('server-data/pro-es/' + id + '/' + filename)
    res.setHeader('Content-Type', asset ? 'image/webp' : 'application/json; charset=utf-8')
    res.setHeader('Content-Length', content.length)
    res.end(req.method === 'HEAD' ? undefined : content)
  } catch (error) {
    if (error instanceof ClassroomError) return reject(error.status, error.message)
    return reject(error.code === 'ENOENT' ? 404 : 503, 'No se pudo cargar el material de la prueba.')
  }
}
