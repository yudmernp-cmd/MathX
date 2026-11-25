import { useEffect, useState } from 'react'

export type ProPaper = {
  id: string
  signature: string
  title: string
  paper: 1 | 2
  deadline: number
}
export type ProAttempt = ProPaper & { owner: string; answers: string; finished: boolean }
export const proStorageKey = 'mathx.pro.1'
export function restorePro(owner: string): ProAttempt | null {
  try {
    const a = JSON.parse(sessionStorage.getItem(proStorageKey) || 'null')
    if (a?.owner !== owner || ![1, 2].includes(a.paper) ||
        !/^[a-f0-9]{64}$/.test(a.id) || !/^[a-f0-9]{64}$/.test(a.signature) ||
        typeof a.title !== 'string' || typeof a.answers !== 'string' ||
        !Number.isSafeInteger(a.deadline)) return null
    return a
  } catch { return null }
}

export function ProExam({ attempt, update, leave }: {
  attempt: ProAttempt
  update: (attempt: ProAttempt) => void
  leave: () => void
}) {
  const [now, setNow] = useState(Date.now)
  const seconds = Math.max(0, Math.ceil((attempt.deadline - now) / 1000))
  const closed = attempt.finished || seconds === 0
  const url = '/api/pro-paper?' + new URLSearchParams({ id: attempt.id, signature: attempt.signature })
  useEffect(() => {
    if (closed) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [closed])
  return (
    <section className="panel pro-exam">
      <h1>Simulacro Pro · Prueba {attempt.paper}</h1>
      <p>{attempt.title} · 80 puntos</p>
      <p className="timer">{closed ? 'Simulacro finalizado' :
        'Tiempo restante ' + Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')}</p>
      <a href={url} target="_blank" rel="noreferrer">Abrir cuadernillo en otra pestaña</a>
      <iframe src={url} title={'Cuadernillo de Prueba ' + attempt.paper} />
      <label htmlFor="pro-answers">Respuestas y procedimiento</label>
      <small>Numera tus respuestas. Se guardan en esta pestaña.</small>
      <textarea id="pro-answers" rows={8} value={attempt.answers} readOnly={closed}
        onChange={e => {
          if (Date.now() < attempt.deadline) update({ ...attempt, answers: e.target.value })
        }} />
      {closed ? (
        <button className="secondary" onClick={leave}>Volver a la configuración</button>
      ) : (
        <button className="primary" onClick={() => {
          if (window.confirm('¿Finalizar este simulacro y cerrar tus respuestas?'))
            update({ ...attempt, finished: true })
        }}>Finalizar simulacro</button>
      )}
    </section>
  )
}
