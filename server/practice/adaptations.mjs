// The private bank supplies the approved Spanish text. Each key pins the full
// wording and part order to the edition for which the substitutions were checked.
import { createHash } from 'node:crypto'
import { task } from './math.mjs'
import { paper1 } from './paper1.mjs'
import { paper2 } from './paper2.mjs'

export function editionKey(q) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        q.id,
        q.stem,
        q.parts.map((p) => [p.label, p.ask, p.marks]),
        q.assets?.map((a) => [a.part, a.id]) ?? [],
      ]),
    )
    .digest('hex')
    .slice(0, 20)
}
const rules = new Map(Object.entries({ ...paper1, ...paper2 }))
export function canAdapt(key) {
  return rules.has(key)
}
function replaceAllOnce(text, changes) {
  // Match against the original field so that a replacement cannot be replaced again.
  for (const key of Object.keys(changes))
    if (!text.includes(key))
      throw Error('La edición privada no coincide con la regla.')
  if (!Object.keys(changes).length) return text
  const keys = Object.keys(changes).sort((a, b) => b.length - a.length)
  return text.replace(
    new RegExp(
      keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
      'g',
    ),
    (match) => String(changes[match]),
  )
}
export function adapt(source, key, a, b) {
  const {
    edit,
    answers,
    figure,
    partFigures = {},
    keepAssets = false,
    percentages = [],
  } = rules.get(key)(a, b)
  if (
    (source.assets?.length && !figure && !keepAssets) ||
    source.parts.length !== answers.length
  )
    throw Error('Estructura de variante incompatible.')
  return {
    ...source,
    origin: 'adapted',
    scheme: 'revisado',
    family: 'var-' + key,
    permission: 'variante para el aula',
    assets: keepAssets ? source.assets : [],
    figure,
    stem: replaceAllOnce(source.stem, edit[0] || {}),
    parts: source.parts.map((p, i) => {
      const [value, method] = answers[i]
      return {
        ...task(
          replaceAllOnce(p.ask, edit[i + 1] || {}),
          value,
          [method],
          [method],
        ),
        label: p.label,
        marks: p.marks,
        percentage: percentages.includes(i),
        figure: partFigures[i],
      }
    }),
  }
}
