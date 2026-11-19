import { duration, exercise, exam, signature } from './engine'
import type { Config, Problem } from './model'
import { correct } from './grading'
export type Mode = 'Ejercicios' | 'Simulacros'
export type Run = {
  config: Config
  mode: Mode
  seed: number
  questions: Problem[]
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
    let q = exercise(config, seed)
    const recent = history.slice(-5).map((s) => s.split('-')[0])
    for (
      let attempt = 0;
      attempt < 200 &&
      (recent.includes(q.family) || history.slice(-10).includes(signature(q)));
      attempt++
    ) {
      seed = (seed + 1) >>> 0
      q = exercise(config, seed)
    }
    questions = [q]
  } else questions = exam(config, seed)
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
