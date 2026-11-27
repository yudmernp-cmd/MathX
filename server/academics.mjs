import catalog from '../shared/academic.json' with { type: 'json' }
import boundaries from '../shared/exam-bands.json' with { type: 'json' }

const subjects = catalog.filter(item => item.topic)
const tiers = catalog.filter(item => item.color)
const fullBatch = (1 << 15) - 1
const defaults = () => ({ color: null, frame: null, title: null, badges: [] })
const journal = p => (p.academics ??= { earned: [] })
function award(p, id) {
  const { earned } = journal(p)
  if (!earned.includes(id)) earned.push(id)
}
export function recordDay(p, topic, now) {
  const item = subjects.find(s => s.topic === topic)
  if (!item) return
  const days = (journal(p).days ??= {})
  const dates = (days[item.id] ??= [])
  const date = new Date(now - 5 * 3600000).toISOString().slice(0, 10)
  if (dates.length < 3 && !dates.includes(date)) dates.push(date)
}
export function recordBatch(p, drill, action, firstCorrect = false) {
  if (typeof drill.batch !== 'string' || !Number.isInteger(drill.slot) ||
      drill.slot < 0 || drill.slot >= 15 || journal(p).earned.includes('unaided')) return
  const batches = (journal(p).batches ??= {})
  const b = (batches[drill.batch] ??= { attempted: 0, first: 0, helped: false })
  if (action === 'help') {
    if (b.attempted !== fullBatch) b.helped = true
    return
  }
  const bit = 1 << drill.slot
  if (b.attempted & bit) return
  b.attempted |= bit
  if (firstCorrect) b.first |= bit
  if (b.attempted === fullBatch) {
    award(p, 'first-batch')
    if (b.first === fullBatch) {
      award(p, 'perfect')
      if (!b.helped) award(p, 'unaided')
    }
    // Every slot now has a recorded global attempt, so replay cannot award a perfect batch.
    delete batches[drill.batch]
    if (journal(p).earned.includes('unaided')) delete p.academics.batches
  }
}
export function recordChallenge(p, taskId, points) {
  if (points === 20) award(p, 'challenge-perfect')
  if (points < 15 || journal(p).earned.includes('challenge-frame')) return
  const passed = (journal(p).challenges ??= [])
  if (!passed.includes(taskId)) passed.push(taskId)
  if (passed.length >= 3) {
    award(p, 'challenge-frame')
    delete p.academics.challenges
  }
}
export function recordExam(p, paper, max, participated, reviewedPoints) {
  if (max !== 80 || ![1, 2].includes(paper) || !participated) return
  award(p, 'exam-complete')
  award(p, 'p' + paper)
  if (!Number.isInteger(reviewedPoints) || reviewedPoints < 0 || reviewedPoints > max) return
  const band = boundaries[paper].filter(min => reviewedPoints >= min).length
  const best = (journal(p).bands ??= {})
  best[paper] = Math.max(best[paper] ?? 0, band)
  for (let level = 5; level <= band; level++) award(p, 'band-' + level)
  if (band >= 5) award(p, 'expert-p' + paper)
  if (best[1] >= 6 && best[2] >= 6) award(p, 'exam-master')
  refreshAcademic(p)
}
export function refreshAcademic(p) {
  const a = journal(p)
  const stats = Object.entries(p.stats ?? {})
  let practiced = 0, solvedTopics = 0, first = 0, tried = 0, solved = 0
  for (const { id, topic } of subjects) {
    let t = 0, f = 0, s = 0
    for (const [group, stat] of stats) {
      if (!group.startsWith(topic + ' · ')) continue
      t += stat.tried; f += stat.first; s += stat.solved
    }
    if (t) practiced++
    if (s) solvedTopics++
    first += f; tried += t; solved += s
    if (s >= 30 && f * 5 >= t * 4 && a.days?.[id]?.length >= 3) award(p, id)
  }
  if (solved - first >= 5) award(p, 'recovery')
  if (solvedTopics === subjects.length) award(p, 'all-topics')
  if (Object.values(p.weeks ?? {}).filter(w => Object.values(w).some(v => v.tried > 0)).length >= 3) award(p, 'weeks')
  const count = Object.keys(p.seen ?? {}).length
  if (count >= 50) award(p, 'bronze')
  if (count >= 150 && practiced >= 3) award(p, 'silver')
  if (count >= 300 && practiced === subjects.length && a.earned.includes('band-5')) award(p, 'gold')
  if (a.earned.includes('gold') && a.earned.includes('band-7') &&
      tried > 0 && first * 5 >= tried * 4 && subjects.every(s => a.earned.includes(s.id))) award(p, 'ruby')
}
export function classroomAppearance(p) {
  const equipped = p.academics?.equipped
  return {
    ...(equipped?.color && { color: equipped.color }),
    ...(equipped?.frame && { frame: equipped.frame }),
  }
}
export function academicCard(p, owner = false) {
  const { earned, equipped } = journal(p)
  const rank = tiers.filter(t => earned.includes(t.id)).at(-1)?.id ?? null
  return {
    name: p.name, photo: p.photo ?? null, rank, equipped: equipped ?? defaults(),
    earned: owner ? earned : earned.filter(id => catalog.some(item => item.id === id && item.badge)),
  }
}
export function canEquip(p, choices) {
  if (!choices || typeof choices !== 'object' || Object.keys(choices).length !== 4) return false
  const allowed = (group, id) => journal(p).earned.includes(id) && catalog.some(item => item.id === id && item[group])
  return ['color', 'frame', 'title'].every(group => choices[group] === null || allowed(group, choices[group])) &&
    Array.isArray(choices.badges) && choices.badges.length <= 3 &&
    new Set(choices.badges).size === choices.badges.length && choices.badges.every(id => allowed('badge', id))
}
