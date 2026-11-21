import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { brotliCompressSync } from 'node:zlib'

if (process.stdout.isTTY) {
  throw Error('Redirige la edición privada a un archivo local o a Vercel.')
}
const database = readFileSync(process.argv[2] || 'server-data/approved.sqlite')
const digest = createHash('sha256').update(database).digest('hex')
process.stdout.write(
  digest + '.' + brotliCompressSync(database).toString('base64'),
)
