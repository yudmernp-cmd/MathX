// Ship translated questions and original visuals as a private JWE edition.
// Vercel only needs Node to open the edition during a production deployment.
import { createHash, createPublicKey } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
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
    const answers = q.blocks.map(block => block.answer).filter(Boolean)
    if (!answers.length || new Set(answers).size !== answers.length)
      throw new Error('La pregunta necesita un identificador distinto para cada respuesta.')
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

const workedPath = 'server-data/pro-worked.json'
const workedBundle = 'editions/pro-solutions.jwe'
async function validateSolutions(keys) {
  const catalog = await parse(catalogPath)
  if (Object.keys(keys).length !== catalog.length) throw Error('Colección de soluciones incompleta.')
  let total = 0
  for (const entry of catalog) {
    const qs = await parse(paperDirectory(entry) + '/questions.json')
    const guide = keys[entry.id]
    if (!guide || Object.keys(guide).length !== qs.length) throw Error('Preguntas incompletas en ' + entry.id)
    for (const q of qs) {
      const labels = q.blocks.map(b => b.answer).filter(Boolean)
      const rows = guide[q.number]
      if (!rows || Object.keys(rows).length !== labels.length) throw Error('Incisos incompletos en ' + entry.id + '/' + q.number)
      let marks = 0
      for (const label of labels) {
        const p = rows[label]
        if (!p || !Number.isInteger(p.marks) || p.marks < 0 || typeof p.steps !== 'string' || !p.steps.trim()
            || (p.value !== undefined && !Number.isFinite(p.value))
            || (p.range !== undefined && !Number.isFinite(p.range?.minExclusive))
            || (p.accepted !== undefined && (!Array.isArray(p.accepted) || !p.accepted.every(t => typeof t === 'string' && t.trim()))))
          throw Error('Solución inválida en ' + entry.id + '/' + q.number + '/' + label)
        marks += p.marks
        total++
      }
      if (marks !== q.marks) throw Error('Baremo incorrecto en ' + entry.id + '/' + q.number)
    }
  }
  console.log('%d cuadernillos y %d incisos con solución.', catalog.length, total)
}
async function localSolutions() {
  const catalog = await parse(catalogPath)
  const guides = {}
  for (const e of catalog) guides[e.id] = await parse('.private/worked/' + e.id + '.json')
  await validateSolutions(guides)
  await atomicWrite(workedPath, JSON.stringify(guides))
  return guides
}
async function packSolutions(recipientPath) {
  const guides = await localSolutions()
  const key = await importJWK(await parse(recipientPath), 'ECDH-ES')
  const ciphertext = await new CompactEncrypt(gzipSync(JSON.stringify(guides)))
    .setProtectedHeader({ alg: 'ECDH-ES', enc: 'A256GCM', typ: 'mathx-solutions-v1' }).encrypt(key)
  await atomicWrite(workedBundle, ciphertext)
}
async function openSolutions() {
  const key = editionIdentity(process.env.MATHX_SESSION_SECRET)
  const { plaintext, protectedHeader } = await compactDecrypt(await readFile(workedBundle,'utf8'),key,{
    keyManagementAlgorithms:['ECDH-ES'], contentEncryptionAlgorithms:['A256GCM'],
  })
  if (protectedHeader.typ !== 'mathx-solutions-v1') throw Error('Edición de soluciones desconocida.')
  const guides = JSON.parse(gunzipSync(plaintext,{maxOutputLength:16*1024*1024}))
  await validateSolutions(guides)
  await atomicWrite(workedPath,JSON.stringify(guides))
}

const [command, ...args] = process.argv.slice(2)
if (command === 'pack-solutions') await packSolutions(args[0])
else if (command === 'pack') await pack(args[0])
else if (command === 'unpack') await unpack()
else if (command === 'prepare') {
  const secret = process.env.MATHX_SESSION_SECRET
  const recipient = await parse('editions/pro-recipient.json')
  const matchesKey = !!secret && createPublicKey(editionIdentity(secret)).export({format:'jwk'}).x === recipient.x
  if (process.env.VERCEL_ENV === 'production' && !matchesKey)
    throw new Error('La clave del aula ha cambiado. Vuelve a cifrar las ediciones para esta instancia.')
  if (matchesKey && !args.includes('--refresh')) await unpack()
  else execFileSync('python3', ['tools/prepare_pro.py', ...args], { stdio: 'inherit' })
  if (matchesKey) await openSolutions()
  else if (existsSync('.private/worked')) await localSolutions()
} else throw new Error('Usa prepare, pack, pack-solutions o unpack.')
