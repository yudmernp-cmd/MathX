import { bank } from '../server/bank.mjs'
const { index } = bank()
const counts = new Map()
for (const q of index) {
  const k = [q.origin, q.paper, q.theme, q.topic, q.level].join(' / ')
  counts.set(k, (counts.get(k) || 0) + 1)
}
console.log(Object.fromEntries(counts))
for (const paper of [1, 2]) {
  try {
    const qs = bank().questions({ paper }, true, [], 123456)
    console.log(
      'Prueba',
      paper,
      qs.length,
      'preguntas,',
      qs.filter((q) => q.origin === 'adapted').length,
      'variantes de examen.',
    )
  } catch (e) {
    console.log(e.message, e.details)
  }
}
