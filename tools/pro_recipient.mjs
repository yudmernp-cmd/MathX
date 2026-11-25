import { createPrivateKey, createPublicKey, hkdfSync } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// RFC 8410 PKCS#8 prefix for a 32-byte X25519 seed.
export function editionIdentity(secret) {
  if (!secret || secret.length < 32) throw new Error('Falta la clave estable del aula.')
  const seed = hkdfSync('sha256', secret, 'MathX', 'Simulacro Pro / edition recipient / v1', 32)
  const der = Buffer.concat([Buffer.from('302e020100300506032b656e04220420', 'hex'), Buffer.from(seed)])
  return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
}

if (import.meta.url === pathToFileURL(process.argv[1]).href && process.env.VERCEL_ENV === 'production') {
  const publicKey = createPublicKey(editionIdentity(process.env.MATHX_SESSION_SECRET))
  mkdirSync('dist/.well-known', { recursive: true })
  writeFileSync('dist/.well-known/mathx-pro-recipient.json', JSON.stringify(publicKey.export({ format: 'jwk' })))
}
