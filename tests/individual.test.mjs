import assert from 'node:assert/strict'
import { test } from 'node:test'
import katex from 'katex'
import { existsSync } from 'node:fs'
import { structures, materialize } from '../server/individual/index.mjs'
import { inputKinds } from '../server/individual/composition/series.mjs'
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
test('el historial de los cuatro originales da paso a una serie reproducible por tema y nivel', () => {
  const db = bank()
  for (const difficulty of levels)
    for (const theme of themes) {
      const config = { paper: 1, difficulty, theme }
      const previous = structures
        .filter((e) => e.theme === theme && e.level === difficulty)
        .map((e) => e.key)
      const usedShapes = new Set(previous),
        templates = new Set(),
        content = new Set()
      for (let draw = 0; draw < 1000; draw++) {
        const seed = (draw * 1777) >>> 0
        const [q] = db.questions(config, false, previous, seed, draw, 4)
        for (const [key, seen] of [
          [q.structureKey, usedShapes],
          [q.wordingKey, content],
          [q.patternKey, templates],
        ]) {
          assert.ok(!seen.has(key), [theme, difficulty, draw, key])
          seen.add(key)
        }
        assert.ok(q.individual && q.composed)
        assert.equal(q.theme, theme)
        assert.equal(q.level, difficulty)
        assert.equal(q.parts.length, 1)
        const p = q.parts[0]
        assert.equal((q.stem + p.ask).split('¿').length, 2)
        assert.ok(correct(String(p.value), p.value, p.percentage, p.unit))
        if (draw < 12) {
          assert.deepEqual(
            q,
            db.questions(
              { ...config, paper: 2 },
              false,
              previous,
              seed,
              draw,
              4,
            )[0],
          )
          const other = db.questions(
            config,
            false,
            previous,
            seed + 37,
            draw,
            4,
          )[0]
          assert.equal(q.structureKey, other.structureKey)
          assert.equal(q.patternKey, other.patternKey)
          for (const step of [q.stem, p.ask, ...p.steps]) {
            const parts = step.split('$')
            assert.equal(parts.length % 2, 1)
            for (let i = 1; i < parts.length; i += 2)
              katex.renderToString(parts[i], {
                throwOnError: true,
                strict: 'error',
              })
          }
          const retry = db.questions(
            config,
            false,
            [...previous, q.structureKey],
            seed,
            draw,
            4,
          )[0]
          assert.notEqual(q.structureKey, retry.structureKey)
        }
      }
      const q = db.questions(
        config,
        false,
        previous,
        123,
        Number.MAX_SAFE_INTEGER,
        329,
      )[0]
      assert.ok(q.composed && Number.isFinite(q.parts[0].value))
    }
  const all = db.questions(
    { paper: 1, difficulty: 'Medio' },
    false,
    structures.map((e) => e.key),
    123,
    300000,
    87,
  )
  assert.equal(all[0].composed, true)
  assert.equal(
    db.questions(
      { paper: 1, theme: '', difficulty: 'Medio' },
      false,
      structures.map((e) => e.key),
      123,
      300000,
      87,
    )[0].id,
    all[0].id,
  )
})
test('enumeración de condiciones sin permutaciones ni filas homogéneas', () => {
  const seen = new Set()
  for (let i = 0n; i < 5000n; i++) {
    const shape = inputKinds(i, 8)
    assert.ok(shape[0] < shape.at(-1))
    assert.deepEqual(
      [...shape].sort((a, b) => a - b),
      shape,
    )
    const key = shape.join(',')
    assert.ok(!seen.has(key))
    seen.add(key)
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
