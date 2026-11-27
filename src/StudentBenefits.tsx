import { useState } from 'react'
import { available, catalog, categories, item, useAcademicCard, type BenefitKind, type Card } from './academic'
import { ApiError, request } from './request'

export function StudentBenefits({ studentId }: { studentId: string }) {
  const action = 'student-benefits&id=' + encodeURIComponent(studentId)
  const { card, setCard, loading, reload } = useAcademicCard(action)
  const [kind, setKind] = useState<BenefitKind>('color'), [id, setId] = useState('')
  const [equip, setEquip] = useState(false), [replace, setReplace] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const owned = !!card && available(card, kind, id)
  const featured = card?.equipped.badges ?? []
  const equipped = kind === 'badge' ? featured.includes(id) : card?.equipped[kind] === id
  const needsReplacement = kind === 'badge' && equip && !equipped && featured.length >= 3

  function choose(value: string) {
    setId(value)
    setReplace('')
    setMessage('')
    setError('')
  }
  async function assign() {
    if (!id || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await request<Card>(action, { kind, id, equip, ...(needsReplacement && { replace }) })
      setCard(result)
      const label = '«' + item(id)?.[kind] + '»'
      setMessage(equip ? 'El perfil de ' + result.name + ' ya muestra ' + label + '.' : result.name + ' ya puede usar ' + label + '.')
    } catch (e) {
      setError((e as Error).message)
      if (e instanceof ApiError && e.status === 409) { setReplace(''); reload() }
    } finally { setBusy(false) }
  }
  return <section className="student-benefits" aria-label="Beneficios de perfil">
    <h3>Beneficios de perfil</h3>
    {card ? <form onSubmit={e => { e.preventDefault(); void assign() }}>
      <fieldset className="benefit-options" disabled={busy}>
        <legend className="sr-only">Asignación de beneficios</legend>
        <label>Tipo de beneficio
          <select value={kind} onChange={e => { setKind(e.target.value as BenefitKind); choose(''); setEquip(false) }}>
            {categories.map(group => <option key={group.key} value={group.key}>{group.label}</option>)}
          </select>
        </label>
        <label>Beneficio
          <select required value={id} onChange={e => choose(e.target.value)}>
            <option value="">Elegir beneficio</option>
            {catalog.filter(entry => entry[kind]).map(entry => <option key={entry.id} value={entry.id}>
              {entry[kind]}{card.earned.includes(entry.id) ? ' · Por práctica' : card.grants?.[kind]?.includes(entry.id) ? ' · Del profesor' : ''}
            </option>)}
          </select>
        </label>
        <label className="benefit-equip"><input type="checkbox" checked={equip}
          onChange={e => { setEquip(e.target.checked); choose(id) }}/>Equipar ahora en el perfil</label>
        {id && needsReplacement && <label>Insignia destacada que se sustituirá
          <select required value={replace} onChange={e => setReplace(e.target.value)}>
            <option value="">Elegir una de las tres</option>
            {featured.map(badge => <option key={badge} value={badge}>{item(badge)?.badge}</option>)}
          </select>
        </label>}
      </fieldset>
      <button type="submit" className="primary" disabled={busy || !id || (owned && (!equip || equipped)) || (needsReplacement && !replace)}>
        {busy ? 'Guardando…' : owned && equip ? 'Equipar beneficio' : 'Asignar beneficio'}
      </button>
      {!message && owned && <p>{equipped ? 'El alumno ya lo lleva equipado.' : 'Disponible en la colección del alumno.'}</p>}
    </form> : loading}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>
}
