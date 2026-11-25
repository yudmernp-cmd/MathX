import { readFile } from 'node:fs/promises'
import { session, same, paperSignature } from '../server/session.mjs'

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
      !same(params.get('signature') || '', paperSignature(identity.id, id)))
    return reject(403, 'Este cuadernillo no está asignado a tu cuenta.')
  try {
    const pdf = await readFile('server-data/pro/' + id + '.pdf')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="MathX-Simulacro-Pro.pdf"')
    res.setHeader('Content-Length', pdf.length)
    res.end(req.method === 'HEAD' ? undefined : pdf)
  } catch (error) {
    return reject(error.code === 'ENOENT' ? 404 : 503, 'No se pudo abrir el cuadernillo.')
  }
}
