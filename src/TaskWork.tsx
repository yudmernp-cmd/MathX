import { useEffect, useRef, useState } from 'react'
import { MathText, DataFigure } from './Figures'
import { ExamResults } from './ExamResults'
import { MathKeys } from './MathKeys'
import { partMarks, points, type Problem } from './math/model'
import { task, type Attempt, type Grade } from './learning'
import { correct } from './math/grading'

export function Prompt({ q }: { q: Problem }) {
  return (
    <>
      <p className="preserve-lines">
        <MathText text={q.stem} />
      </p>
      {q.figure && <DataFigure data={q.figure} />}
    </>
  )
}
function Assets({ q, part }: { q: Problem; part: number }) {
  return (
    <>
      {q.assets
        ?.filter((a) => a.part === part)
        .map((a) => (
          <img
            key={a.id}
            className="exam-image"
            alt={a.alt}
            src={'/api/classroom?action=asset&id=' + a.id}
          />
        ))}
    </>
  )
}
export function TaskWork({
  initial,
  leave,
  review,
}: {
  initial: Attempt
  leave: () => void
  review?: { student: string; name: string }
}) {
  const [a, setA] = useState(initial),
    [answers, setAnswers] = useState(initial.answers),
    [notes, setNotes] = useState(initial.notes),
    [index, setIndex] = useState(0),
    [msg, setMsg] = useState(''),
    [saveStatus, setSaveStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now)
  const [fullScreen, setFullScreen] = useState(!!document.fullscreenElement)
  const max =
    initial.kind === 'challenge' ? [20] : initial.questions.map(points)
  const [scores, setScores] = useState<string[]>(
      initial.grade?.scores.map(String) ?? max.map(() => ''),
    ),
    [comment, setComment] = useState(initial.grade?.comment ?? '')
  const locked = !!review || !!a.submitted,
    challenge = a.kind === 'challenge'
  const current = useRef({ answers, notes }),
    revision = useRef(a.revision),
    saved = useRef(current.current),
    chain = useRef(Promise.resolve()),
    finishing = useRef(false)
  const active = !locked,
    id = a.id
  const send = (final = false) => {
    const values = current.current
    const run = chain.current.then(async () => {
      if (saved.current === values && !final) return
      const r = await task<{ revision: number; submitted: boolean }>(
        final ? 'sendTask' : 'saveTask',
        { task: id, ...values, revision: revision.current },
      )
      revision.current = r.revision
      saved.current = values
      if (current.current === values) setSaveStatus('Respuestas guardadas')
      setMsg('')
      if (r.submitted) {
        const result = await task<Attempt>('myTask', { task: id })
        setA(result)
        setAnswers(result.answers)
        setNotes(result.notes)
        if (document.fullscreenElement)
          await document.exitFullscreen().catch(() => {})
      }
    })
    chain.current = run.catch(() => {})
    return run
  }
  // Flush edits still in the debounce window when the browser suspends the page.
  useEffect(() => {
    if (!active) return
    const flush = () => {
      if (saved.current === current.current || finishing.current) return
      const body = JSON.stringify({
        action: 'saveTask',
        task: id,
        ...current.current,
        revision: revision.current,
      })
      void fetch('/api/classroom?action=task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
    const online = () => {
      void send().catch((e) => setMsg(e.message))
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('online', online)
    }
  }, [active, id])
  function edit(key: string, v: string, isNote = false) {
    const field = isNote ? 'notes' : 'answers'
    const next = {
      ...current.current,
      [field]: { ...current.current[field], [key]: v },
    }
    current.current = next
    if (isNote) setNotes(next.notes)
    else setAnswers(next.answers)
    setSaveStatus('Guardando…')
  }
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => {
      if (!finishing.current) send().catch((e) => setMsg(e.message))
    }, 600)
    return () => clearTimeout(timer)
  }, [answers, notes, active])
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  async function finish() {
    if (finishing.current) return
    finishing.current = true
    setBusy(true)
    setMsg('')
    try {
      await send(true)
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {})
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      finishing.current = false
      setBusy(false)
    }
  }
  useEffect(() => {
    if (active && now >= a.deadline && !finishing.current) void finish()
  }, [active, now, a.deadline])
  useEffect(() => {
    if (!active) return
    const refreshIfClosed = (r: { active: boolean }) => {
      if (!r.active && !finishing.current) void finish()
    }
    if (!challenge) {
      const timer = setInterval(() => {
        task<{ active: boolean }>('taskStatus', { task: id })
          .then(refreshIfClosed)
          .catch(() => {})
      }, 30000)
      return () => clearInterval(timer)
    }
    const signal = (event: string, keepalive = false) => {
      const data = {
        action: 'signal',
        task: id,
        event,
        eventId: crypto.randomUUID(),
      }
      if (keepalive) {
        void fetch('/api/classroom?action=task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          keepalive: true,
        }).catch(() => {})
        return
      }
      task<{ active: boolean }>('signal', data)
        .then(refreshIfClosed)
        .catch(() => setSaveStatus('Sin conexión confirmada con el aula'))
    }
    signal(
      document.fullscreenElement
        ? 'Pantalla completa'
        : 'Pantalla completa no disponible',
    )
    const visibility = () =>
      signal(
        document.hidden ? 'Pestaña oculta' : 'Pestaña visible',
        document.hidden,
      )
    const fullscreen = () => {
      setFullScreen(!!document.fullscreenElement)
      signal(
        document.fullscreenElement
          ? 'Pantalla completa'
          : 'Salida de pantalla completa',
        true,
      )
    }
    const leavePage = () => signal('Salida de la página', true)
    const returned = () => signal('Regreso al reto')
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('fullscreenchange', fullscreen)
    window.addEventListener('pagehide', leavePage)
    window.addEventListener('pageshow', returned)
    const timer = setInterval(() => signal(''), 45000)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('fullscreenchange', fullscreen)
      window.removeEventListener('pagehide', leavePage)
      window.removeEventListener('pageshow', returned)
      leavePage()
    }
  }, [active, challenge, id])
  const q = a.questions[index]
  const topics = Array.from(new Set(a.questions.map((q) => q.theme ?? q.topic)))
  if (!challenge && locked && !review) return <ExamResults source={{ id: a.id, assigned: true }} leave={leave}/>
  return (
    <section className="panel task-work">
      <button
        className="back"
        disabled={busy}
        onClick={async () => {
          try {
            if (active) await send()
            if (document.fullscreenElement) await document.exitFullscreen()
            leave()
          } catch (e) {
            setMsg((e as Error).message)
          }
        }}
      >
        Volver al aula
      </button>
      <h1>{a.title}</h1>
      <p>
        {challenge
          ? 'Reto diario · Avanzado · 20 puntos'
          : 'Prueba tipo IB · Prueba ' + a.paper + ' · 80 puntos'}
        {review && ' · ' + review.name}
      </p>
      {active && (
        <p>
          Tiempo restante · {Math.max(0, Math.ceil((a.deadline - now) / 60000))}{' '}
          min {saveStatus && ' · ' + saveStatus}
        </p>
      )}
      {active && challenge && !fullScreen && (
        <div>
          <p>El reto está abierto fuera de pantalla completa.</p>
          {document.fullscreenEnabled && (
            <button
              className="secondary"
              onClick={() =>
                document.documentElement
                  .requestFullscreen()
                  .catch(() =>
                    setMsg(
                      'El navegador no permitió activar la pantalla completa.',
                    ),
                  )
              }
            >
              Volver a pantalla completa
            </button>
          )}
        </div>
      )}
      {locked && (
        <p role="status">
          {a.grade
            ? 'Nota publicada · ' +
              a.grade.points +
              ' / ' +
              (challenge ? 20 : 80)
            : 'Pendiente de revisión del profesor'}{' '}
          {a.grade?.comment}
        </p>
      )}
      {msg && (
        <p role="alert">
          {msg}{' '}
          {active && (
            <button className="secondary" onClick={leave}>
              Volver al aula para recuperar la entrega guardada
            </button>
          )}
        </p>
      )}
      {!challenge && locked && (
        <details open>
          <summary>Informe por tema</summary>
          {topics.map((theme) => {
            const indices = a.questions
              .map((q, i) => ((q.theme ?? q.topic) === theme ? i : -1))
              .filter((i) => i >= 0)
            const total = indices.reduce(
              (s, i) => s + points(a.questions[i]),
              0,
            )
            const checks = indices.reduce(
              (s, i) =>
                s +
                a.questions[i].parts.filter(
                  (p, j) =>
                    p.value !== null &&
                    correct(
                      answers[i + '-' + j] ?? '',
                      p.value,
                      p.percentage,
                      p.unit,
                    ),
                ).length,
              0,
            )
            return (
              <p key={theme}>
                {theme} ·{' '}
                {a.grade
                  ? indices.reduce((s, i) => s + a.grade!.scores[i], 0) +
                    ' / ' +
                    total +
                    ' puntos'
                  : total + ' puntos pendientes de revisión'}
                {a.reveal && ' · ' + checks + ' resultados numéricos correctos'}
              </p>
            )
          })}
        </details>
      )}
      {a.questions.length > 1 && (
        <nav className="task-pages" aria-label="Preguntas de la prueba">
          {a.questions.map((_, i) => (
            <button
              key={i}
              aria-pressed={index === i}
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
      <Prompt q={q} />
      <Assets q={q} part={-1} />
      {q.parts.map((p, j) => {
        const k = index + '-' + j
        return (
          <div className="part" key={k}>
            <strong>
              {q.parts.length > 1
                ? (p.label ?? '(' + String.fromCharCode(97 + j) + ')') + ' '
                : ''}
              <MathText text={p.ask} />
              {!challenge && partMarks(p) > 0 && (
                <small> · {partMarks(p)} pt</small>
              )}
            </strong>
            <Assets q={q} part={j} />
            {p.figure && <DataFigure data={p.figure} />}
            {partMarks(p) > 0 && (
              <>
                <label htmlFor={'task-answer' + k}>Respuesta</label>
                <textarea
                  id={'task-answer' + k}
                  maxLength={6000}
                  readOnly={locked || busy}
                  value={answers[k] ?? ''}
                  onChange={(e) => edit(k, e.target.value)}
                />
                {active && (
                  <MathKeys
                    target={'task-answer' + k}
                    change={(v) => edit(k, v)}
                  />
                )}
                <label htmlFor={'task-notes' + k}>Procedimiento</label>
                <textarea
                  id={'task-notes' + k}
                  maxLength={6000}
                  readOnly={locked || busy}
                  value={notes[k] ?? ''}
                  onChange={(e) => edit(k, e.target.value, true)}
                />
                {active && (
                  <MathKeys
                    target={'task-notes' + k}
                    change={(v) => edit(k, v, true)}
                  />
                )}
              </>
            )}
            {locked && a.reveal && (
              <details>
                <summary>Solución y criterios disponibles</summary>
                {[...p.steps, ...p.rubric].map((v, i) => (
                  <p key={i}>
                    <MathText text={v} />
                  </p>
                ))}
                {!p.steps.length && !p.rubric.length && (
                  <p>Revisión a cargo del profesor.</p>
                )}
              </details>
            )}
          </div>
        )
      })}
      {active && (
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            if (window.confirm('¿Entregar tus respuestas para revisión?'))
              void finish()
          }}
        >
          Entregar {challenge ? 'reto' : 'prueba tipo IB'}
        </button>
      )}
      {review && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setMsg('')
            try {
              const grade = await task<Grade>('grade', {
                task: id,
                student: review.student,
                scores: scores.map(Number),
                comment,
              })
              setA({ ...a, grade })
              setMsg('Nota publicada.')
            } catch (e) {
              setMsg((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <h2>Corrección del profesor</h2>
          {max.map((n, i) => (
            <label key={i}>
              {challenge ? 'Reto' : 'Pregunta ' + (i + 1)} · puntos de {n}
              <input
                required
                type="number"
                min={0}
                max={n}
                step={1}
                value={scores[i]}
                onChange={(e) =>
                  setScores(
                    scores.map((v, j) => (i === j ? e.target.value : v)),
                  )
                }
              />
            </label>
          ))}
          <label>
            Comentario
            <textarea
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            Publicar nota
          </button>
        </form>
      )}
    </section>
  )
}
