// Count unordered selections exactly, even for a long-lived browser counter.
// Every shape uses at least two different kinds of mathematical evidence.
// Sorting removes permutations before they can be offered as new problems.
function choose(n, k) {
  let result = 1n
  for (let i = 1; i <= k; i++) result = (result * BigInt(n - i + 1)) / BigInt(i)
  return result
}
export function inputKinds(rank, kinds) {
  let length = 2
  for (; ; length++) {
    const count = choose(length + kinds - 1, kinds - 1) - BigInt(kinds)
    if (rank < count) break
    rank -= count
  }
  for (let lo = 0; lo < kinds - 1; lo++) {
    for (let hi = lo + 1; hi < kinds; hi++) {
      const count = choose(length - 2 + hi - lo, hi - lo)
      if (rank >= count) {
        rank -= count
        continue
      }
      const result = [lo]
      let min = lo
      for (let left = length - 2; left > 0; left--) {
        for (let next = min; next <= hi; next++) {
          const suffix = choose(left - 1 + hi - next, hi - next)
          if (rank < suffix) {
            result.push(next)
            min = next
            break
          }
          rank -= suffix
        }
      }
      return [...result, hi]
    }
  }
  throw Error('Índice combinatorio inválido.')
}
export const fmt = (n) => Number(n.toPrecision(9)).toString()
export const sum = (xs) => xs.reduce((s, x) => s + x, 0)
export const near = (x, y) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  Math.abs(x - y) <= 1e-8 * Math.max(1, Math.abs(x), Math.abs(y))
// Monotone on the interval; the caller independently checks the root in the model.
export function invert(fn, target, lo, hi) {
  for (let i = 0; i < 56; i++) {
    const mid = (lo + hi) / 2
    if (fn(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
export const result = (ask, value, unit, steps, check) => ({
  ask,
  value,
  unit,
  steps,
  check,
})
