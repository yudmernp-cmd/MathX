import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { crc32, deflateSync } from 'node:zlib'
import { put, get, del } from '@vercel/blob'

export const photoSide = 96
const totalBytes = photoSide * photoSide * 3
const cloud = () => !!(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN)
const pathFor = id => 'classroom/photos/' + id + '.png'
let db
function local() {
  if (db) return db
  const classroom = process.env.MATHX_LEAGUE_DB || '.private/classroom.sqlite'
  if (classroom !== ':memory:') mkdirSync(dirname(classroom), { recursive: true, mode: 0o700 })
  db = new DatabaseSync(classroom === ':memory:' ? classroom : classroom + '.photos')
  db.exec('CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, content BLOB NOT NULL)')
  return db
}

function chunk(name, content) {
  const data = Buffer.concat([Buffer.from(name), content])
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4)
  size.writeUInt32BE(content.length)
  checksum.writeUInt32BE(crc32(data))
  return Buffer.concat([size, data, checksum])
}

// Only RGB samples cross the upload boundary. Dimensions, metadata and the PNG
// container are produced here regardless of the format of the original photo.
export function thumbnail(pixels) {
  if (typeof pixels !== 'string' || pixels.length !== totalBytes * 4 / 3 || !/^[a-zA-Z0-9+/]+$/.test(pixels))
    return null
  const rgb = Buffer.from(pixels, 'base64')
  if (rgb.length !== totalBytes) return null
  const line = photoSide * 3
  const rows = Buffer.alloc(photoSide * (line + 1))
  for (let y = 0; y < photoSide; y++) {
    const start = y * (line + 1)
    rows[start] = 1 // PNG Sub filter, one byte per channel.
    for (let i = 0; i < line; i++) {
      const pos = y * line + i
      rows[start + i + 1] = rgb[pos] - (i < 3 ? 0 : rgb[pos - 3])
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(photoSide)
  header.writeUInt32BE(photoSide, 4)
  header[8] = 8
  header[9] = 2
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)),
  ])
}

export async function storePhoto(bytes) {
  const id = randomUUID()
  if (cloud()) {
    await put(pathFor(id), bytes, {
      access: 'private', contentType: 'image/png', addRandomSuffix: false,
    })
  } else local().prepare('INSERT INTO photos (id, content) VALUES (?, ?)').run(id, bytes)
  return id
}
export async function readPhoto(id) {
  if (cloud()) {
    const result = await get(pathFor(id), { access: 'private' })
    if (!result) return null
    return Buffer.from(await new Response(result.stream).arrayBuffer())
  }
  return local().prepare('SELECT content FROM photos WHERE id=?').get(id)?.content
}
export async function dropPhoto(id) {
  if (!id) return
  try {
    if (cloud()) await del(pathFor(id))
    else local().prepare('DELETE FROM photos WHERE id=?').run(id)
  } catch (e) {
    // The replaced file is already unreachable through the authenticated image route.
    console.warn('MathX: no se pudo retirar una miniatura anterior', e?.name)
  }
}
