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
  const template = [stem, ask].map((text) =>
    text
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[−+-]?\d+(?:[.,]\d+)*/g, '#')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  const patternKey =
    'patron-' + digest([...template, figure?.type, figure?.headers])
  return {
    ...q,
    id: 'i-' + content.slice(6),
    patternKey,
    historyKey: entry.key,
    wordingKey: content,
  }
}

export function individual(config, seen, rng) {
  const matching = structures.filter(
    (e) =>
      e.level === config.difficulty &&
      (!config.theme || e.theme === config.theme),
  )
  const fresh = shuffled(
    matching.filter((e) => !seen.has(e.key)),
    rng,
  )
  let failedVerification = false
  for (const e of fresh) {
    const q = materialize(
      e,
      3 + Math.floor(rng() * 7),
      12 + Math.floor(rng() * 15),
    )
    if (!q) failedVerification = true
    else if (!seen.has(q.wordingKey) && !seen.has(q.patternKey)) return q
  }
  if (failedVerification)
    throw new Unavailable(
      'No se pudo verificar una pregunta para esta selección. Vuelve a intentarlo.',
      { reason: 'verification' },
    )
  throw new Unavailable(
    'Has agotado los ejercicios diferentes disponibles para este tema y dificultad. Puedes elegir otro tema u otra dificultad.',
    { reason: 'exhausted' },
  )
}
