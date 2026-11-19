import { duration, exercise, exam, signature, practiceFamilies } from './engine'
import type { Config, Problem } from './model'
import { correct } from './grading'
export type Mode = 'Ejercicios' | 'Simulacros'
export type Run = {
  config: Config
  mode: Mode
  seed: number
  questions: Problem[]
  ordinal?: number
  index: number
  answers: Record<string, string>
  notes: Record<string, string>
  checked: boolean
  finished: boolean
  deadline: number
  history: string[]
}
export const key = (i: number, j: number) => i + '-' + j
export function start(
  config: Config,
  mode: Mode,
  seed: number,
  history: string[],
  now = Date.now(),
): Run {
  let questions: Problem[]
  if (mode === 'Ejercicios') {
    const recent = history.slice(-10).map((entry) => entry.split(':'))
    const variants = recent.map(([id]) => id)
    const familyIds = variants.map((id) => id.split('-')[0])
    const count = practiceFamilies(config).length
    const lastFamilies =
      count > 1 ? familyIds.slice(-Math.min(5, count - 1)) : []
    const lastVariants = variants.slice(-Math.min(10, 2 * count - 1))
    const cycle = recent.slice(-2).map(([, level]) => level)
    let best = exercise(config, seed),
      bestSeed = seed,
      bestPenalty = Infinity
    for (let i = 0; i < 96; i++) {
      const candidateSeed = (seed + i) >>> 0
      const q = i ? exercise(config, candidateSeed) : best
      const repeatedLevel =
        config.difficulty === 'Mixto' && cycle.includes(q.level)
      const penalty =
        Number(repeatedLevel) * 100 +
        (lastFamilies.lastIndexOf(q.family) + 1) * 12 +
        lastVariants.lastIndexOf(signature(q)) +
        1
      if (penalty < bestPenalty) {
        best = q
        bestSeed = candidateSeed
        bestPenalty = penalty
      }
      if (penalty === 0) break
    }
    seed = bestSeed
    questions = [best]
  } else {
    const { course, paper, difficulty } = config
    config = { course, paper, difficulty }
    questions = exam(config, seed)
  }
  return {
    config,
    mode,
    seed,
    history,
    questions,
    index: 0,
    answers: {},
    notes: {},
    checked: false,
    finished: false,
    deadline: now + duration,
  }
}
export function score(run: Run) {
  let verified = 0,
    pending = 0,
    total = 0
  run.questions.forEach((q, i) =>
    q.parts.forEach((p, j) => {
      const id = key(i, j),
        answer = (run.answers[id] || '').trim(),
        note = (run.notes[id] || '').trim()
      total += p.rubric.length
      if (p.value !== null && correct(answer, p.value, p.percentage)) verified++
      if (p.value === null ? answer : note)
        pending += p.rubric.length - (p.value === null ? 0 : 1)
    }),
  )
  return { verified, pending, total }
}
export const storageKey = 'mathx.session.1'
export function restore(): Run | null {
  try {
    const r = JSON.parse(
      sessionStorage.getItem(storageKey) || 'null',
    ) as Run | null
    if (
      !r ||
      !Array.isArray(r.questions) ||
      !r.questions[r.index]?.parts ||
      !['Ejercicios', 'Simulacros'].includes(r.mode)
    )
      return null
    if (r.mode === 'Simulacros' && Date.now() >= r.deadline) r.finished = true
    return r
  } catch {
    return null
  }
}
