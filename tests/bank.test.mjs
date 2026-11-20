import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hybrid, practice, levels, themes } from '../server/hybrid.mjs'
// Explicit test-only metadata, never used for student sessions.
function fixture(paper) {
  const rows = []
  for (const origin of ['original', 'real'])
    for (let i = 0; i < 60; i++)
      for (const marks of paper === 1 ? [4, 6, 8] : [14, 16, 18])
        rows.push({
          id: origin + i + '-' + marks,
          origin,
          paper,
          theme: themes[i % 5],
          topic: 'tema' + (i % 5),
          level: levels[i % 3],
          marks,
          similarity: origin + i,
        })
  return rows
}
for (const paper of [1, 2]) {
  test(
    'proporción, suma, dificultad, mezcla, temas y variación P' + paper,
    () => {
      const rows = fixture(paper),
        byId = new Map(rows.map((q) => [q.id, q])),
        orders = new Set()
      for (let i = 0; i < 150; i++) {
        const ids = hybrid(rows, paper),
          qs = ids.map((id) => byId.get(id)),
          real = qs.filter((q) => q.origin === 'real')
        assert(Math.abs(real.length - (qs.length - real.length)) <= 1)
        assert.equal(
          qs.reduce((z, q) => z + q.marks, 0),
          80,
        )
        assert.equal(new Set(qs.map((q) => q.theme)).size, 5)
        assert.equal(new Set(qs.map((q) => q.level)).size, 3)
        assert.equal(new Set(qs.map((q) => q.similarity)).size, qs.length)
        assert(qs.every((q, k) => !k || q.origin !== qs[k - 1].origin))
        orders.add(ids.join())
      }
      assert(orders.size > 120)
    },
  )
  test('insuficiencia y conflicto del banco P' + paper, () => {
    const rows = fixture(paper)
    assert.throws(
      () =>
        hybrid(
          rows.filter((q) => q.origin === 'original'),
          paper,
        ),
      (e) => e.details.missingReal === (paper === 1 ? 6 : 2),
    )
    assert.throws(
      () =>
        hybrid(
          rows.map((q) => ({ ...q, marks: 81 })),
          paper,
        ),
      (e) => e.details.missingReal === 0,
    )
  })
  test('práctica filtrada y rotación P' + paper, () => {
    const rows = fixture(paper),
      config = {
        paper,
        theme: themes[0],
        subtopic: 'tema0',
        difficulty: 'Difícil',
      }
    const id = practice(rows, config),
      q = rows.find((q) => q.id === id)
    assert.equal(q.theme, config.theme)
    assert.equal(q.topic, config.subtopic)
    assert.equal(q.level, config.difficulty)
    assert.notEqual(id, practice(rows, config, [id]))
  })
}
