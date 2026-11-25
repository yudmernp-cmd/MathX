import { correct, readNumber } from './grading'
import { themes, type Config, type Problem, type Theme } from './model'
import type { Run } from './session'

export const drillNames = [
  'Número y Álgebra',
  'Funciones',
  'Geometría y Trigonometría',
  'Estadística y Probabilidad',
  'Cálculo',
]
export const drillThemeName = (t: Theme | undefined) =>
  drillNames[Math.max(0, themes.indexOf(t ?? themes[0]))]
export type Drill = {
  signature?: string
  tema: string
  subtema: string
  tipo_tarea: string
  dificultad: number
  instruccion: string
  expresion: string
  respuesta: string
  solucion_pasos: string[]
}
export async function drillRun(
  items: Drill[],
  config: Config,
  seed: number,
): Promise<Run> {
  const questions: Problem[] = await Promise.all(
    items.map(async (drill) => {
      const bytes = new TextEncoder().encode(
        JSON.stringify([drill.instruccion, drill.expresion]),
      )
      const hash = await crypto.subtle.digest('SHA-256', bytes)
      const id =
        'drill-' +
        Array.from(new Uint8Array(hash), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('')
      return {
        id,
        historyKey: id,
        wordingKey: id,
        generated: true,
        drill,
        family: drill.tipo_tarea,
        theme: config.theme ?? themes[0],
        variant: 0,
        topic: drill.subtema,
        level: config.difficulty,
        stem: drill.expresion,
        parts: [
          {
            ask: drill.instruccion,
            value: null,
            rubric: [],
            steps: drill.solucion_pasos,
          },
        ],
      }
    }),
  )
  return {
    mode: 'Ejercicios',
    config,
    questions,
    answers: {},
    notes: {},
    checked: false,
    finished: false,
    index: 0,
    deadline: 0,
    seed,
  }
}
// Convert the limited LaTeX emitted by the bank, and equivalent common keyboard notation.
function plain(s: string) {
  let t = s
    .trim()
    .replace(/\\(?:left|right)/g, '')
    .replace(/\\[,;! ]/g, '')
    .replace(/\\(?:cdot|times)|[·×]/g, '*')
    .replace(/\\div|[÷⁄]/g, '/')
    .replace(/\\[dt]frac/g, '\\frac')
    .replace(/\\pm/g, '±')
    .replace(/\\leq?|<=/g, '≤')
    .replace(/\\geq?|>=/g, '≥')
    .replace(/\\pi|π/g, 'pi')
    .replace(/\\infty|∞/g, 'inf')
    .replace(/\^?\\circ|°/g, '')
    .replace(/\\%/g, '%')
    .replace(/[−–]/g, '-')
    .replace(/\\([{}])/g, '$1')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
  for (let i = 0; i < 5; i++)
    t = t
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\^\{(-?\d+)\}/g, '^$1')
  return t.replace(/\s/g, '')
}
type Poly = number[]
const plus = (a: Poly, b: Poly, sign = 1) =>
  Array.from(
    { length: Math.max(a.length, b.length) },
    (_, i) => (a[i] ?? 0) + sign * (b[i] ?? 0),
  )
function times(a: Poly, b: Poly) {
  if (a.length + b.length > 40) throw Error()
  const c = Array(a.length + b.length - 1).fill(0)
  a.forEach((x, i) =>
    b.forEach((y, j) => {
      c[i + j] += x * y
    }),
  )
  return c
}
// y is encoded in degree 18 only when checking an affine line. Non-affine terms
// are rejected below. Supported functions of x in drills are polynomials.
function polynomial(input: string, affine = false): Poly {
  const txt = input.toLowerCase().replace(/,/g, '.')
  if (!txt || txt.length > 180) throw Error()
  const tokens = txt.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|./g) ?? []
  let j = 0
  const take = (s: string) => tokens[j] === s && (++j, true)
  function atom(): Poly {
    if (take('(')) {
      const r = sum()
      if (!take(')')) throw Error()
      return r
    }
    if (take('x')) return [0, 1]
    if (affine && take('y')) return [...Array(18).fill(0), 1]
    const n = tokens[j++]
    if (!n || !/^(?:\d|\.)/.test(n) || !Number.isFinite(Number(n)))
      throw Error()
    return [Number(n)]
  }
  function unary(): Poly {
    if (take('-')) return unary().map((x) => -x)
    if (take('+')) return unary()
    const a = atom()
    if (!take('^')) return a
    const n = Number(tokens[j++])
    if (!Number.isInteger(n) || n < 0 || n > 12) throw Error()
    if (affine && n > 1 && a.length > 1) throw Error()
    let r: Poly = [1]
    for (let i = 0; i < n; i++) r = times(r, a)
    return r
  }
  function product(): Poly {
    let p = unary()
    while (j < tokens.length) {
      if (take('/')) {
        const d = unary()
        if (d.length !== 1 || d[0] === 0) throw Error()
        p = p.map((x) => x / d[0])
      } else if (take('*') || ['x', 'y', '('].includes(tokens[j])) {
        const next = unary()
        if (affine && p.length > 1 && next.length > 1) throw Error()
        p = times(p, next)
      } else break
    }
    return p
  }
  function sum(): Poly {
    let p = product()
    while (['-', '+'].includes(tokens[j])) {
      const s = tokens[j++]
      p = plus(p, product(), s === '-' ? -1 : 1)
    }
    return p
  }
  const p = sum()
  if (j !== tokens.length || p.some((n) => !Number.isFinite(n))) throw Error()
  return p
}
const equal = (x: number, y: number) =>
  Number.isFinite(x) && Number.isFinite(y) &&
  Math.abs(x - y) <= 1e-10 * Math.max(1, Math.abs(x), Math.abs(y))
