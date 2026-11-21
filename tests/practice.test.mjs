import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import katex from 'katex'
import { continuation, wordingKey } from '../server/practice/index.mjs'
import { canAdapt, editionKey } from '../server/practice/adaptations.mjs'
import {
  parameters,
  studentCdf,
  normalCdf,
  binomial,
} from '../server/practice/math.mjs'
import { levels } from '../server/hybrid.mjs'

const near = (actual, expected, tol = 1e-8) =>
  assert(
    Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)),
    JSON.stringify({ actual, expected }),
  )
test('las parejas de datos forman una permutación sin repeticiones entre bloques', () => {
  for (const start of [0, 13000, 900000]) {
    const seen = new Set()
    for (let i = start; i < start + 2500; i++) {
      const { a, b } = parameters(i, 329)
      seen.add(a + '-' + b)
    }
    assert.equal(seen.size, 2500)
  }
})
test('probabilidades contrastadas con cuantiles tabulados y distribuciones exactas', () => {
  near(normalCdf(1.959963984540054), 0.975)
  near(normalCdf(-2.3263478740408408), 0.01)
  near(studentCdf(-1.76131013577486, 14), 0.05)
  near(studentCdf(2.44691185114497, 6), 0.975)
  for (let k = 0; k < 4; k++) near(binomial(3, k, 0.5), [1, 3, 3, 1][k] / 8)
})
test('las soluciones del modelo de regresión reproducen los mínimos cuadrados de la tabla', () => {
  for (let i = 0; i < 330; i++) {
    const q = continuation(
      {
        topic: 'Regresión e interpretación',
        theme: 'Estadística y probabilidad',
      },
      { paper: 2, difficulty: 'Difícil' },
      i,
      11,
    )
    const rows = q.figure.rows
    const sum = (f) => rows.reduce((a, row) => a + f(...row), 0)
    const mx = sum((x) => x) / 4,
      my = sum((x, y) => y) / 4
    const slope = sum((x, y) => (x - mx) * (y - my)) / sum((x) => (x - mx) ** 2)
    near(q.parts[0].value, my)
    near(q.parts[1].value, slope)
    near(q.parts[2].value, my + (2.5 - mx) * slope)
    near(q.parts[3].value, rows[3][1] - (my + (3 - mx) * slope))
  }
})

