export const fmt = (n) => String(Number(n.toPrecision(12)))
export function frac(a, b) {
  if (b < 0) return frac(-a, -b)
  let x = Math.abs(a),
    y = b
  while (y) {
    ;[x, y] = [y, x % y]
  }
  return b === x
    ? String(a / x)
    : `${a < 0 ? '-' : ''}\\frac{${Math.abs(a) / x}}{${b / x}}`
}
export const root = (n) =>
  Number.isInteger(Math.sqrt(n)) ? String(Math.sqrt(n)) : `\\sqrt{${n}}`
export const form = (instruccion, expresion, respuesta, ...solucion_pasos) => ({
  instruccion,
  expresion,
  respuesta: String(respuesta),
  solucion_pasos,
})
export const sub = (name, types) => ({ name, types })
export function poly(terms) {
  return (
    terms
      .filter(([c]) => c !== 0)
      .map(([c, k], i) => {
        const m = Math.abs(c)
        return (
          (c < 0 ? '-' : i ? '+' : '') +
          (m === 1 && k ? '' : m) +
          (k === 0 ? '' : k === 1 ? 'x' : `x^{${k}}`)
        )
      })
      .join('') || '0'
  )
}
export const line = (m, b) =>
  'y=' +
  poly([
    [m, 1],
    [b, 0],
  ])
export const row = (...xs) => `(${xs.join(',')})`
