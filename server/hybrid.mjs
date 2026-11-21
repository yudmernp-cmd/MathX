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
    const key = [q.similarity, q.theme, q.level, q.marks].join('|')
    if (!choices.has(key)) choices.set(key, q)
  }
  return [...choices.values()]
}
function select(pools, realCount, total, rng) {
  const order = shuffled(
    [
      ...Array(realCount).fill('real'),
      ...Array(total - realCount).fill('original'),
    ],
    rng,
  )
  const reachable = Array.from({ length: total + 1 }, () => new Set())
  reachable[total].add(0)
  for (let i = total - 1; i >= 0; i--) {
    for (const m of new Set(pools[order[i]].map((q) => q.marks)))
      for (const rest of reachable[i + 1]) {
        if (m + rest <= 80) reachable[i].add(m + rest)
      }
  }
  const seen = new Set(),
    openings = new Set(),
    selected = [],
    levelCounts = [0, 0, 0]

  let remainingNodes = 35000
  function step(i, marks, topicMask, levelMask, realMarks, tolerance) {
    if (!reachable[i].has(80 - marks)) return false
    if (i === total)
      return (
        marks === 80 &&
        topicMask === 31 &&
        levelMask === 7 &&
        Math.abs(realMarks - 40) <= tolerance
      )
    if (--remainingNodes <= 0) return false
    const left = total - i
    const missing = themes.filter((_, k) => !(topicMask & (1 << k))).length
    if (left < missing || marks >= 80) return false
    const origin = order[i]
    // Prefer a missing topic, then a missing level; random order breaks ties.
    const options = pools[origin].filter(
      (q) =>
        !seen.has(q.similarity) &&
        !openings.has(q.historyKey ?? q.id) &&
        reachable[i + 1].has(80 - marks - q.marks) &&
        levelCounts[q.li] < Math.ceil(total / 3) + 1,
    )
    const priority = (q) =>
      Number(!(topicMask & q.t)) * 10 -
      2 * levelCounts[q.li] -
      Math.abs(q.marks - (80 - marks) / left) / 8
    options.sort((a, b) => priority(b) - priority(a))
    for (const q of options) {
      if (remainingNodes <= 0) break
      const next = marks + q.marks
      if (i + 1 === total && next !== 80) continue
      seen.add(q.similarity)
      openings.add(q.historyKey ?? q.id)
      selected.push(q)
      levelCounts[q.li]++
      if (
        step(
          i + 1,
          next,
          topicMask | q.t,
          levelMask | q.l,
          realMarks + (origin === 'real' ? q.marks : 0),
          tolerance,
        )
      )
        return true
      selected.pop()
      seen.delete(q.similarity)
      openings.delete(q.historyKey ?? q.id)
      levelCounts[q.li]--
    }
    return false
  }
  for (const tolerance of [10, 40]) {
    remainingNodes = 35000
    if (step(0, 0, 0, 0, 0, tolerance)) {
      // Alternation prevents large consecutive blocks of either source.
      const real = shuffled(
        selected.filter((q) => q.origin === 'real'),
        rng,
      )
      const orig = shuffled(
        selected.filter((q) => q.origin === 'original'),
        rng,
      )
      const realFirst =
        real.length === orig.length ? rng() < 0.5 : real.length > orig.length
      const pair = realFirst ? [real, orig] : [orig, real]
      return Array.from({ length: total }, (_, i) => pair[i % 2].pop().id)
    }
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
  const choices = shuffled(pool, rng).sort(
    (a, b) =>
      (lastFamily.get(a.similarity) ?? -1) -
      (lastFamily.get(b.similarity) ?? -1),
  )
  return choices[0].id
}
