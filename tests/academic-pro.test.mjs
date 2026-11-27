import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { academicProfile, enroll, identify, state } from '../server/league.mjs'
import { examReport } from '../server/exam-results.mjs'
import { mac, paperViewSignature } from '../server/session.mjs'

test('Simulacro Pro reconoce entregas antiguas al recuperar la edición y exige revisión para la banda', async t => {
  const previous = process.cwd(), dir = mkdtempSync(join(tmpdir(), 'mathx-academic-pro-'))
  process.chdir(dir)
  t.after(() => { process.chdir(previous); rmSync(dir, { recursive: true, force: true }) })
  delete process.env.VERCEL
  delete process.env.BLOB_READ_WRITE_TOKEN
  process.env.MATHX_LEAGUE_DB = ':memory:'
  process.env.MATHX_SESSION_SECRET = randomBytes(32).toString('hex')
  const owner = await identify(await enroll({ name: 'Práctica Pro local' }), true)
  const proId = createHash('sha256').update('fixture del perfil').digest('hex')
  await state(s => {
    s.students[owner.id].examResults = { legacy: { proId, paper: 2, title: 'Prueba de integración', answers: { 1: '5' } } }
  }, true)
  assert.ok(!(await academicProfile(owner)).earned.includes('p2'))
  // A small, isolated edition exercises the actual Pro reader and marking path.
  mkdirSync('server-data/pro', { recursive: true })
  mkdirSync('server-data/pro-es/' + proId, { recursive: true })
  const write = (file, data) => writeFileSync(file, JSON.stringify(data))
  write('server-data/pro/catalog.json', [{ id: proId, paper: 2, title: 'Prueba de integración' }])
  write('server-data/pro-es/' + proId + '/questions.json', [
    { number: 1, blocks: [{ parts: ['Calcula 2+3.'], answer: 'question' }] },
    { number: 2, blocks: [{ parts: ['Explica tu procedimiento.'], answer: 'question' }] },
  ])
  write('server-data/pro-worked.json', { [proId]: {
    1: { question: { value: 5, marks: 40, steps: '2+3=5' } },
    2: { question: { marks: 40, steps: 'Revisión docente del procedimiento.' } },
  } })
  assert.ok((await academicProfile(owner)).earned.includes('p2'))
  const deadline = Date.now() + 60_000
  const result = await examReport(owner, {
    action: 'finishPro', proId, deadline, signature: paperViewSignature(owner.id, proId),
    ticket: mac(['pro-attempt', owner.id, proId, deadline].join(':')), answers: { 1: '5', 2: 'Mi procedimiento' },
  })
  assert.ok(!(await academicProfile(owner)).earned.includes('band-5'))
  const decision = { action: 'resolve', ref: result.ref, index: 1, feedback: 'Procedimiento revisado.' }
  await examReport({ id: 'admin', admin: true }, { ...decision, score: 23 })
  assert.ok((await academicProfile(owner)).earned.includes('band-7'))
  await examReport({ id: 'admin', admin: true }, { ...decision, score: 0 })
  assert.ok((await academicProfile(owner)).earned.includes('band-7'))
})
