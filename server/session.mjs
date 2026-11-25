import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
export const cookie = '__Host-mathx'
export const digest = (s) => createHash('sha256').update(s).digest()
export const same = (a, b) => timingSafeEqual(digest(a), digest(b))
export function mac(s) {
  return createHmac('sha256', process.env.MATHX_SESSION_SECRET)
    .update(s)
    .update('\0')
    .update('identity-v1')
    .digest('hex')
}
export function session(req) {
  const match = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(cookie + '='))
    ?.slice(cookie.length + 1)
  if (
    !match ||
    !/^\d{10,12}\.(?:admin|[a-f0-9]{64})\.[a-f0-9]{32}(?:\.[a-f0-9]{32})?\.[a-f0-9]{64}$/.test(
      match,
    )
  )
    return 0
  const fields = match.split('.')
  const sig = fields.pop()
  const [exp, id, , version] = fields
  return Number(exp) > Date.now() / 1000 &&
    same(mac(fields.join('.')), sig)
    ? { expires: Number(exp) * 1000, id, admin: id === 'admin', version }
    : 0
}

export const paperSignature = (owner, id) => mac('pro-paper-v1:' + owner + ':' + id)
