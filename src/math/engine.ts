import { applied } from './applied'
import { analysisFamilies } from './analysis'
import { shared } from './shared'
import { regression, binomial } from './technology'
import {
  calc,
  levels,
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
function available(c: Config) {
  return families.filter(
    (f) => f.courses.includes(c.course) && (f !== binomial || calc(c)),
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
function problem(f: Family, v: number, level: Level, r: Random): Problem {
  const ctx = f.make(r, v, level)
  return {
    family: f.id,
    variant: v,
    topic: f.topic,
    level,
    stem: ctx.stem + (level === 'Básico' ? ' ' + guidance[f.id] : ''),
    figure: ctx.figure,
    parts: ctx.tasks,
  }
}
export function exercise(c: Config, seed: number) {
  const r = random(seed),
    pool = available(c),
    f = pool[r(0, pool.length - 1)]
  const level = c.difficulty === 'Mixto' ? levels[r(0, 2)] : c.difficulty
  const q = problem(f, r(0, 1), level, r)
  const short = c.course === 'MAI' ? c.paper === 1 : r(0, 1) === 0
  return {
    ...q,
    parts: q.parts.slice(0, short ? (level === 'Básico' ? 2 : 3) : 5),
  }
}
// Search over complete prefixes, using each structure at most once per paper.
// Memoized failures depend only on position, slot and remaining marks. No mark is adjusted.
type Structure = { f: Family; v: number }
function assemble(
  pool: Structure[],
  levels: Level[],
  target: number,
  extended: boolean,
  r: Random,
): Problem[] {
  const failed = new Set<string>(),
    bank = new Map<string, Problem[]>()
  function select(
    index: number,
    slot: number,
    remaining: number,
  ): Problem[] | undefined {
    if (slot === levels.length) return remaining === 0 ? [] : undefined
    if (remaining <= 0 || pool.length - index < levels.length - slot) return
    const key = index + '-' + slot + '-' + remaining
    if (failed.has(key)) return
    const candidate = index + '-' + levels[slot]
    if (!bank.has(candidate)) {
      const { f, v } = pool[index],
        q = problem(f, v, levels[slot], r)
      bank.set(
        candidate,
        shuffle(extended ? [4, 5] : [2, 3], r).map((n) => ({
          ...q,
          parts: q.parts.slice(0, n),
        })),
      )
    }
    for (const q of bank.get(candidate)!) {
      const tail = select(index + 1, slot + 1, remaining - points(q))
      if (tail) return [q, ...tail]
    }
    const skipped = select(index + 1, slot, remaining)
    if (skipped) return skipped
    failed.add(key)
  }
  const questions = select(0, 0, target)
  if (!questions)
    throw Error('Las familias disponibles no cubren el baremo de la sección.')
  return questions
}
export function exam(c: Config, seed: number) {
  const r = random(seed),
    pool = available(c)
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
    const first = shuffle(pool, r).map((f) => {
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
        [...first, ...second],
        group,
        section.target,
        section.long,
        r,
      ),
    )
  }
  return result
}
