import { bank } from '../server/bank.mjs'
import { hybrid } from '../server/hybrid.mjs'
const { index } = bank()
const counts = new Map()
for (const q of index) {
  const k = [q.origin, q.paper, q.theme, q.topic, q.level].join(' / ')
  counts.set(k, (counts.get(k) || 0) + 1)
}
console.log(Object.fromEntries(counts))
for (const paper of [1, 2]) {
  try {
    console.log(
      'Prueba',
      paper,
      'composición disponible',
      hybrid(index, paper).length,
    )
  } catch (e) {
    console.log(e.message, e.details)
    for (const n of paper === 1 ? [13, 14] : [6]) {
      try {
        const alternative = hybrid(index, paper, Math.random, n)
        console.log(
          'Propuesta para revisión',
          n,
          'preguntas, 80 puntos:',
          alternative,
        )
        break
      } catch {}
    }
  }
}
