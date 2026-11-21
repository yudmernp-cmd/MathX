import { loans } from './finance'
import { accumulation } from './accumulation'
import { exponential } from './functions'
import { transmission } from './transmission'
import { survey } from './survey'
import { voronoi } from './geometry'
import { tangents } from './tangents'
import { geometric } from './sequences'
import { referenceAnswers, verified } from './verification'
import { applied } from './applied'
import { analysisFamilies } from './analysis'
import { shared } from './shared'
import { regression, binomial, independence, normal } from './technology'
import {
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
  transmission,
  survey,
  voronoi,
  tangents,
  geometric,
  independence,
  normal,
  accumulation,
  loans,
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
export function practiceFamilies(config: Config) {
  return families.filter(
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
    origin: 'original',
    scheme: 'revisado',
    family: f.id,
    variant: v,
    theme: f.theme,
    topic: f.topic,
    level,
    stem:
      ctx.stem +
      (level === 'Fácil' && guidance[f.id] ? ' ' + guidance[f.id] : ''),
    figure: ctx.figure,
    parts: ctx.tasks,
  }
}
export function exercise(c: Config, seed: number) {
  const r = random(seed)
  const level = c.difficulty
  for (const f of shuffle(practiceFamilies(c), r)) {
    const v = r(0, 1)
    for (const variant of [v, 1 - v]) {
      const q = problem(f, variant, level, r, c)
      if (!q) continue
      const short = c.paper === 1
      const length = short
        ? level === 'Fácil'
          ? 2
          : 3
        : level === 'Fácil'
          ? 4
          : 5
      return { ...q, parts: q.parts.slice(0, length) }
    }
  }
  throw Error('No hay un ejercicio verificado para esta selección.')
}
