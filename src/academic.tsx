import { useEffect, useState } from 'react'
import items from '../shared/academic.json'
import { request } from './request'

export type Single = 'color' | 'frame' | 'title'
export type BenefitKind = Single | 'badge'
export type Equipped = Record<Single, string | null> & { badges: string[] }
export type Card = {
  name: string; photo: string | null; rank: string | null; earned: string[]; equipped: Equipped
  grants?: Partial<Record<BenefitKind, string[]>>
}
type Entry = { id: string; rule: string; symbol?: string } & Partial<Record<BenefitKind, string>>
export const catalog: Entry[] = items
export const item = (id?: string | null) => catalog.find(entry => entry.id === id)
export const available = (card: Card, kind: BenefitKind, id: string) =>
  card.earned.includes(id) || !!card.grants?.[kind]?.includes(id)
export const fields: { key: Single; label: string; empty: string }[] = [
  { key: 'color', label: 'Color del nombre', empty: 'Color habitual' },
  { key: 'frame', label: 'Marco de perfil', empty: 'Sin marco' },
  { key: 'title', label: 'Título académico', empty: 'Sin título' },
]
export const categories: { key: BenefitKind; label: string }[] = [...fields, { key: 'badge', label: 'Insignia académica' }]

export function useAcademicCard(action = 'academic-profile') {
  const [card, setCard] = useState<Card>(), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    setCard(undefined)
    request<Card>(action)
      .then(value => { if (active) setCard(value) })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [action, retry])
  const reload = () => setRetry(r => r + 1)
  const loading = error
    ? <div role="alert">{error} <button type="button" className="back" onClick={reload}>Reintentar</button></div>
    : <p role="status">Cargando perfil…</p>
  return { card, setCard, loading, reload }
}
