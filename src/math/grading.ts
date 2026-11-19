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
    if (t === 'sqrt' || t === 'raiz') {
      if (!take('(')) throw Error()
      const v = sum()
      if (!take(')')) throw Error()
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
      else if (['(', 'pi', 'sqrt', 'raiz'].includes(peek())) v *= unary()
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
export function correct(raw: string, value: number, percentage = false) {
  const s = raw.trim()
  const hasPercent = s.endsWith('%')
  const parsed = readNumber(hasPercent ? s.slice(0, -1) : s)
  const result =
    parsed !== null && hasPercent && !percentage ? parsed / 100 : parsed
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
