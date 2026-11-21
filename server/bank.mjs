import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { hybrid, practice, Unavailable } from './hybrid.mjs'

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
  const index = db
    .prepare(
      'SELECT id,paper,origin,theme,topic,level,marks,similarity,fingerprint,payload FROM items ORDER BY id',
    )
    .all()
    .map((row) => {
      const { payload, ...metadata } = row
      return { ...metadata, historyKey: historyKey(row) }
    })
  const byId = new Map(index.map((row) => [row.id, row]))
  const familyByKey = new Map(
    index.map((row) => [row.historyKey, row.similarity]),
  )
  const lookup = db.prepare('SELECT payload FROM items WHERE id=?')
  const catalog = db
    .prepare(
      'SELECT DISTINCT paper,theme,topic FROM items ORDER BY theme,topic',
    )
    .all()
  current = {
    catalog,
    index,
    questions(config, sim, recent, seed) {
      const rng = random(seed)
      // Older clients recorded bank IDs. Resolve those against this edition too.
      const history = recent.map((key) => byId.get(key)?.historyKey ?? key)
      const seen = new Set(history)
      const available = index.filter(
        (q) => q.paper === config.paper && !seen.has(q.historyKey),
      )
      let ids
      if (sim) {
        try {
          ids = hybrid(available, config.paper, rng)
        } catch (error) {
          if (
            error instanceof Unavailable &&
            index.some(
              (q) =>
                q.paper === config.paper &&
                seen.has(q.historyKey) &&
                q.origin === 'real',
            )
          ) {
            throw new Unavailable(
              'Quedan muy pocas preguntas inéditas compatibles para formar otro simulacro de 80 puntos.',
              error.details,
            )
          }
          throw error
        }
      } else {
        const lastFamily = new Map()
        history.forEach((key, i) => lastFamily.set(familyByKey.get(key), i))
        ids = [practice(available, config, rng, lastFamily)]
      }
      return ids.map((id) => ({
        ...JSON.parse(lookup.get(id).payload),
        historyKey: byId.get(id).historyKey,
      }))
    },
    asset(id) {
      return db.prepare('SELECT data FROM assets WHERE id=?').get(id)?.data
    },
  }
  return current
}
