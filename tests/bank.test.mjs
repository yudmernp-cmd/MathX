import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { hybrid, practice, levels, themes } from '../server/hybrid.mjs'
import { bank } from '../server/bank.mjs'
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
    assert.notEqual(
      id,
      practice(
        rows.filter((r) => r.id !== id),
        config,
      ),
    )
  })
}

test('agota el banco de MAI sin repetir inicios, también al cambiar de prueba o dificultad', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mathx-history-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const oldDir = process.env.MATHX_DATA_DIR
  process.env.MATHX_DATA_DIR = directory
  t.after(() => {
    if (oldDir === undefined) delete process.env.MATHX_DATA_DIR
    else process.env.MATHX_DATA_DIR = oldDir
  })
  execFileSync(process.execPath, ['--import', 'tsx', 'tools/prepare.ts', '8'])
  const db = bank(),
    seen = [],
    ids = new Set(),
    starts = new Set()
  for (const paper of [1, 2]) {
    for (const difficulty of levels) {
      for (;;) {
        let q
        try {
          ;[q] = db.questions({ paper, difficulty }, false, seen, 123)
        } catch (e) {
          assert.match(e.message, /No quedan ejercicios inéditos/)
          break
        }
        assert(!ids.has(q.id))
        assert(!starts.has(q.historyKey))
        ids.add(q.id)
        starts.add(q.historyKey)
        // Explicitly exercise migration of the old session IDs.
        seen.push(seen.length % 2 ? q.historyKey : q.id)
      }
    }
  }
  assert.equal(starts.size, new Set(db.index.map((q) => q.historyKey)).size)
  assert(starts.size > 30)
})
