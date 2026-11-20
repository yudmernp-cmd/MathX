// Disposable bank to exercise actual authenticated endpoints and timer without licensing any IB material.
import { mkdtempSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { preview } from 'vite'
const dir = mkdtempSync(path.join(tmpdir(), 'mathx-e2e-'))
copyFileSync('server-data/bank.sqlite', path.join(dir, 'bank.sqlite'))
const db = new DatabaseSync(path.join(dir, 'bank.sqlite'))
db.exec("DELETE FROM items WHERE origin='real'")
const insert = db.prepare('INSERT INTO items VALUES(?,?,?,?,?,?,?,?,?,?)')
const topics = [
  'Números y álgebra',
  'Funciones',
  'Geometría y trigonometría',
  'Estadística y probabilidad',
  'Análisis matemático',
]
const levels = ['Fácil', 'Medio', 'Difícil']
for (let i = 0; i < 15; i++)
  for (const marks of [15, 17, 19]) {
    const id = 'fixture-' + i + '-' + marks
    const q = {
      id,
      origin: 'real',
      family: id,
      variant: 0,
      theme: topics[i % 5],
      topic: 'Documento de prueba sintético',
      level: levels[i % 3],
      scheme: 'sin esquema',
      stem: 'Material sintético exclusivo de las pruebas del programa.',
      parts: [
        {
          label: '(a)',
          ask: 'Desarrolla una respuesta de prueba.',
          value: null,
          steps: [],
          rubric: [],
          marks: marks - 2,
        },
        {
          label: '(b)(i)',
          ask: 'Explica el razonamiento de prueba.',
          value: null,
          steps: [],
          rubric: [],
          marks: 2,
        },
      ],
    }
    insert.run(
      id,
      'real',
      2,
      q.theme,
      q.topic,
      q.level,
      marks,
      'fixture-' + i,
      id,
      JSON.stringify(q),
    )
  }
db.close()
process.env.MATHX_DATA_DIR = dir
await preview({ preview: { port: 4182, host: '127.0.0.1', strictPort: true } })
