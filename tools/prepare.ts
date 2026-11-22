import { buildSync } from 'esbuild'
import { DatabaseSync } from 'node:sqlite'
import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { brotliDecompressSync } from 'node:zlib'
import { exercise, families } from '../src/math/engine'
import { levels, points } from '../src/math/model'

const directory = path.resolve(process.env.MATHX_DATA_DIR || 'server-data')
mkdirSync(directory, { recursive: true })
buildSync({
  entryPoints: ['src/math/engine.ts'],
  outfile: path.join(directory, 'exam-originals.cjs'),
  platform: 'node',
  format: 'cjs',
  bundle: true,
  target: 'node24',
})
buildSync({
  entryPoints: ['server/league-grading.ts'],
  outfile: path.join(directory, 'league-grading.cjs'),
  platform: 'node',
  format: 'cjs',
  bundle: true,
  target: 'node24',
})
const dest = path.join(directory, 'bank.sqlite'),
  temp = dest + '.' + randomUUID()
const restored = temp + '.approved'
const db = new DatabaseSync(temp)
try {
  db.exec(readFileSync('server/schema.sql', 'utf8'))
  let authorized = path.join(directory, 'approved.sqlite')
  const edition = process.env.MATHX_APPROVED_EDITION
  if (edition !== undefined) {
    const [digest, encoded] = edition.trim().split('.')
    const bytes = brotliDecompressSync(Buffer.from(encoded || '', 'base64'), {
      maxOutputLength: 32 * 1024 * 1024,
    })
    if (createHash('sha256').update(bytes).digest('hex') !== digest)
      throw Error(
        'La edición privada del banco no supera el control de integridad.',
      )
    writeFileSync(restored, bytes, { flag: 'wx', mode: 0o600 })
    authorized = restored
  }
  if (existsSync(authorized)) {
    db.prepare('ATTACH DATABASE ? AS approved').run(authorized)
    db.exec(
      "INSERT INTO items SELECT * FROM approved.items WHERE origin='real'; INSERT INTO assets SELECT * FROM approved.assets; DETACH DATABASE approved;",
    )
  }
  const insert = db.prepare(
    'INSERT OR IGNORE INTO items VALUES(?,?,?,?,?,?,?,?,?,?)',
  )
  const settings = path.join(directory, 'reserve.json')
  const stored = existsSync(settings)
    ? JSON.parse(readFileSync(settings, 'utf8')).perFamily
    : 20
  const count =
    process.argv[2] === '--add'
      ? stored + Number(process.argv[3])
      : Number(process.argv[2] || process.env.MATHX_RESERVE_SIZE || stored)
  if (!Number.isSafeInteger(count) || count < 1)
    throw Error('Indica una cantidad positiva de semillas por familia.')
  const hash = (s: string) => createHash('sha256').update(s).digest('hex')
  db.exec('BEGIN')
  for (const paper of [1, 2] as const)
    for (const f of families)
      for (const difficulty of levels)
        for (let i = 0; i < count; i++) {
          const q = exercise(
            { course: 'MAI', paper, subtopic: f.id, difficulty },
            i,
          )
          const wording = [q.stem, q.figure, ...q.parts.map((p) => p.ask)]
          const fingerprint = hash(JSON.stringify(wording))
          const id = 'mx-' + paper + '-' + fingerprint
          const payload = {
            ...q,
            id,
            paper,
            language: 'es',
            provenance: { course: 'MAI NM', paper, seed: i },
            validated: true,
            permission: 'original de MathX',
          }
          insert.run(
            id,
            'original',
            paper,
            q.theme,
            q.topic,
            q.level,
            points(q),
            q.family,
            fingerprint,
            JSON.stringify(payload),
          )
        }
  db.exec('COMMIT')
  console.log(
    db
      .prepare(
        'SELECT origin,paper,count(*) AS cantidad FROM items GROUP BY origin,paper',
      )
      .all(),
  )
  db.close()
  renameSync(temp, dest)
  writeFileSync(settings, JSON.stringify({ perFamily: count }))
} finally {
  if (existsSync(restored)) unlinkSync(restored)
  if (existsSync(temp)) unlinkSync(temp)
}
