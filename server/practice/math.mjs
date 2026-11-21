// Work with a bounded multiplier and a gradually growing base. Each draw gives a
// different pair. The coprime multiplier permutes each block of 330 pairs.
export function parameters(draw, offset = 0) {
  const position = (73 * (draw % 330) + (offset % 330)) % 330
  return {
    a: 2 + (position % 11),
    b: 12 + Math.floor(position / 11) + 30 * Math.floor(draw / 330),
  }
}
// Reversing the digits puts successive integer inputs inside one unit while
// keeping every finite decimal distinct (e.g. 12 -> .21 and 120 -> .021).
export const fraction = (integer) =>
  Number('0.' + String(integer).split('').reverse().join(''))
export const fmt = (n) => Number(n.toPrecision(9)).toString()
export function task(ask, value, steps, criteria) {
  if (value !== null && !Number.isFinite(value))
    throw Error('Resultado no finito.')
  return {
    ask,
    value,
    steps: [
      ...steps,
      ...(value === null ? [] : ['Resultado: $' + fmt(value) + '$.']),
    ],
    rubric: [...criteria, ...(value === null ? [] : ['Obtiene el resultado.'])],
  }
}
export const numeric = (ask, value, method) =>
  task(ask, value, [method], [method])
export const explain = (ask, solution) =>
  task(ask, null, [solution], [solution])
export const total = (values) => values.reduce((s, x) => s + x, 0)
export const mean = (values) => total(values) / values.length
export function binomial(n, k, p) {
  let combinations = 1
  for (let j = 1; j <= k; j++) combinations *= (n - j + 1) / j
  return combinations * p ** k * (1 - p) ** (n - k)
}
// Simpson quadrature of smooth densities on a finite interval.
function integral(f, lo, hi) {
  const steps = 256,
    h = (hi - lo) / steps
  let s = f(lo) + f(hi)
  for (let j = 1; j < steps; j++) s += (j % 2 ? 4 : 2) * f(lo + j * h)
  return (s * h) / 3
}
export function normalCdf(z) {
  if (z >= 9) return 1
  if (z <= -9) return 0
  return (
    0.5 + integral((t) => Math.exp((-t * t) / 2), 0, z) / Math.sqrt(2 * Math.PI)
  )
}
export function studentCdf(t, df) {
  const density = (u) => Math.cos(u) ** (df - 1)
  return (
    integral(density, -Math.PI / 2, Math.atan(t / Math.sqrt(df))) /
    integral(density, -Math.PI / 2, Math.PI / 2)
  )
}
