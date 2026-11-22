import { compose } from './composition/index.mjs'
import { algebra } from './algebra.mjs'
import { functions } from './functions.mjs'
import { geometry } from './geometry.mjs'
import { statistics } from './statistics.mjs'
import { calculus } from './calculus.mjs'
import { themes, shuffled, Unavailable } from '../hybrid.mjs'
import { wordingKey } from '../practice/index.mjs'
import { digest, f } from './model.mjs'

export const structures = [
  algebra,
  functions,
  geometry,
  statistics,
  calculus,
].flatMap((group, i) => group.map((entry) => ({ ...entry, theme: themes[i] })))

export function materialize(entry, a, b) {
  const { stem, ask, value, steps, check, figure } = entry.build(a, b)
  if (
    !stem ||
    !ask ||
    !Number.isFinite(value) ||
    steps.length < 2 ||
    !check(value)
  )
    return null
  const q = {
    theme: entry.theme,
    topic: entry.topic,
    level: entry.level,
    stem,
    figure,
    origin: 'original',
    family: entry.theme,
    individual: true,
    generated: true,
    scheme: 'revisado',
    structureKey: entry.key,
    ...(entry.composed && { composed: true }),
    variant: 0,
    parts: [
      {
        ask,
        value,
        unit: entry.unit,
        percentage: entry.unit === '%',
        steps: [...steps, `Resultado: $${f(value)}$.`],
        marks: 1,
        rubric: [],
      },
    ],
  }
  const content = wordingKey(q)
  // Also catch a future duplicate template whose semantic annotation was mistyped.
  const textFields = [stem, ask]
  if (entry.composed)
    textFields.push(...figure.rows.flatMap((row) => row.map(String)))
  const template = textFields.map((text) =>
    text
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[−+-]?\d+(?:[.,]\d+)*/g, '#')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  const patternKey =
    (entry.composed ? 'serie-patron-' : 'patron-') +
    digest([...template, figure?.type, figure?.headers])
  return {
    ...q,
    id: 'i-' + content.slice(6),
    patternKey,
    historyKey: entry.key,
    wordingKey: content,
  }
}

export function individual(config, seen, rng, draw, offset) {
  const matching = structures.filter(
    (e) =>
      e.level === config.difficulty &&
      (!config.theme || e.theme === config.theme),
  )
  const fresh = shuffled(
    matching.filter((e) => !seen.has(e.key)),
    rng,
  )
  for (const e of fresh) {
    const q = materialize(
      e,
      3 + Math.floor(rng() * 7),
      12 + Math.floor(rng() * 15),
    )
    if (q && !seen.has(q.wordingKey) && !seen.has(q.patternKey)) return q
  }
  const theme = config.theme || themes[Math.floor(rng() * themes.length)]
  // Old clients may explicitly send a composed shape as seen. Skip ahead
  // without discarding any history. Normally the browser already owns a unique ticket.
  let invalid = 0
  for (let rank = BigInt(draw); invalid < 12; rank++) {
    const recipe = compose(theme, config.difficulty, rank, offset, rng)
    const q = recipe && materialize(recipe)
    if (!q) {
      invalid++
      continue
    }
    if (
      !seen.has(q.structureKey) &&
      !seen.has(q.wordingKey) &&
      !seen.has(q.patternKey)
    )
      return q
  }
  throw new Unavailable(
    'No se pudo verificar una pregunta. Vuelve a intentarlo.',
    { reason: 'verification' },
  )
}
