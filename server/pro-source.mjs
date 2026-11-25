import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
const digest = value => createHash('sha256').update(value).digest('hex')
const folder = '1_aB_V4X2u9potB2eGUV8RsFAob8ecuhm'
let index
async function listing(id) {
  const response = await fetch('https://drive.google.com/drive/folders/' + encodeURIComponent(id))
  if (!response.ok) throw new Error('No se pudo consultar el material.')
  const match = (await response.text()).match(/window\['_DRIVE_ivd'\]\s*=\s*'(.*?)';/)
  if (!match) throw new Error('No se pudo leer el índice.')
  return JSON.parse(match[1].replace(/\\x([\da-fA-F]{2})/g, (_, code) => String.fromCharCode(parseInt(code,16))).replaceAll('\\/', '/'))[0]
}
async function locate() {
  const folders = (await listing(folder)).filter(row => row[2] === 'application/vnd.google-apps.folder')
  const rows = (await Promise.all(folders.map(row => listing(row[0])))).flat()
  return new Map(rows.map(row => [digest(row[0]), row[0]]))
}
export async function loadPaper(id) {
  const catalog = JSON.parse(await readFile('server-data/pro/catalog.json', 'utf8'))
  const row = catalog.find(entry => entry.id === id)
  if (!row) throw new Error('Cuadernillo desconocido.')
  index ||= locate().catch(error => { index = undefined; throw error })
  const key = (await index).get(row.locator)
  if (!key) throw new Error('Cuadernillo no disponible.')
  const res = await fetch('https://drive.usercontent.google.com/download?export=download&confirm=t&id=' + encodeURIComponent(key))
  const bytes = Buffer.from(await res.arrayBuffer())
  if (!res.ok || digest(bytes) !== id) throw new Error('El material cambió en Drive.')
  return bytes
}
