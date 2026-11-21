export const themes = [
  'Números y álgebra',
  'Funciones',
  'Geometría y trigonometría',
  'Estadística y probabilidad',
  'Análisis matemático',
]
export const levels = ['Fácil', 'Medio', 'Difícil']
export class Unavailable extends Error {
  constructor(message, details) {
    super(message)
    this.details = details
  }
}
export function shuffled(items, rng = Math.random) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
// Search metadata only. Retain a randomly chosen item for equivalent placement choices.
function candidates(rows, rng) {
  const choices = new Map()
  for (const q of shuffled(rows, rng)) {
    const key = [q.similarity, q.historyKey, q.theme, q.level, q.marks].join(
      '|',
    )
    if (!choices.has(key)) choices.set(key, q)
  }
  return [...choices.values()]
}
// One choice per family. For each suffix, track the marks attainable with exactly k
// questions. The search only visits combinations that can still reach both mark totals.
function placements(rows, count) {
  const grouped = new Map()
  for (const q of rows) {
    if (!grouped.has(q.similarity)) grouped.set(q.similarity, [])
    grouped.get(q.similarity).push(q)
  }
  const groups = [...grouped.values()]
  const sums = Array.from({ length: groups.length + 1 }, () =>
    Array(count + 1).fill(0n),
  )
  const mask = (1n << 81n) - 1n
  sums[groups.length][0] = 1n
  for (let i = groups.length - 1; i >= 0; i--) {
    sums[i][0] = 1n
    const marks = new Set(groups[i].map((q) => q.marks).filter((m) => m <= 80))
    for (let k = 1; k <= count; k++) {
      let bits = sums[i + 1][k]
      for (const m of marks) bits |= sums[i + 1][k - 1] << BigInt(m)
      sums[i][k] = bits & mask
    }
  }
  return {
    groups,
    fits: (i, k, marks) =>
      marks >= 0 && marks <= 80 && Boolean(sums[i][k] & (1n << BigInt(marks))),
  }
}
function select(pools, realCount, total, rng) {
  const real = placements(pools.real, realCount)
  const originalCount = total - realCount
  const original = placements(pools.original, originalCount)
  const ordered = [real, original]
  const targets = shuffled(
    Array.from({ length: 81 }, (_, i) => i),
    rng,
  )
    .filter(
      (m) =>
        real.fits(0, realCount, m) && original.fits(0, originalCount, 80 - m),
    )
    .sort(
      (a, b) =>
        Math.max(0, Math.abs(a - 40) - 10) - Math.max(0, Math.abs(b - 40) - 10),
    )
  const selected = [[], []]
  const used = new Set()
  const owners = new Map()
  const shared = new Set()
  for (const q of [...pools.real, ...pools.original]) {
    const key = q.historyKey ?? q.id
    if (owners.has(key) && owners.get(key) !== q.similarity) shared.add(key)
    owners.set(key, q.similarity)
  }
  const deadEnds = new Set()
  const levelCounts = [0, 0, 0]
  function choose(source, start, left, marks, topics, originalMarks) {
    if (!left) {
      if (source === 0)
        return choose(1, 0, originalCount, originalMarks, topics, originalMarks)
      return topics === 31 && levelCounts.every((n) => n > 0)
    }
    const { groups, fits } = ordered[source]
    const slots = left + (source === 0 ? originalCount : 0)
    if (
      themes.filter((_, i) => !(topics & (1 << i))).length > slots ||
      levelCounts.filter((n) => !n).length > slots
    )
      return false
    // Only openings shared across families can constrain a later placement.
    const sharedUsed = [...used].filter((key) => shared.has(key)).sort()
    const state = [
      source,
      start,
      left,
      marks,
      topics,
      originalMarks,
      ...levelCounts,
      ...sharedUsed,
    ].join('|')
    if (deadEnds.has(state)) return false
    for (let i = start; i <= groups.length - left; i++) {
      if (!fits(i, left, marks)) break
      for (const q of groups[i]) {
        const key = q.historyKey ?? q.id
        if (
          used.has(key) ||
          levelCounts[q.li] >= Math.ceil(total / 3) + 1 ||
          !fits(i + 1, left - 1, marks - q.marks)
        )
          continue
        used.add(key)
        selected[source].push(q)
        levelCounts[q.li]++
        if (
          choose(
            source,
            i + 1,
            left - 1,
            marks - q.marks,
            topics | q.t,
            originalMarks,
          )
        )
          return true
        levelCounts[q.li]--
        selected[source].pop()
        used.delete(key)
      }
    }
    deadEnds.add(state)
    return false
  }
  for (const m of targets) {
    if (!choose(0, 0, realCount, m, 0, 80 - m)) continue
    const [r, o] = selected.map((list) => shuffled(list, rng))
    const realFirst = r.length === o.length ? rng() < 0.5 : r.length > o.length
    const pair = realFirst ? [r, o] : [o, r]
    return Array.from({ length: total }, (_, i) => pair[i % 2].pop().id)
  }
  return null
}
export function hybrid(
  rows,
  paper,
  rng = Math.random,
  size = paper === 1 ? 12 : 5,
) {
  const pools = {}
  for (const o of ['real', 'original']) {
    pools[o] = candidates(
      rows.filter((q) => q.origin === o && q.paper === paper),
      rng,
    ).map((q) => ({
      ...q,
      t: 1 << themes.indexOf(q.theme),
      l: 1 << levels.indexOf(q.level),
      li: levels.indexOf(q.level),
    }))
  }
  const available = new Set(pools.real.map((q) => q.similarity)).size
  const missing = Math.max(0, Math.floor(size / 2) - available)
  const details = {
    paper,
    questions: size,
    availableReal: available,
    missingReal: missing,
  }
  if (missing)
    throw new Unavailable(
      `Faltan ${missing} preguntas reales distintas, revisadas y autorizadas para la Prueba ${paper}.`,
      details,
    )
  for (const n of shuffled(
    [...new Set([Math.floor(size / 2), Math.ceil(size / 2)])],
    rng,
  )) {
    if (n > available) continue
    const ids = select(pools, n, size, rng)
    if (ids) return ids
  }
  throw new Unavailable(
    'No se encontró una combinación de 80 puntos que cumpla la mezcla, los cinco temas y las dificultades. Se requiere revisión del banco.',
    details,
  )
}
export function practice(
  rows,
  config,
  rng = Math.random,
  lastFamily = new Map(),
  previousOrigin,
) {
  const pool = rows.filter(
    (q) =>
      q.paper === config.paper &&
      q.level === config.difficulty &&
      (!config.theme || q.theme === config.theme) &&
      (!config.subtopic || q.topic === config.subtopic),
  )
  if (!pool.length)
    throw new Unavailable(
      'No quedan ejercicios inéditos para esta selección. Prueba otro subtema o dificultad.',
      {
        paper: config.paper,
      },
    )
  // A large generated reserve must not bury the small reviewed collection.
  const preferred = previousOrigin === 'real' ? 'original' : 'real'
  const preferredPool = pool.filter((q) => q.origin === preferred)
  const choices = shuffled(
    preferredPool.length ? preferredPool : pool,
    rng,
  ).sort(
    (a, b) =>
      (lastFamily.get(a.similarity) ?? -1) -
      (lastFamily.get(b.similarity) ?? -1),
  )
  return choices[0].id
}