const privateEdition = 'server-data/approved.sqlite'
test(
  'las adaptaciones instaladas conservan los incisos, los puntos y el vínculo privado, con notación válida',
  { skip: !existsSync(privateEdition) },
  () => {
    const db = new DatabaseSync(privateEdition, { readOnly: true })
    try {
      for (const { payload } of db
        .prepare("SELECT payload FROM items WHERE origin='real'")
        .all()) {
        const source = JSON.parse(payload),
          key = editionKey(source)
        if (!canAdapt(key)) continue // An authorized future edition may contain questions without a rule.
        const forms = new Set()
        for (let draw = 0; draw < 330; draw++) {
          const { a, b } = parameters(draw, 69),
            q = continuation(
              null,
              { paper: source.provenance.paper, difficulty: source.level },
              draw,
              69,
              { question: source, key },
            )
          assert(!forms.has(q.historyKey), source.topic)
          forms.add(q.historyKey)
          assert.equal(q.origin, 'adapted')
          assert.notEqual(q.historyKey, wordingKey(source))
          assert.equal(q.provenance.document, source.provenance.document)
          assert.equal(q.marks, source.marks)
          assert.deepEqual(
            q.parts.map((p) => [p.label, p.marks]),
            source.parts.map((p) => [p.label, p.marks]),
          )
          assert(
            q.parts.every(
              (p) =>
                p.steps.length &&
                p.rubric.length &&
                (p.value === null || Number.isFinite(p.value)),
            ),
          )
          if (draw < 8)
            for (const line of [
              q.stem,
              ...q.parts.flatMap((p) => [p.ask, ...p.steps]),
            ]) {
              const spans = line.split('$')
              assert.equal(spans.length % 2, 1)
              for (let j = 1; j < spans.length; j += 2)
                katex.renderToString(spans[j], {
                  throwOnError: true,
                  strict: 'error',
                })
            }
          // Independent calculations for representative dependencies and artwork.
          if (q.figure?.type === 'curve') {
            const values = q.figure.points.map((p) => p[1])
            near(
              Math.max(...values),
              q.parts[1].value + q.parts[0].value,
              0.002,
            )
            near(
              Math.min(...values),
              q.parts[1].value - q.parts[0].value,
              0.002,
            )
            near(q.figure.points[0][1], q.parts[1].value)
          }
          if (key === '2a977e161857320ed764') {
            const numbers = q.stem.match(/\d+/g).map(Number)
            const ratio = numbers[1] / numbers[0]
            near(numbers[2] / numbers[1], ratio)
            const terms = [numbers[0]]
            for (let i = 1; i < 15; i++) terms.push(terms.at(-1) * ratio)
            const kth = Number(q.parts[1].ask.match(/\d+/)[0]),
              length = Number(q.parts[2].ask.match(/\d+/)[0])
            near(q.parts[1].value, terms[kth - 1])
            near(
              q.parts[2].value,
              terms.slice(0, length).reduce((x, y) => x + y, 0),
            )
          }
          if (key === '87c97a20040a1fdf08a3') {
            const scale = Number(q.stem.match(/=([\d.]+)x\^2-/)[1]) / 0.6
            let area = 0
            for (let j = 0; j < 1000; j++) {
              const x = (4 * (j + 0.5)) / 1000
              area += (0.2 * x ** 3 - 0.9 * x ** 2 + 3) * scale * 0.004
            }
            near(q.parts[3].value, 1.2 * area, 1e-6)
          }
          if (key === 'bafabf6c75f36b0f68ff') {
            const K = (4 + b) * (6 * (5 + a)) ** 2,
              capacity = 36 * (4 + b)
            near(K / q.parts[0].value ** 2, capacity)
            assert(q.parts[2].steps[0].includes(String(9 * (4 + b))))
          }
          if (key === 'e1d3ca837dcd1cef3b89') {
            near(q.parts[0].value, 3 * Math.PI * q.figure.radius ** 2)
            near(q.parts[1].value, q.parts[0].value / (150 + b))
          }
          if (key === '4f8bdbb5cb7ef9946d48')
            near(q.figure.radius, q.parts[1].figure.radius)
        }
      }
    } finally {
      db.close()
    }
  },
)
test(
  'todas las combinaciones de la edición instalada tienen práctica continua',
  { skip: !existsSync('server-data/bank.sqlite') },
  () => {
    const db = new DatabaseSync('server-data/bank.sqlite', { readOnly: true })
    try {
      const catalog = db
        .prepare('select distinct paper,theme,topic from items')
        .all()
      for (const entry of catalog)
        for (const difficulty of levels) {
          const seen = new Set()
          for (let draw = 0; draw < 330; draw++) {
            const q = continuation(
              entry,
              { paper: entry.paper, difficulty },
              draw,
              17,
            )
            assert.equal(q.topic, entry.topic)
            assert.equal(q.level, difficulty)
            assert(
              q.parts.length > 1 &&
                q.parts.every((p) => p.steps.length && p.rubric.length),
            )
            assert(!seen.has(q.historyKey), entry.topic)
            seen.add(q.historyKey)
            if (draw === 0) {
              for (const s of [
                q.stem,
                ...q.parts.flatMap((p) => [p.ask, ...p.steps]),
              ]) {
                const spans = s.split('$')
                assert.equal(spans.length % 2, 1)
                for (let j = 1; j < spans.length; j += 2)
                  katex.renderToString(spans[j], {
                    throwOnError: true,
                    strict: 'error',
                  })
              }
            }
          }
        }
    } finally {
      db.close()
    }
  },
)
