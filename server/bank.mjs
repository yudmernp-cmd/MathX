import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { hybrid, practice } from './hybrid.mjs'
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
      'SELECT id,paper,origin,theme,topic,level,marks,similarity FROM items ORDER BY id',
    )
    .all()
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
      const ids = sim
        ? hybrid(index, config.paper, rng)
        : [practice(index, config, recent, rng)]
      return ids.map((id) => JSON.parse(lookup.get(id).payload))
    },
    asset(id) {
      return db.prepare('SELECT data FROM assets WHERE id=?').get(id)?.data
    },
  }
  return current
}
