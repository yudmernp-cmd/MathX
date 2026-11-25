import { useEffect, useRef, useState } from 'react'
import { MathKeys } from './MathKeys'

export type ProPaper = {
  id: string
  signature: string
  title: string
  paper: 1 | 2
  deadline: number
}
export type ProAttempt = ProPaper & {
  owner: string
  responses: Record<number, string>
  current: number
  legacyNotes?: string
  finished: boolean
}
type Figure = { image: string; width: number; height: number }
type Question = { number: number; marks: number; blocks: (Figure | { parts: (string | Figure)[] })[] }

export const proStorageKey = 'mathx.pro.1'
export function restorePro(owner: string): ProAttempt | null {
  try {
    const a = JSON.parse(sessionStorage.getItem(proStorageKey) || 'null')
    if (a?.owner !== owner || ![1, 2].includes(a.paper) ||
        !/^[a-f0-9]{64}$/.test(a.id) || !/^[a-f0-9]{64}$/.test(a.signature) ||
        typeof a.title !== 'string' || !Number.isSafeInteger(a.deadline)) return null
    const responses = a.responses ?? {}
    if (typeof responses !== 'object' || Array.isArray(responses) ||
        !Object.values(responses).every(v => typeof v === 'string')) return null
    return {
      ...a, responses, legacyNotes: a.legacyNotes ?? a.answers,
      current: Number.isSafeInteger(a.current) && a.current >= 0 ? a.current : 0,
    }
  } catch { return null }
}

export function ProExam({ attempt, update, leave, onExpired }: {
  attempt: ProAttempt
  update: (attempt: ProAttempt) => void
  leave: () => void
  onExpired: () => void
}) {
  const [now, setNow] = useState(Date.now)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const seconds = Math.max(0, Math.ceil((attempt.deadline - now) / 1000))
  const closed = attempt.finished || seconds === 0
  const url = '/api/pro-paper?' + new URLSearchParams({ id: attempt.id, signature: attempt.signature })

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    setQuestions([])
    async function load() {
      const res = await fetch(url, { signal: controller.signal })
      if (res.status === 401) { onExpired(); return }
      if (!res.ok) throw new Error()
      const data: Question[] = await res.json()
      if (!Array.isArray(data) || !data.length) throw new Error()
      if (!controller.signal.aborted) setQuestions(data)
    }
    load().catch(() => {
      if (!controller.signal.aborted) setError('No se pudieron cargar las preguntas.')
    })
    return () => controller.abort()
  }, [url, retry, onExpired])
  useEffect(() => {
    if (closed) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [closed])

  const current = Math.min(attempt.current, questions.length - 1)
  const question = questions[current]
  function go(index: number) {
    update({ ...attempt, current: index })
    requestAnimationFrame(() => heading.current?.focus())
  }
  function answer(value: string) {
    if (!attempt.finished && Date.now() < attempt.deadline)
      update({ ...attempt, responses: { ...attempt.responses, [question.number]: value } })
  }
  function figure(f: Figure, inline: boolean, key: number) {
    return <img key={key} className={inline ? 'pro-formula' : 'pro-figure'}
      src={url + '&asset=' + f.image} width={Math.ceil(f.width)} height={Math.ceil(f.height)}
      alt={inline ? 'Expresión matemática' : 'Figura original de la pregunta ' + question.number}
      style={{ width: f.width / 11 + 'em' }} />
  }
  return (
    <section className="panel pro-exam" lang="es">
      <h1>Simulacro Pro · Prueba {attempt.paper}</h1>
      <p>{attempt.title} · 80 puntos · Traducción automática al español</p>
      <p className="timer">{closed ? 'Simulacro finalizado' :
        'Tiempo restante ' + Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')}</p>
      {error ? <div role="alert">{error} <button onClick={() => setRetry(r => r + 1)}>Reintentar</button></div> :
        !question && <p role="status">Cargando preguntas…</p>}
      {question && <>
        <nav className="pro-navigation" aria-label="Preguntas del simulacro">
          {questions.map((q, i) => <button key={q.number} aria-label={'Pregunta ' + q.number}
            aria-current={i === current ? 'step' : undefined} onClick={() => go(i)}>{q.number}</button>)}
        </nav>
        <article className="pro-question">
          <h2 ref={heading} tabIndex={-1}>Pregunta {question.number} de {questions.length}</h2>
          <p className="muted">{question.marks} puntos</p>
          {question.blocks.map((block, i) => 'parts' in block
            ? <p key={i}>{block.parts.map((part, j) => typeof part === 'string' ? part : figure(part, true, j))}</p>
            : figure(block, false, i))}
        </article>
        <label htmlFor="pro-answer">Respuesta y procedimiento de la pregunta {question.number}</label>
        <textarea id="pro-answer" rows={5} value={attempt.responses[question.number] ?? ''}
          readOnly={closed} onChange={e => answer(e.target.value)} />
        {!closed && <MathKeys target="pro-answer" change={answer} />}
        <div className="pro-controls">
          <button className="secondary" disabled={current === 0} onClick={() => go(current - 1)}>Anterior</button>
          <button className="secondary" disabled={current === questions.length - 1}
            onClick={() => go(current + 1)}>Siguiente pregunta</button>
        </div>
      </>}
      {attempt.legacyNotes && <details><summary>Respuestas guardadas en la versión anterior</summary>
        <p className="preserve-lines">{attempt.legacyNotes}</p></details>}
      {closed ? <button className="secondary" onClick={leave}>Volver a la configuración</button> :
        <button className="primary" onClick={() => {
          if (window.confirm('¿Finalizar este simulacro y cerrar tus respuestas?'))
            update({ ...attempt, finished: true })
        }}>Finalizar simulacro</button>}
    </section>
  )
}
