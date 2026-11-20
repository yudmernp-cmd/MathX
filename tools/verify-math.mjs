import katex from 'katex'
import { readFileSync } from 'node:fs'
const entries = JSON.parse(readFileSync(0, 'utf8'))
for (const text of entries) {
  const fields = text.split('$')
  if (fields.length % 2 === 0)
    throw Error('Delimitadores matemáticos incompletos.')
  for (let i = 1; i < fields.length; i += 2) {
    try {
      katex.renderToString(fields[i], {
        throwOnError: true,
        trust: false,
        strict: 'error',
      })
    } catch {
      throw Error('Expresión LaTeX pendiente de revisión.')
    }
  }
}
