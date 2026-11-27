import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Award, Check, LockKeyhole, SlidersHorizontal, X } from 'lucide-react'
import items from '../shared/academic.json'
import { Avatar } from './ProfilePhoto'
import { request } from './request'

type Entry = {
  id: string; rule: string; color?: string; symbol?: string; frame?: string; title?: string; badge?: string
}
const catalog: Entry[] = items
const item = (id?: string | null) => catalog.find(entry => entry.id === id)
type Single = 'color' | 'frame' | 'title'
type Equipped = Record<Single, string | null> & { badges: string[] }
type Card = { name: string; photo: string | null; rank: string | null; earned: string[]; equipped: Equipped }
export type Appearance = { color?: string | null; frame?: string | null }
type Changed = (equipped: Equipped) => void

export function AcademicName({ name, color }: { name: string; color?: string | null }) {
  const tier = item(color)
  return <span className={'academic-name' + (tier?.color ? ' tier-' + tier.id : '')}>
    {tier?.color && <><span className="tier-symbol" aria-hidden="true">{tier.symbol}</span><span className="sr-only">{tier.color} · </span></>}
    {name}
  </span>
}
function BadgeList({ ids }: { ids: string[] }) {
  return <ul className="academic-badges">{ids.map(id =>
    <li key={id}><Award size={15} aria-hidden="true"/>{item(id)?.badge}</li>
  )}</ul>
}
export function AcademicHighlights({ title, badges }: { title?: string | null; badges?: string[] }) {
  return <>{title && <div className="academic-title">{item(title)?.title}</div>}
    {!!badges?.length && <BadgeList ids={badges}/>}</>
}
function Identity({ card, equipped = card.equipped }: { card: Card; equipped?: Equipped }) {
  return <div className="academic-identity">
    <Avatar photo={card.photo} frame={equipped.frame}/>
    <div>
      <strong><AcademicName name={card.name} color={equipped.color}/></strong>
      {equipped.title && <div className="academic-title">{item(equipped.title)?.title}</div>}
      <small>{card.rank ? 'Rango ' + item(card.rank)?.color : 'Estudiante de MAI NM'}</small>
    </div>
    {equipped.badges.length > 0 && <BadgeList ids={equipped.badges}/>}
  </div>
}
function Modal({ heading, close, children }: { heading: string; close: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null), title = useId()
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="academic-dialog" aria-labelledby={title} onClose={close}>
    <div className="academic-dialog-head">
      <h2 id={title}>{heading}</h2>
      <button type="button" className="academic-close" aria-label="Cerrar" onClick={() => dialog.current?.close()}><X size={20}/></button>
    </div>
    {children}
  </dialog>
}
function useCard(member?: string) {
  const [card, setCard] = useState<Card>(), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    setCard(undefined)
    request<Card>('academic-profile' + (member ? '&member=' + encodeURIComponent(member) : ''))
      .then(value => { if (active) setCard(value) })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [member, retry])
  const loading = error
    ? <div role="alert">{error} <button className="back" onClick={() => setRetry(r => r + 1)}>Reintentar</button></div>
    : <p role="status">Cargando perfil…</p>
  return { card, setCard, loading }
}
export function MemberCard({ member, close }: { member: string; close: () => void }) {
  const { card, loading } = useCard(member)
  return <Modal heading="Perfil del aula" close={close}>{card ? <>
    <Identity card={card}/>
    <h3>Colección de insignias</h3>
    {card.earned.length ? <BadgeList ids={card.earned}/> : <p>Todavía no ha obtenido insignias.</p>}
  </> : loading}</Modal>
}
const fields: { key: Single; label: string; empty: string }[] = [
  { key: 'color', label: 'Color del nombre', empty: 'Color habitual' },
  { key: 'frame', label: 'Marco de perfil', empty: 'Sin marco' },
  { key: 'title', label: 'Título académico', empty: 'Sin título' },
]
function Settings({ card, photo, saved }: { card: Card; photo: string | null; saved: (card: Card) => void }) {
  const [draft, setDraft] = useState<Equipped>(card.equipped), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [message, setMessage] = useState('')
  const badges = catalog.filter(entry => entry.badge && card.earned.includes(entry.id))
  function update(next: Equipped) { setDraft(next); setMessage(''); setError('') }
  async function save() {
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await request<Card>('academic-profile', draft)
      setDraft(result.equipped)
      saved(result)
      setMessage('Perfil guardado.')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  return <>
    <Identity card={{ ...card, photo }} equipped={draft}/>
    <form onSubmit={e => { e.preventDefault(); void save() }}>
      <fieldset className="academic-fields" disabled={busy}>
        <legend className="sr-only">Apariencia</legend>
        {fields.map(({ key, label, empty }) => <label key={key}>{label}
          <select value={draft[key] ?? ''} onChange={e => update({ ...draft, [key]: e.target.value || null })}>
            <option value="">{empty}</option>
            {catalog.filter(entry => entry[key]).map(entry => {
              const unlocked = card.earned.includes(entry.id)
              return <option key={entry.id} value={entry.id} disabled={!unlocked}>
                {entry[key]}{unlocked ? '' : ' · Pendiente'}
              </option>
            })}
          </select>
        </label>)}
      </fieldset>
      <fieldset className="academic-featured" disabled={busy}>
        <legend>Insignias destacadas <small>{draft.badges.length}/3</small></legend>
        {badges.length === 0 && <p>Las insignias que consigas aparecerán aquí.</p>}
        {badges.map(entry => {
          const checked = draft.badges.includes(entry.id)
          return <label key={entry.id}><input type="checkbox" checked={checked} disabled={!checked && draft.badges.length >= 3}
            onChange={() => update({ ...draft, badges: checked ? draft.badges.filter(id => id !== entry.id) : [...draft.badges, entry.id] })}/>
            {entry.badge}</label>
        })}
      </fieldset>
      <div className="actions"><button className="primary" disabled={busy || JSON.stringify(draft) === JSON.stringify(card.equipped)}>
        {busy ? 'Guardando…' : 'Guardar perfil'}</button>
        {message && <span role="status">{message}</span>}
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
    <details className="academic-rules"><summary>Cómo desbloquear los elementos</summary>
      <p>Las bandas corresponden a la escala de práctica de MathX. Una prueba revisada tiene intervención del profesor y una puntuación completa.</p>
      <ul>{catalog.map(entry => {
        const earned = card.earned.includes(entry.id)
        return <li key={entry.id}>
          {earned ? <Check size={16} aria-label="Conseguido"/> : <LockKeyhole size={15} aria-label="Pendiente"/>}
          <div><strong>{[entry.color, entry.frame, entry.title, entry.badge].filter(Boolean).join(' · ')}</strong><p>{entry.rule}</p></div>
        </li>
      })}</ul>
    </details>
  </>
}
function EditorDialog({ photo, close, changed }: { photo: string | null; close: () => void; changed: Changed }) {
  const { card, setCard, loading } = useCard()
  return <Modal heading="Personalizar perfil" close={close}>{card ?
    <Settings card={card} photo={photo} saved={v => { setCard(v); changed(v.equipped) }}/> : loading}</Modal>
}
export function AcademicEditor({ photo, changed }: { photo: string | null; changed: Changed }) {
  const [open, setOpen] = useState(false)
  return <><button className="secondary" type="button" onClick={() => setOpen(true)}>
    <SlidersHorizontal size={16}/> Personalizar perfil</button>
    {open && <EditorDialog photo={photo} changed={changed} close={() => setOpen(false)}/>}
  </>
}
