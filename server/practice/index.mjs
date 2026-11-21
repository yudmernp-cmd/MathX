import { createHash } from 'node:crypto'
import { algebra } from './algebra.mjs'
import { calculus } from './calculus.mjs'
import { functions } from './functions.mjs'
import { geometry } from './geometry.mjs'
import { statistics } from './statistics.mjs'
import { parameters } from './math.mjs'
import { adapt } from './adaptations.mjs'

const recipes = {
  ...algebra,
  ...functions,
  ...geometry,
  ...statistics,
  ...calculus,
}
export const supportsTopic = (topic) => Object.hasOwn(recipes, topic)
export function wordingKey(q) {
  return (
    'texto-' +
    createHash('sha256')
      .update(
        JSON.stringify([
          q.stem,
          q.figure ?? null,
          q.parts.map((p) => [p.ask, p.figure ?? null]),
          q.assets?.map((a) => [a.part, a.id]) ?? [],
        ]),
      )
      .digest('hex')
  )
}
export function continuation(entry, config, draw, offset, source) {
  const { a, b } = parameters(draw, offset)
  let q
  if (source) {
    q = adapt(source.question, source.key, a, b)
  } else {
    const { stem, figure, tasks } = recipes[entry.topic](a, b)
    const short = config.paper === 1
    const slots = {
      Fácil: short ? [0, 1] : [0, 1, 2],
      Medio: short ? [0, 2, 3] : [0, 1, 2, 3],
      Difícil: short ? [2, 3, 4] : [0, 1, 2, 3, 4],
    }[config.difficulty]
    q = {
      theme: entry.theme,
      topic: entry.topic,
      level: config.difficulty,
      family: entry.topic,
      origin: 'original',
      scheme: 'revisado',
      stem,
      figure,
      parts: slots.map((i) => tasks[i]),
      provenance: { course: 'MAI NM', paper: config.paper },
    }
  }
  const historyKey = wordingKey(q)
  return {
    ...q,
    generation: { version: 1, draw, offset },
    id: 'v-' + historyKey.slice(6),
    historyKey,
    variant: draw,
    generated: true,
    marks: q.parts.reduce((s, p) => s + (p.marks ?? p.rubric.length), 0),
  }
}
