import { request } from './request'
import type { Problem } from './math/model'
export type Grade = {
  points: number
  scores: number[]
  comment: string
  at: number
}
export type Task = {
  id: string
  kind: 'challenge' | 'exam'
  title: string
  opens: number
  closes: number
  paper?: number
  minutes?: number
  showTop?: boolean
  editVersion?: number
  started?: boolean
  submitted?: boolean
  grade?: Grade
}
export type Attempt = Task & {
  questions: Problem[]
  answers: Record<string, string>
  notes: Record<string, string>
  revision: number
  deadline: number
  reveal: boolean
}
export type Profile = {
  name: string
  points: number
  weeks: Record<string, Record<string, { tried: number; first: number }>>
  activity?: number
  stats: Record<string, { tried: number; first: number; solved: number }>
}
export type Review = {
  task: string
  student: string
  name: string
  title: string
  grade?: Grade
  time: number
}
export type Learning = {
  tasks: Task[]
  profile?: Profile
  students?: Profile[]
  legacyRound?: boolean
  reviews?: Review[]
  alerts?: { kind: string; title: string; name: string; at: number }[]
}
export const task = <T = unknown>(action: string, data: object = {}) =>
  request<T>('task', { action, ...data })
export const stamp = (t: number) =>
  new Date(t).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'short',
    timeStyle: 'short',
  })
export const limaDate = (t = Date.now()) =>
  new Date(t - 5 * 3600000).toISOString().slice(0, 10)
