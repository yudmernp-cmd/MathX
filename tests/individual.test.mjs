import assert from 'node:assert/strict'
import { test } from 'node:test'
import katex from 'katex'
import { existsSync } from 'node:fs'
import { structures, materialize } from '../server/individual/index.mjs'
import { structureKey } from '../server/individual/model.mjs'
import { bank } from '../server/bank.mjs'
import { themes, levels } from '../server/hybrid.mjs'
import { correct } from '../src/math/grading.ts'

test('cada estructura verifica todos los parámetros permitidos, una pregunta y una respuesta', () => {
  assert.equal(new Set(structures.map((e) => e.key)).size, structures.length)
  for (const entry of structures) {
    for (let a = 3; a <= 9; a++)
      for (let b = 12; b <= 26; b++) {
        const q = materialize(entry, a, b)
        assert.ok(q, entry.topic)
        assert.equal(q.parts.length, 1)
        const [p] = q.parts
        assert.equal((q.stem + p.ask).split('¿').length, 2)
        assert.doesNotMatch(q.stem + p.ask, /\([a-d]\)/)
        assert.ok(!p.label && p.steps.length >= 3)
        assert.equal(q.structureKey, entry.key)
        assert.ok(correct(String(p.value), p.value, p.percentage, p.unit))
        if (a === 3 && b === 12)
          for (const text of [q.stem, p.ask, ...p.steps]) {
            const spans = text.split('$')
            assert.equal(spans.length % 2, 1, entry.topic)
            for (let i = 1; i < spans.length; i += 2)
              katex.renderToString(spans[i], {
                throwOnError: true,
                strict: 'error',
              })
          }
      }
    const q = materialize(entry, 3, 12),
      r = materialize(entry, 8, 25)
    assert.equal(q.structureKey, r.structureKey)
    assert.equal(q.patternKey, r.patternKey)
    assert.notEqual(q.wordingKey, r.wordingKey)
    assert.equal(
      materialize(
        { ...entry, build: () => ({ ...entry.build(3, 12), value: NaN }) },
        3,
        12,
      ),
      null,
    )
    assert.equal(
      materialize(
        {
          ...entry,
          build: () => ({ ...entry.build(3, 12), check: () => false }),
        },
        3,
        12,
      ),
      null,
    )
  }
})
test('las huellas ignoran coeficientes, contexto y operaciones algebraicas equivalentes', () => {
  const form = (a, b) => [
    'derivative',
    ['add', ['multiply', a, ['square', 'input']], ['multiply', b, 'input']],
  ]
  assert.equal(structureKey(form(3, 5)), structureKey(form(7, -2)))
  assert.equal(
    structureKey(form(3, 5)),
    structureKey([
      'derivative',
      ['add', ['multiply', 'input', 9], ['multiply', 'input', 4, 'input']],
    ]),
  )
  assert.notEqual(
    structureKey(form(3, 5)),
    structureKey(['integral', form(3, 5)[1]]),
  )
  assert.equal(
    structureKey(['divide', 'rise', 'run']),
    structureKey(['multiply', ['reciprocal', 'run'], 'rise']),
  )
})
test('configuración, reproducibilidad y agotamiento compartido entre todas las selecciones', () => {
  const db = bank()
  for (const level of levels) {
    const history = []
    for (const theme of themes) {
      const config = { paper: 1, difficulty: level, theme }
      const count = structures.filter(
        (e) => e.level === level && e.theme === theme,
      ).length
      assert.ok(count >= 4)
      for (let n = 0; n < count; n++) {
        const seed = 711 + n
        const [q] = db.questions(config, false, history, seed)
        assert.deepEqual(
          q,
          db.questions({ ...config, paper: 2 }, false, history, seed)[0],
        )
        assert.equal(q.theme, theme)
        assert.equal(q.level, level)
        assert.ok(!history.includes(q.structureKey))
        history.push(q.structureKey)
      }
      assert.throws(
        () => db.questions(config, false, history, 123),
        (e) => e.details.reason === 'exhausted',
      )
    }
    assert.throws(
      () => db.questions({ paper: 1, difficulty: level }, false, history, 123),
      (e) => e.details.reason === 'exhausted',
    )
  }
})
test(
  'simulacros con la edición privada, nuevas instancias, reparto exacto y baremos intactos',
  { skip: !existsSync('server-data/approved.sqlite') },
  () => {
    for (const paper of [1, 2]) {
      let last = []
      for (let seed = 0; seed < 60; seed++) {
        const qs = bank().questions(
          { paper },
          true,
          last,
          721123 + seed,
          seed,
          26,
        )
        assert.equal(qs.length, paper === 1 ? 12 : 6)
        assert.equal(
          qs.filter((q) => q.origin === 'adapted').length,
          qs.length / 2,
        )
        assert.equal(
          qs.filter((q) => q.origin === 'original').length,
          qs.length / 2,
        )
        assert.equal(new Set(qs.map((q) => q.theme)).size, 5)
        assert.equal(
          qs.reduce(
            (s, q) =>
              s + q.parts.reduce((s, p) => s + (p.marks ?? p.rubric.length), 0),
            0,
          ),
          80,
        )
        assert.ok(qs.every((q) => q.generated && !last.includes(q.wordingKey)))
        last = qs.map((q) => q.wordingKey)
      }
    }
  },
)
test('formatos numéricos, unidades y precisión', () => {
  assert.ok(correct('3√2 m', 3 * Math.sqrt(2), false, 'm'))
  assert.ok(correct('1/8', 0.125))
  assert.ok(correct('12,5 %', 0.125))
  assert.ok(correct('S/ 35,75', 35.75, false, 'PEN'))
  assert.ok(correct('25 cm^3', 25, false, 'cm³'))
  assert.ok(correct('12,5%', 12.5, true, '%'))
  assert.ok(correct('1,41', Math.SQRT2))
  assert.ok(!correct('25 km', 25, false, 'cm'))
  assert.ok(!correct('25%', 25, false, 'cm'))
  assert.ok(!correct('1.4', Math.SQRT2))
})
