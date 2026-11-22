import { createHash } from 'node:crypto'
import { variants } from './variants.mjs'
import { algebra } from './algebra.mjs'
import { functions } from './functions.mjs'
import { geometry } from './geometry.mjs'
import { statistics } from './statistics.mjs'
import { calculus } from './calculus.mjs'
export const topics = {
  'Número y Álgebra': algebra,
  Funciones: functions,
  'Geometría y Trigonometría': geometry,
  'Estadística y Probabilidad': statistics,
  Cálculo: calculus,
}
export const drillKey = (q) =>
  'drill-' +
  createHash('sha256')
    .update(JSON.stringify([q.instruccion, q.expresion]))
    .digest('hex')
export function drills(
  theme,
  level,
  seed,
  excluded = [],
  turn = seed,
  offset = 0,
) {
  const groups = topics[theme],
    seen = new Set(excluded)
  const structures = new Set()
  let state = seed >>> 0
  const int = (lo, hi) => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return lo + Math.floor((state / 2 ** 32) * (hi - lo + 1))
  }
  function shuffle(xs) {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = int(0, i)
      ;[xs[i], xs[j]] = [xs[j], xs[i]]
    }
    return xs
  }
  const queues = groups.map((g, i) => {
    const code = `${Object.keys(topics).indexOf(theme) + 1}.${i + 1}`
    const count =
      Math.floor(15 / groups.length) + Number(i < 15 % groups.length)
    const types = Object.entries(g.types)
    const start = ((turn % types.length) * count + offset + i) % types.length
    const selected = shuffle(
      Array.from(
        { length: count },
        (_, j) => types[(start + j) % types.length],
      ),
    )
    if (types.length < count)
      throw Error('Faltan tipos de tarea para el reparto.')
    // A type's position repeats after this many batches. Alternate the method
    // on successive cycles even when the number of eligible types is even.
    let cycle = 1
    while ((cycle * count) % types.length !== 0) cycle++
    return selected.map(([tipo_tarea, make]) => {
      for (let attempt = 0; attempt < 120; attempt++) {
        const alternate = variants[code]?.[tipo_tarea]
        const generate =
          alternate &&
          (Math.floor(turn / cycle) +
            offset +
            i +
            tipo_tarea.length +
            attempt) %
            2
            ? alternate
            : make
        const data = generate({
          a: int(10, Math.min(93, 40 + level * 10)),
          b: int(3, 15 + level * 4),
          k: int(2, level + 3),
          n: int(3, level + 5),
          level,
          flip: int(0, 1) === 1,
        })
        const key = drillKey(data)
        const shape = [data.instruccion, data.expresion]
          .join(' ')
          .replace(/[-+]?\d+(?:\.\d+)?/g, '#')
        if (seen.has(key) || structures.has(shape)) continue
        structures.add(shape)
        seen.add(key)
        return {
          tema: theme,
          subtema: code,
          tipo_tarea,
          dificultad: level,
          ...data,
        }
      }
      throw Error('No se pudo componer una tanda inédita.')
    })
  })
  // Alternate subtopics so the first screenful already changes the procedure.
  const result = []
  while (result.length < 15)
    for (const queue of shuffle(queues.filter((q) => q.length)))
      result.push(queue.pop())
  return result
}
