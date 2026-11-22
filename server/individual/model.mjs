import { createHash } from 'node:crypto'

export const digest = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
// A formula over mathematical roles, independent of context, coefficients, seed and
// difficulty. Fixed powers (square, cube) are operators; numerical data are leaves.
// These normal forms cover the operators used in the curated catalogue.
export function canonical(form) {
  if (typeof form === 'number') return 'coefficient'
  if (!Array.isArray(form)) return form
  const [op, ...args] = form
  if (op === 'subtract') return canonical(['add', args[0], ['negate', args[1]]])
  if (op === 'divide')
    return canonical(['multiply', args[0], ['reciprocal', args[1]]])
  if (op === 'square') return canonical(['multiply', args[0], args[0]])
  let terms = args.map(canonical)
  if (op === 'add' || op === 'multiply')
    terms = terms.flatMap((term) =>
      Array.isArray(term) && term[0] === op ? term.slice(1) : [term],
    )
  if (['add', 'multiply', 'equal', 'conditions'].includes(op))
    terms.sort((a, b) => {
      const x = JSON.stringify(a),
        y = JSON.stringify(b)
      return x < y ? -1 : x > y ? 1 : 0
    })
  return [op, ...terms]
}
export const structureKey = (form) => 'estructura-' + digest(canonical(form))
export const entry = (topic, level, unit, model, build) => ({
  topic,
  level,
  unit,
  model,
  key: structureKey(model),
  build,
})
export const close = (x, y) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  Math.abs(x - y) <= 1e-8 * Math.max(1, Math.abs(x), Math.abs(y))
export const f = (n) => Number(n.toPrecision(8)).toString()
export const item = (stem, ask, value, steps, check, figure) => ({
  stem,
  ask,
  value,
  steps,
  check,
  figure,
})
export const table = (headers, rows) => ({ type: 'table', headers, rows })
export const sum = (values) => values.reduce((s, x) => s + x, 0)
export const range = (n) => Array.from({ length: n }, (_, i) => i)
