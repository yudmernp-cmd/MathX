import { exponential } from './functions'
import { voronoi, sectors } from './geometry'
import { tangents, motion } from './tangents'
import { geometric } from './sequences'
import { referenceAnswers, verified } from './verification'
import { applied } from './applied'
import { analysisFamilies } from './analysis'
import { shared } from './shared'
import { regression, binomial, independence, normal } from './technology'
import {
  calc,
  levels,
  themes,
  type Theme,
  points,
  random,
  type Config,
  type Family,
  type Problem,
  type Level,
  type Random,
} from './model'

export const families = [
  ...applied,
  ...shared,
  ...analysisFamilies,
  regression,
  binomial,
  exponential,
  voronoi,
  sectors,
  tangents,
  geometric,
  independence,
  motion,
  normal,
]
export const duration = 90 * 60 * 1000
export const signature = (p: Problem) => p.family + '-' + p.variant
function shuffle<T>(items: T[], r: Random) {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = r(0, i)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
export function courseFamilies(c: Config) {
  return families.filter(
    (f) =>
      f.courses.includes(c.course) &&
      (calc(c) || (f !== binomial && f !== normal)),
  )
}
export function practiceFamilies(config: Config) {
  return courseFamilies(config).filter(
    (f) =>
      (!config.theme || f.theme === config.theme) &&
      (!config.subtopic || f.id === config.subtopic),
  )
}
const guidance: Record<string, string> = {
  tarifas: 'Usa coste = cuota fija + tarifa × horas.',
  capital:
    'Para una tasa anual r expresada en decimal, el factor anual es 1 + r.',
  muestras:
    'Multiplica cada tiempo por su frecuencia antes de sumar para la media.',
  condicional:
    'En una probabilidad condicionada, empieza por contar las personas que cumplen la condición.',
  triangulos:
    'Dibuja y rotula el triángulo rectángulo. El cable es la hipotenusa.',
  deposito: 'Una tasa de cambio positiva indica que el volumen crece.',
  sucesion: 'Puedes usar $u_n=u_1+(n-1)d$.',
  parabola:
    'El eje de simetría pasa por el vértice y por el punto medio entre las raíces.',
  ajuste:
    'En la recta de ajuste utiliza temperatura como variable explicativa.',
  lotes: 'Para una binomial, $P(X=0)=(1-p)^n$.',
}
function problem(
  f: Family,
  v: number,
  level: Level,
  r: Random,
  c: Config,
): Problem | null {
  const seed = r(0, 0xffffffff)
  const ctx = f.make(random(seed), v, level, c)
  if (!verified(ctx, referenceAnswers(f.id, random(seed), v, level, c)))
    return null
  return {
    family: f.id,
    variant: v,
    theme: f.theme,
    topic: f.topic,
    level,
    stem:
      ctx.stem +
      (level === 'Básico' && guidance[f.id] ? ' ' + guidance[f.id] : ''),
    figure: ctx.figure,
    parts: ctx.tasks,
  }
}
export function exercise(c: Config, seed: number) {
  const r = random(seed)
  const level = c.difficulty === 'Mixto' ? levels[r(0, 2)] : c.difficulty
  for (const f of shuffle(practiceFamilies(c), r)) {
    const v = r(0, 1)
    for (const variant of [v, 1 - v]) {
      const q = problem(f, variant, level, r, c)
      if (!q) continue
      const short = c.course === 'MAI' ? c.paper === 1 : r(0, 1) === 0
      const length = short
        ? level === 'Básico'
          ? 2
          : 3
        : level === 'Básico'
          ? 4
          : 5
      return { ...q, parts: q.parts.slice(0, length) }
    }
  }
  throw Error('No hay un ejercicio verificado para esta selección.')
}
// Search over complete prefixes, using each structure at most once per paper.
// Memoized failures depend only on position, slot, remaining marks and missing themes. No mark is adjusted.
type Structure = { f: Family; v: number }
function assemble(
  c: Config,
  pool: Structure[],
  levels: Level[],
  target: number,
  extended: boolean,
  required: readonly Theme[],
  r: Random,
): Problem[] {
  const failed = new Set<string>(),
    bank = new Map<string, Problem[]>()
  function select(
    index: number,
    slot: number,
    remaining: number,
    missing: readonly Theme[],
  ): Problem[] | undefined {
    if (slot === levels.length)
      return remaining === 0 && !missing.length ? [] : undefined
    if (
      levels.length - slot < missing.length ||
      remaining <= 0 ||
      pool.length - index < levels.length - slot
    )
      return
    const key = index + '-' + slot + '-' + remaining + '-' + missing.join(',')
    if (failed.has(key)) return
    const candidate = index + '-' + levels[slot]
    if (!bank.has(candidate)) {
      const { f, v } = pool[index],
        q = problem(f, v, levels[slot], r, c)
      bank.set(
        candidate,
        q
          ? shuffle(extended ? [4, 5] : [2, 3], r).map((n) => ({
              ...q,
              parts: q.parts.slice(0, n),
            }))
          : [],
      )
    }
    for (const q of bank.get(candidate)!) {
      const tail = select(
        index + 1,
        slot + 1,
        remaining - points(q),
        missing.filter((t) => t !== q.theme),
      )
      if (tail) return [q, ...tail]
    }
    const skipped = select(index + 1, slot, remaining, missing)
    if (skipped) return skipped
    failed.add(key)
  }
  const questions = select(0, 0, target, required)
  if (!questions)
    throw Error('Las familias disponibles no cubren el baremo de la sección.')
  return questions
}
export function exam(c: Config, seed: number) {
  const r = random(seed),
    pool = courseFamilies(c)
  const sections =
    c.course === 'MAE'
      ? [
          { n: 6, target: 40, long: false },
          { n: 3, target: 40, long: true },
        ]
      : c.paper === 1
        ? [{ n: 12, target: 80, long: false }]
        : [{ n: 6, target: 80, long: true }]
  const count = sections.reduce((sum, s) => sum + s.n, 0)
  const difficulties: Level[] = []
  while (difficulties.length < count) difficulties.push(...shuffle(levels, r))
  const result: Problem[] = []
  for (const section of sections) {
    const order = shuffle(pool, r)
    const byTheme = new Map<string, Family[]>()
    for (const f of order)
      byTheme.set(f.theme, [...(byTheme.get(f.theme) || []), f])
    const groups = [...byTheme.values()]
    const ordered: Family[] = []
    while (groups.some((g) => g.length))
      for (const group of groups) if (group.length) ordered.push(group.shift()!)
    const first = ordered.map((f) => {
      const prior = result.find((q) => q.family === f.id)
      return { f, v: prior ? 1 - prior.variant : r(0, 1) }
    })
    const second =
      section.n > pool.length
        ? shuffle(first, r).map(({ f, v }) => ({ f, v: 1 - v }))
        : []
    const group = Array.from({ length: section.n }, (_, i) =>
      c.difficulty === 'Mixto'
        ? difficulties[result.length + i]
        : (c.difficulty as Level),
    )
    result.push(
      ...assemble(
        c,
        [...first, ...second],
        group,
        section.target,
        section.long,
        result.length ? [] : themes,
        r,
      ),
    )
  }
  return result
}
