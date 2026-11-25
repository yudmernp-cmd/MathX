// Ship translated questions and original visuals as a private JWE edition.
// Vercel only needs Node to open the edition during a production deployment.
import { createHash, createPublicKey } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { gzipSync, gunzipSync } from 'node:zlib'
import { CompactEncrypt, compactDecrypt, importJWK } from 'jose'
import { editionIdentity } from './pro_recipient.mjs'

const bundle = 'editions/pro-es.jwe'
const catalogPath = 'server-data/pro/catalog.json'
const hex = /^[a-f0-9]{64}$/
const parse = async path => JSON.parse(await readFile(path, 'utf8'))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

function imageIds(questions) {
  if (!Array.isArray(questions) || !questions.length ||
      questions.reduce((total, q) => total + q.marks, 0) !== 80)
    throw new Error('El puntaje de la edición no coincide con el examen.')
  const images = new Set()
  function inspect(part) {
    if (typeof part === 'string') return
    if (!hex.test(part.image) || !(part.width > 0 && part.height > 0))
      throw new Error('Figura no válida en la edición.')
    images.add(part.image)
  }
  questions.forEach((q, index) => {
    if (q.number !== index + 1 || !q.blocks?.length) throw new Error('Pregunta incompleta.')
    for (const block of q.blocks) {
      if (block.parts) block.parts.forEach(inspect)
      else inspect(block)
    }
  })
  return images
}

function paperDirectory(row) {
  if (!hex.test(row.id) || ![1, 2].includes(row.paper) || typeof row.title !== 'string')
    throw new Error('Cuadernillo no válido en la edición.')
  return 'server-data/pro-es/' + row.id
}

async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true })
  const temp = path + '.' + process.pid + '.tmp'
  await writeFile(temp, bytes)
  await rename(temp, path)
}

async function pack(recipientPath) {
  const catalog = await parse(catalogPath)
  const papers = {}
  const images = {}
  for (const row of catalog) {
    const dir = paperDirectory(row)
    const questions = await parse(dir + '/questions.json')
    for (const id of imageIds(questions)) {
      if (images[id]) continue
      const bytes = await readFile(dir + '/' + id + '.webp')
      if (digest(bytes) !== id) throw new Error('Figura dañada.')
      images[id] = bytes.toString('base64')
    }
    papers[row.id] = questions
  }
  const recipient = await importJWK(await parse(recipientPath), 'ECDH-ES')
  const data = gzipSync(JSON.stringify({ catalog, papers, images }), { level: 9 })
  const encrypted = await new CompactEncrypt(data)
    .setProtectedHeader({ alg: 'ECDH-ES', enc: 'A256GCM', typ: 'mathx-pro-v1' })
    .encrypt(recipient)
  await atomicWrite(bundle, encrypted)
}

async function unpack() {
  const key = editionIdentity(process.env.MATHX_SESSION_SECRET)
  const { protectedHeader, plaintext } = await compactDecrypt(await readFile(bundle, 'utf8'), key, {
    keyManagementAlgorithms: ['ECDH-ES'], contentEncryptionAlgorithms: ['A256GCM'],
  })
  if (protectedHeader.typ !== 'mathx-pro-v1') throw new Error('Versión de la edición desconocida.')
  const { catalog, papers, images } = JSON.parse(gunzipSync(plaintext, { maxOutputLength: 128 * 1024 * 1024 }).toString())
  if (![1, 2].every(type => catalog.some(row => row.paper === type))) throw new Error('Falta una prueba.')
  for (const row of catalog) {
    const dir = paperDirectory(row)
    const questions = papers[row.id]
    for (const id of imageIds(questions)) {
      const bytes = Buffer.from(images[id], 'base64')
      if (digest(bytes) !== id) throw new Error('Figura dañada.')
      await atomicWrite(dir + '/' + id + '.webp', bytes)
    }
    await atomicWrite(dir + '/questions.json', JSON.stringify(questions))
  }
  await atomicWrite(catalogPath, JSON.stringify(catalog))
  console.log('Edición en español preparada con %d cuadernillos.', catalog.length)
}

const [command, ...args] = process.argv.slice(2)
if (command === 'pack') await pack(args[0])
else if (command === 'unpack') await unpack()
else if (command === 'prepare') {
  // Local classrooms can build from their Drive even when using a different session secret.
  if (process.env.VERCEL && process.env.MATHX_SESSION_SECRET && !args.includes('--refresh')) {
    const currentKey = createPublicKey(editionIdentity(process.env.MATHX_SESSION_SECRET)).export({ format: 'jwk' })
    const recipient = await parse('editions/pro-recipient.json')
    if (currentKey.x === recipient.x) await unpack()
    else if (process.env.VERCEL_ENV === 'production')
      throw new Error('La clave del aula ha cambiado. Vuelve a cifrar la edición para esta instancia.')
    else execFileSync('python3', ['tools/prepare_pro.py', ...args], { stdio: 'inherit' })
  } else execFileSync('python3', ['tools/prepare_pro.py', ...args], { stdio: 'inherit' })
} else throw new Error('Usa prepare, pack o unpack.')
