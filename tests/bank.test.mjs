import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { hybrid, levels, themes } from '../server/hybrid.mjs'
import { bank } from '../server/bank.mjs'
// Explicit test-only metadata, never used for student sessions.
function fixture(paper) {
  const rows = []
  for (const origin of ['original', 'real'])
    for (let i = 0; i < 60; i++)
      for (const marks of paper === 1 ? [4, 6, 8] : [10, 14, 16, 18])
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
        assert.equal(2 * real.length, qs.length)
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
      (e) => e.details.missingReal === (paper === 1 ? 6 : 3),
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
}

test('restaura la edición privada en una compilación limpia y detecta una edición dañada', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mathx-edicion-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const input = path.join(directory, 'fixture.sqlite')
  const fixtureDb = new DatabaseSync(input)
  fixtureDb.exec(readFileSync('server/schema.sql', 'utf8'))
  fixtureDb
    .prepare('INSERT INTO items VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(
      'test',
      'real',
      1,
      themes[0],
      'Tema de prueba',
      levels[0],
      3,
      'f',
      'h',
      '{}',
    )
  fixtureDb.close()
  const edition = execFileSync(
    process.execPath,
    ['tools/pack-edition.mjs', input],
    { encoding: 'utf8' },
  )
  const prepare = (value) =>
    execFileSync(
      process.execPath,
      ['--import', 'tsx', 'tools/prepare.ts', '1'],
      {
        env: {
          ...process.env,
          MATHX_DATA_DIR: directory,
          MATHX_APPROVED_EDITION: value,
        },
        stdio: 'pipe',
      },
    )
  prepare(edition)
  const bankFile = path.join(directory, 'bank.sqlite')
  const content = readFileSync(bankFile)
  const built = new DatabaseSync(bankFile, { readOnly: true })
  assert.equal(
    built.prepare("SELECT count(*) AS n FROM items WHERE origin='real'").get()
      .n,
    1,
  )
  built.close()
  assert.throws(() => prepare('bad' + edition))
  assert.deepEqual(readFileSync(bankFile), content)
  assert(!readdirSync(directory).some((name) => name.endsWith('.approved')))
})
