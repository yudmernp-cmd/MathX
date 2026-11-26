import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { boards, enroll, identify, manageStudent, profilePhoto, setProfilePhoto, state } from '../server/league.mjs'
import { assignments } from '../server/assignments.mjs'

test('las fotos personales se reemplazan en ambas clasificaciones y respetan permisos, reinicio y baja', async () => {
  delete process.env.VERCEL
  delete process.env.BLOB_READ_WRITE_TOKEN
  process.env.MATHX_LEAGUE_DB = ':memory:'
  process.env.MATHX_SESSION_SECRET = randomBytes(32).toString('hex')
  const account = await enroll({ name: 'Irene' })
  const irene = await identify(account, true)
  const other = await identify(await enroll({ name: 'Diego' }), true)
  const pixels = Buffer.alloc(96 * 96 * 3, 17).toString('base64')
  const first = await setProfilePhoto(irene, pixels)
  assert.ok(first.photo)
  assert.equal((await profilePhoto(other, first.photo)).subarray(1, 4).toString(), 'PNG')
  await assert.rejects(setProfilePhoto({ ...irene, version: 'revocada' }, null), { status: 401 })
  await assert.rejects(setProfilePhoto(irene, '<svg></svg>'), { status: 400 })
  const replacement = await setProfilePhoto(irene, pixels)
  assert.notEqual(first.photo, replacement.photo)
  await assert.rejects(profilePhoto(other, first.photo), { status: 404 })
  await state(s => { s.assignments = { test: { kind:'exam', showTop:true, opens:0, attempts:{ [irene.id]: { grade:{ points:28 } } } } } },true)
  const ranking = await boards(other)
  assert.equal(ranking.exercises.find(p => p.name === account.name).photo, replacement.photo)
  assert.equal(ranking.exams[0].photo, replacement.photo)
  assert.equal(ranking.exercises.find(p => p.name === 'Diego').photo, undefined)
  assert.equal((await assignments(irene.id, 'learning', {}, irene)).photo, replacement.photo)
  const { id } = await manageStudent({ id:irene.id, operation:'reset' })
  assert.equal((await boards(other)).exercises.find(p => p.name === account.name).photo, replacement.photo)
  await manageStudent({ id, operation:'delete' })
  await assert.rejects(profilePhoto(other, replacement.photo), { status: 404 })
  const admin = { id:'admin', admin:true }
  const teacher = await setProfilePhoto(admin, pixels)
  assert.equal((await assignments('admin', 'learning', {}, admin)).photo, teacher.photo)
  await setProfilePhoto(admin, null)
  await assert.rejects(profilePhoto(other, teacher.photo), { status: 404 })
})
