import { funds } from './funds.mjs'
import { functions } from './functions.mjs'
import { land } from './land.mjs'
import { statistics } from './statistics.mjs'
import { calculus } from './calculus.mjs'
import { inputKinds, near } from './series.mjs'
import { structureKey, table } from '../model.mjs'
import { themes, levels } from '../../hybrid.mjs'

const subjects = new Map(
  themes.map((theme, i) => [
    theme,
    [funds, functions, land, statistics, calculus][i],
  ]),
)

export function compose(theme, level, draw, offset, rng) {
  const subject = subjects.get(theme),
    alternate = Number(draw % 3n)
  const goal = [
    [0, 1, 6],
    [2, 3, 7],
    [4, 5, 8],
  ][levels.indexOf(level)][alternate]
  // Each goal enumerates all multisets once. The shifts separate neighbouring
  // exercises without encoding the ticket, the seed or any number in the fingerprint.
  const rank = draw / 3n + BigInt((offset + alternate * 11) % 23)
  const kinds = inputKinds(rank, subject.sources.length)
  const forms = kinds.map((k) => subject.sources[k][0])
  const model = [subject.goals[goal], ['conditions', ...forms]]
  const key = 'serie-' + structureKey(model)
  const integer = (n) => Math.floor(rng() * n)
  const rows = kinds.map((k) => {
    const a = 3 + integer(7),
      b = 12 + integer(15),
      duration = 2 + integer(4)
    const [text, value, ref] = subject.sources[k][1](a, b, duration)
    return { text, value, ref, b, duration }
  })
  if (
    rows.some((r) => {
      if (subject === calculus) {
        const t = r.duration
        return !near(
          r.ref(t),
          (t * (r.value(0) + 4 * r.value(t / 2) + r.value(t))) / 6,
        )
      }
      if (subject === functions)
        return [0, 1, 3, 6, 10].some((t) => !near(r.value(t), r.ref(t)))
      return !near(r.value, r.ref)
    })
  )
    return null
  const task = subject.build(rows, goal, 3 + integer(7), 12 + integer(15))
  const methods = new Map()
  kinds.forEach((kind, i) => {
    const method = subject.methods[kind]
    if (!methods.has(method)) methods.set(method, [])
    methods.get(method).push(i + 1)
  })
  const steps = [
    ...Array.from(
      methods,
      ([method, indices]) =>
        (indices.length === 1 ? 'Fila ' : 'Filas ') +
        indices.join(', ') +
        '. ' +
        method,
    ),
    ...task.steps,
  ]
  const figure = table(
    subject.columns,
    rows.map((r, i) => {
      if (subject === calculus) return [i + 1, r.duration, r.text]
      if (subject === statistics) return [i + 1, r.b, r.text]
      return [i + 1, r.text]
    }),
  )
  return {
    topic: subject.title,
    level,
    theme,
    key,
    composed: true,
    unit: task.unit,
    build: () => ({ ...task, steps, figure }),
  }
}
