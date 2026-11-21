export type Course = 'MAI'
export type Paper = 1 | 2
export type Level = 'Fácil' | 'Medio' | 'Difícil'
export const levels: Level[] = ['Fácil', 'Medio', 'Difícil']
export type Difficulty = Level
export const themes = [
  'Números y álgebra',
  'Funciones',
  'Geometría y trigonometría',
  'Estadística y probabilidad',
  'Análisis matemático',
] as const
export type Theme = (typeof themes)[number]
export type Config = {
  course: Course
  paper: Paper
  difficulty: Difficulty
  theme?: Theme
  subtopic?: string
}
export type Part = {
  ask: string
  value: number | null
  steps: string[]
  rubric: string[]
  marks?: number
  label?: string
  figure?: Figure
  percentage?: boolean
}
export type Figure =
  | {
      type: 'solid'
      shape: 'sector' | 'hemisphere' | 'fold' | 'scoop'
      radius: number
      unit: string
    }
  | { type: 'table'; headers: string[]; rows: (number | string)[][] }
  | {
      type: 'graph' | 'curve'
      x: string
      y: string
      points: [number, number][]
    }
export type Problem = {
  id?: string
  historyKey?: string
  origin?: 'original' | 'real' | 'adapted'
  generated?: boolean
  wordingKey?: string
  scheme?: 'revisado' | 'sin esquema'
  assets?: { id: string; part: number; alt: string }[]
  provenance?: {
    year?: number
    session?: string
    number?: number
    pages?: number[]
  }
  family: string
  theme: Theme
  variant: number
  topic: string
  level: Level
  stem: string
  parts: Part[]
  figure?: Figure
}
export type Random = (min: number, max: number) => number
export function random(seed: number): Random {
  let state = seed >>> 0
  return (min, max) => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (
      min +
      Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (max - min + 1))
    )
  }
}
export const fmt = (n: number) =>
  Number(n.toPrecision(8)).toLocaleString('es-PE', {
    maximumSignificantDigits: 8,
    useGrouping: false,
  })
export const points = (p: Problem) =>
  p.parts.reduce((n, s) => n + (s.marks ?? s.rubric.length), 0)
export const partMarks = (p: Part) => p.marks ?? p.rubric.length
export type Context = { stem: string; figure?: Figure; tasks: Part[] }
export type Family = {
  id: string
  topic: string
  theme: Theme
  courses: Course[]
  make: (r: Random, variant: number, level: Level, config?: Config) => Context
}
// Every criterion is worth one mark. The last criterion of a closed part is its final answer.
export function numberPart(
  ask: string,
  value: number,
  steps: string[],
  criteria: string[],
): Part {
  return {
    ask,
    value,
    steps: [...steps, 'Resultado: $' + fmt(value) + '$.'],
    rubric: [...criteria, 'Obtiene el resultado correcto.'],
  }
}
export const review = (
  ask: string,
  steps: string[],
  rubric: string[],
): Part => ({ ask, value: null, steps, rubric })
