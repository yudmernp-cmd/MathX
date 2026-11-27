import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import catalog from '../shared/academic.json' with { type: 'json' }
import { academicProfile, boards, enroll, identify, manageStudent, state, studentBenefits } from '../server/league.mjs'

process.env.MATHX_LEAGUE_DB = ':memory:'
process.env.MATHX_SESSION_SECRET = randomBytes(32).toString('hex')
delete process.env.BLOB_READ_WRITE_TOKEN
delete process.env.VERCEL
const admin = { id: 'admin', admin: true }
const grant = (id, kind, benefit, equip = false, replace) =>
  studentBenefits(admin, id, { kind, id: benefit, equip, replace })
const register = async name => identify(await enroll({ name }), true)

test('el profesor asigna cualquier elemento del catálogo independientemente del logro y de la cuenta homónima', async () => {
  const account = await enroll({ name: 'Andrea' })
  const owner = await identify(account, true), peer = await register('Andrea')
  await assert.rejects(studentBenefits(owner, peer.id), { status: 403 })
  await assert.rejects(studentBenefits(owner, owner.id, { kind: 'color', id: 'ruby', equip: true }), { status: 403 })
  await assert.rejects(studentBenefits(admin, 'admin'), { status: 400 })
  await assert.rejects(studentBenefits(admin, '0'.repeat(64)), { status: 404 })
  for (const invalid of [null, {}, { kind: 'rule', id: 'ruby', equip: false }, { kind: 'color', id: 'p2', equip: false },
    { kind: 'title', id: 'ruby', equip: 'sí' }, { kind: 'color', id: 'ruby', equip: true, replace: 'band-7' }]) {
    await assert.rejects(studentBenefits(admin, owner.id, invalid), { status: 400 })
  }
  await Promise.all([grant(owner.id, 'color', 'ruby'), grant(owner.id, 'color', 'ruby')])
  let card = await academicProfile(owner)
  assert.deepEqual(card.grants, { color: ['ruby'] })
  assert.equal(card.equipped.color, null)
  await assert.rejects(academicProfile(owner, null, { frame: 'ruby' }), { status: 400 })
  await assert.rejects(academicProfile(owner, null, { badges: ['ruby'] }), { status: 400 })
  await academicProfile(owner, null, { color: 'ruby' })
  const member = (await boards(peer)).exercises.find(row => row.color === 'ruby').member
  assert.equal((await academicProfile(peer, member)).grants, undefined)
  assert.equal((await academicProfile(peer)).grants, undefined)
  for (const kind of ['color','frame','title','badge']) {
    const options = catalog.filter(entry => entry[kind]).map(entry => entry.id)
    await Promise.all(options.map(id => grant(owner.id, kind, id)))
    card = await studentBenefits(admin, owner.id)
    assert.deepEqual([...card.grants[kind]].sort(), options.sort())
  }
  assert.deepEqual(card.earned, [])
  assert.equal(card.rank, null)
  assert.deepEqual((await academicProfile(await identify(account, true))).grants, card.grants)
  const publicCard = await academicProfile(peer, member)
  assert.deepEqual(Object.keys(publicCard.grants), ['badge'])
  assert.ok(publicCard.grants.badge.includes('band-7'))
  assert.equal(await state(s => s.students[owner.id].points), 0)
  await manageStudent({ id: owner.id, operation: 'reset' })
  await assert.rejects(grant(owner.id, 'title', 'ruby'), { status: 404 })
  assert.equal((await academicProfile(await identify(account, true))).grants, undefined)
})

test('equipar un beneficio respeta los otros campos y sustituye solo la insignia destacada elegida', async () => {
  const owner = await register('Renata')
  await state(s => { s.students[owner.id].academics = { earned: ['first-batch', 'perfect', 'unaided'] } }, true)
  const badges = ['first-batch', 'perfect', 'unaided']
  await academicProfile(owner, null, { badges })
  await grant(owner.id, 'frame', 'ruby', true)
  await grant(owner.id, 'color', 'gold', true)
  await assert.rejects(grant(owner.id, 'badge', 'band-7', true), { status: 409 })
  await assert.rejects(grant(owner.id, 'badge', 'band-7', true, 'weeks'), { status: 409 })
  let card = await academicProfile(owner)
  assert.deepEqual(card.equipped.badges, badges)
  assert.equal(card.grants.badge, undefined)
  await grant(owner.id, 'badge', 'band-7')
  for (let i = 0; i < 2; i++) await grant(owner.id, 'badge', 'band-7', true, 'perfect')
  await grant(owner.id, 'title', 'perfect', true)
  card = await academicProfile(owner, null, { color: null })
  assert.deepEqual(card.equipped, { color: null, frame: 'ruby', title: 'perfect', badges: ['first-batch', 'band-7', 'unaided'] })
  assert.deepEqual(card.earned, badges)
  assert.deepEqual(card.grants.badge, ['band-7'])
  await state(s => {
    const p = s.students[owner.id]
    p.seen = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [i, 1]))
    p.stats = Object.fromEntries(catalog.filter(i => i.topic).map(i => [i.topic + ' · 3', { tried: 60, solved: 60, first: 60 }]))
  }, true)
  card = await academicProfile(owner)
  assert.equal(card.rank, 'silver')
  assert.ok(!card.earned.includes('band-7') && !card.earned.includes('gold') && !card.earned.includes('ruby'))
})
