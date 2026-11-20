import type { Config, Problem } from './model'
import { partMarks } from './model'
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
}
export const duration = 90 * 60 * 1000
export const key = (i: number, j: number) => i + '-' + j
export function score(run: Run) {
  let verified = 0,
    pending = 0,
    total = 0,
    withoutScheme = 0
  run.questions.forEach((q, i) =>
    q.parts.forEach((p, j) => {
      const id = key(i, j),
        answer = run.answers[id]?.trim(),
        note = run.notes[id]?.trim(),
        max = partMarks(p)
      total += max
      if (q.scheme === 'sin esquema') {
        withoutScheme += max
        return
      }
      if (p.value !== null && correct(answer || '', p.value, p.percentage))
        verified++
      if (p.value === null ? answer : note)
        pending += max - (p.value === null ? 0 : 1)
    }),
  )
  return { verified, pending, total, withoutScheme }
}
export const storageKey = 'mathx.classroom.2'
export function restore(): Run | null {
  try {
    const r = JSON.parse(
      sessionStorage.getItem(storageKey) || 'null',
    ) as Run | null
    if (!r || r.config.course !== 'MAI' || !r.questions[r.index]?.parts)
      return null
    if (r.mode === 'Simulacros' && Date.now() >= r.deadline) r.finished = true
    return r
  } catch {
    return null
  }
}