function relation(s: string) {
  const expression = s.replace(/^f\(x\)=/i, 'y=')
  const eq = expression.includes('=') ? expression : 'y=' + expression
  const [lhs, rhs, ...extra] = eq.split('=')
  if (extra.length || !rhs) throw Error()
  const p = plus(polynomial(lhs, true), polynomial(rhs, true), -1)
  if (!p[18] || p.some((v, i) => i !== 0 && i !== 1 && i !== 18 && v !== 0))
    throw Error()
  return [-(p[0] ?? 0) / p[18], -(p[1] ?? 0) / p[18]]
}
function splitValues(s: string) {
  return s.split(s.includes(';') ? ';' : ',')
}
function interval(s: string) {
  const value = s.toLowerCase().replace(/^[xy]∈/, '')
    .replace(/infinito|infinity/g, 'inf').replace(/\+inf/g, 'inf')
  const terms = value.split(/([<>≤≥])/)
  if (terms.length === 1) {
    const open = value[0] === ']' ? '(' : value[0]
    const end = value.at(-1) === '[' ? ')' : value.at(-1)
    const bounds = splitValues(value.slice(1, -1))
    if (bounds.length !== 2 || !['(', '['].includes(open) || ![')', ']'].includes(end ?? ''))
      throw Error()
    return { open, end, bounds }
  }
  // Put inequalities in increasing order, including reversed chains such as 3 ≥ x > 1.
  if (terms[1] === '>' || terms[1] === '≥') {
    terms.reverse()
    for (let i = 1; i < terms.length; i += 2) {
      if (terms[i] !== '>' && terms[i] !== '≥') throw Error()
      terms[i] = terms[i] === '>' ? '<' : '≤'
    }
  }
  if (terms.length === 3) {
    if (/^[xy]$/.test(terms[0])) terms.unshift('-inf', '<')
    else terms.push('<', 'inf')
  }
  const [lo, left, variable, right, hi] = terms
  if (terms.length !== 5 || !/^[xy]$/.test(variable) ||
      !['<', '≤'].includes(left) || !['<', '≤'].includes(right)) throw Error()
  return { open: left === '<' ? '(' : '[', end: right === '<' ? ')' : ']', bounds: [lo, hi] }
}
function components(s: string, roots: boolean) {
  if (roots) {
    s = s.replace(/^x∈/i, '')
  }
  if ((s.startsWith('(') && s.endsWith(')')) || (roots && s.startsWith('{') && s.endsWith('}')))
    s = s.slice(1, -1)
  if (!roots) return splitValues(s).map(readNumber)
  if (s.includes('±')) {
    const expression = s.replace(/^x=/i, '')
    return ['+', '-'].map(sign => readNumber(expression.replace('±', sign)))
  }
  return splitValues(s).map(part => readNumber(part.replace(/^x=/i, '')))
}
export function acceptsDrill(q: Drill, raw: string): boolean {
  try {
    if (!raw.trim() || raw.length > 200) return false
    let t = plain(q.respuesta)
    let s = plain(t.startsWith('{') ? raw.replace(/\s+o\s+/gi, ';') : raw)
    if (q.tipo_tarea === 'notacion_cientifica') {
      const m = s.match(
        /^([1-9](?:[.,]\d+)?)(?:\*10\^\(?([+-]?\d+)\)?|e([+-]?\d+))$/i,
      )
      if (!m) return false
      if (
        q.instruccion.includes('dos cifras') &&
        m[1].replace(/[.,]/g, '').length !== 2
      )
        return false
    }
    if (t.includes('inf') || t.startsWith('[')) {
      const actual = interval(s), target = interval(t)
      if (actual.open !== target.open || actual.end !== target.end) return false
      const b = target.bounds
      return (
        actual.bounds.every((v, i) => {
          if (v === b[i]) return true
          const x = readNumber(v),
            y = readNumber(b[i])
          return x !== null && y !== null && equal(x, y)
        })
      )
    }
    if (t.startsWith('{') || (t.startsWith('(') && t.includes(','))) {
      const unordered = t.startsWith('{')
      const a = components(s, unordered), b = components(t, unordered)
      if (
        a.length !== b.length ||
        a.some((x) => x === null) ||
        b.some((x) => x === null)
      )
        return false
      if (unordered) {
        a.sort((x, y) => x! - y!)
        b.sort((x, y) => x! - y!)
      }
      return a.every((v, i) => equal(v!, b[i]!))
    }
    if (q.tipo_tarea === 'bearing_a_rumbo' || /^[ABC]$/.test(t))
      return s.toUpperCase().replace('W', 'O') === t
    if (t.startsWith('y=')) {
      const a = relation(s),
        b = relation(t)
      return a.every((v, i) => equal(v, b[i]))
    }
    if (t.includes('x') || t.endsWith('+C')) {
      s = s.replace(/^(?:f(?:'|\^-1)?\(x\)|y)=/i, '')
      const integral = t.endsWith('+C')
      if (integral) {
        if (!/\+c$/i.test(s)) return false
        s = s.slice(0, -2)
        t = t.slice(0, -2)
      }
      const d = plus(polynomial(s), polynomial(t), -1)
      return d.every((v, i) => (integral && i === 0) || equal(v, 0))
    }
    const pct = t.endsWith('%')
    if (pct) t = t.slice(0, -1)
    const target = readNumber(t)
    if (target === null) return false
    if (correct(s, target, pct)) return true
    const parsed = readNumber(s.replace(/%$/, ''))
    return (
      parsed !== null &&
      (!s.endsWith('%') || pct) &&
      Math.abs(parsed - target) <= 5e-12 * Math.abs(target)
    )
  } catch {
    return false
  }
}
