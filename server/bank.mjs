import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { individual } from './individual/index.mjs'
import { continuation, wordingKey } from './practice/index.mjs'
import { canAdapt, editionKey } from './practice/adaptations.mjs'
import { hybrid } from './hybrid.mjs'

// A short paper and its extended version often share the first two tasks.
// Keep that opening together even when the seed, marks or paper changes.
function historyKey(row) {
  const { stem, parts, figure, assets } = JSON.parse(row.payload)
  if (row.origin === 'real') {
    const content = [
      stem,
      parts.map((p) => p.ask),
      figure,
      assets?.map((a) => [a.id, a.part]),
    ]
    return (
      'ib-' + createHash('sha256').update(JSON.stringify(content)).digest('hex')
    )
  }
  const prompts = parts.slice(0, 2).map(({ ask }) =>
    ask
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[−-]?\d+(?:[.,]\d+)*/g, '#')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  const opening = JSON.stringify([figure?.type, ...prompts])
  return 'forma-' + createHash('sha256').update(opening).digest('hex')
}
function random(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
}
let current
export function bank() {
  if (current) return current
  const db = new DatabaseSync(
    path.resolve(process.env.MATHX_DATA_DIR || 'server-data', 'bank.sqlite'),
    { readOnly: true },
  )
  const reviewed = new Map()
  const { examOriginals } = createRequire(import.meta.url)(
    path.resolve(
      process.env.MATHX_DATA_DIR || 'server-data',
      'exam-originals.cjs',
    ),
  )
  const index = db
    .prepare(
      'SELECT id,paper,origin,theme,topic,level,marks,similarity,fingerprint,payload FROM items ORDER BY id',
    )
    .all()
    .map((row) => {
      const { payload, ...metadata } = row
      const q = JSON.parse(payload)
      if (row.origin === 'real') {
        const key = editionKey(q)
        if (canAdapt(key))
          reviewed.set(row.id, { key, question: q, paper: row.paper })
      }
      return {
        ...metadata,
        historyKey: historyKey(row),
        wordingKey: wordingKey(q),
      }
    })
  const catalog = db
    .prepare(
      'SELECT DISTINCT paper,theme,topic FROM items ORDER BY theme,topic',
    )
    .all()
  current = {
    catalog,
    sourceList() {
      return [...reviewed.entries()].map(([id, { paper, question: q }]) => ({
        id,
        paper,
        title: [
          q.provenance?.session,
          q.provenance?.year,
          'Pregunta ' + q.provenance?.number,
          q.topic,
        ]
          .filter(Boolean)
          .join(' · '),
      }))
    },
    source(id) {
      return reviewed.get(id)?.question
    },
    index,
    questions(config, sim, recent, seed, draw = 0, offset = seed % 330) {
      const rng = random(seed)
      const seen = new Set(recent)
      if (!sim) return [individual(config, seen, rng, draw, offset)]

      const actual = new Map()
      const rows = index.filter(
        (row) => row.paper === config.paper && reviewed.has(row.id),
      )
      for (const q of examOriginals(config.paper, seed)) {
        const content = wordingKey(q)
        const id = 'mxv-' + content.slice(6)
        if (actual.has(id) || seen.has(content)) continue
        const marks = q.parts.reduce(
          (s, p) => s + (p.marks ?? p.rubric.length),
          0,
        )
        actual.set(id, {
          ...q,
          id,
          marks,
          generated: true,
          wordingKey: content,
          historyKey: content,
        })
        rows.push({
          id,
          origin: 'original',
          paper: config.paper,
          similarity: q.family,
          historyKey: historyKey({
            origin: 'original',
            payload: JSON.stringify(q),
          }),
          theme: q.theme,
          level: q.level,
          marks,
        })
      }
      return hybrid(rows, config.paper, rng).map((id) => {
        if (actual.has(id)) return actual.get(id)
        const variant = continuation(
          null,
          config,
          draw,
          offset,
          reviewed.get(id),
        )
        return { ...variant, wordingKey: variant.historyKey }
      })
    },
    asset(id) {
      return db.prepare('SELECT data FROM assets WHERE id=?').get(id)?.data
    },
  }
  return current
}
