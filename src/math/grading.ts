// A bounded arithmetic grammar. Inputs are numbers or closed expressions, never executable code.
export function readNumber(raw: string): number | null {
  if (!raw.trim() || raw.length > 180) return null
  const normal = raw
    .trim()
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/√\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/√/g, 'sqrt')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
  const tokens =
    normal.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[^\s]/g) || []
  let i = 0
  const peek = () => tokens[i] ?? ''
  const take = (s: string) => peek() === s && (i++, true)
  function atom(): number {
    const t = tokens[i++]
    if (t === '(') {
      const v = sum()
      if (!take(')')) throw Error()
      return v
    }
    if (t === 'pi') return Math.PI
    if (['sqrt', 'raiz', 'ln', 'log', 'sen', 'sin', 'cos', 'tan'].includes(t)) {
      if (!take('(')) throw Error()
      const v = sum()
      if (!take(')')) throw Error()
      if (t === 'sen' || t === 'sin') return Math.sin(v)
      if (t === 'cos') return Math.cos(v)
      if (t === 'tan') return Math.tan(v)
      if (t === 'ln') return Math.log(v)
      if (t === 'log') return Math.log10(v)
      return Math.sqrt(v)
    }
    if (!t || !/^\d|^\.\d/.test(t)) throw Error()
    return Number(t)
  }
  function unary(): number {
    if (take('-')) return -unary()
    if (take('+')) return unary()
    const base = atom()
    return take('^') ? base ** unary() : base
  }
  function product() {
    let v = unary()
    while (i < tokens.length) {
      if (take('*')) v *= unary()
      else if (take('/')) v /= unary()
      else if (
        [
          '(',
          'pi',
          'sqrt',
          'raiz',
          'ln',
          'log',
          'sen',
          'sin',
          'cos',
          'tan',
        ].includes(peek())
      )
        v *= unary()
      else break
    }
    return v
  }
  function sum() {
    let v = product()
    while (peek() === '+' || peek() === '-') {
      const op = tokens[i++],
        x = product()
      v += op === '+' ? x : -x
    }
    return v
  }
  try {
    const value = sum()
    return i === tokens.length && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}
// Strip only the requested unit and its spellings. Unknown dimensions remain
// unparseable, while a bare number still uses the unit named in the question.
const unitSuffix: Record<string, RegExp> = {
  PEN: /\s*(?:sol(?:es)?|pen|s\/)$/iu,
  USD: /\s*(?:dólar(?:es)?|usd)$/iu,
  m: /\s*(?:metros?|m)$/iu,
  cm: /\s*(?:centímetros?|cm)$/iu,
  km: /\s*(?:kilómetros?|km)$/iu,
  mm: /\s*(?:milímetros?|mm)$/iu,
  'cm²': /\s*(?:centímetros? cuadrados?|cm(?:²|\^?2))$/iu,
  'L/min': /\s*(?:l\s*\/\s*min|litros? por minuto)$/iu,
  'm²': /\s*(?:metros? cuadrados?|m(?:²|\^?2))$/iu,
  kg: /\s*(?:kilogramos?|kg)$/iu,
  'm³': /\s*(?:metros? cúbicos?|m(?:³|\^?3))$/iu,
  'cm³': /\s*(?:centímetros? cúbicos?|cm(?:³|\^?3))$/iu,
  '°': /\s*(?:grados?|°)$/iu,
  L: /\s*(?:litros?|l)$/iu,
  g: /\s*(?:gramos?|g)$/iu,
  min: /\s*(?:minutos?|min)$/iu,
  h: /\s*(?:horas?|h)$/iu,
  s: /\s*(?:segundos?|s)$/iu,
  'm/s': /\s*(?:m\s*\/\s*s|metros? por segundo)$/iu,
  'L/h': /\s*(?:l\s*\/\s*h|litros? por hora)$/iu,
  días: /\s*días?$/iu,
  años: /\s*años?$/iu,
  asientos: /\s*asientos?$/iu,
  muestras: /\s*muestras?$/iu,
  mediciones: /\s*(?:medición|mediciones)$/iu,
  semillas: /\s*semillas?$/iu,
  libros: /\s*libros?$/iu,
}
export function answerNumber(raw: string, percentage = false, unit?: string) {
  let s = raw.trim()
  if (unit === 'PEN') s = s.replace(/^s\/\.?\s*/i, '')
  if (unit && unitSuffix[unit]) s = s.replace(unitSuffix[unit], '')
  const hasPercent = s.endsWith('%')
  if (hasPercent && unit && unit !== '%') return null
  const parsed = readNumber(hasPercent ? s.slice(0, -1) : s)
  return parsed !== null && hasPercent && !percentage ? parsed / 100 : parsed
}
export function correct(
  raw: string,
  value: number,
  percentage = false,
  unit?: string,
) {
  const result = answerNumber(raw, percentage, unit)
  if (result === null) return false
  // Accept exact evaluation or the target rounded to three or more significant figures.
  return [
    value,
    ...Array.from({ length: 12 }, (_, i) => Number(value.toPrecision(i + 3))),
  ].some(
    (n) =>
      Math.abs(n - result) <=
      16 *
        Number.EPSILON *
        Math.max(Math.abs(n), Math.abs(result), Number.MIN_VALUE),
  )
}
