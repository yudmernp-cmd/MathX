import { useEffect, useState } from 'react'
import { MathText, DataFigure } from './Figures'
import type { Figure, Problem } from './math/model'
import { request } from './request'

export type ReportRef = { id: string; student?: string; assigned?: boolean }
export type ReportLink = {
  ref: ReportRef
  title: string
  paper: number
  at: number
  name: string
  waiting: number
}
type ImagePart = { image: string; width: number; height: number }
type Block = ImagePart | { parts: (string | ImagePart)[] }
type Mark = {
  label: string
  ask?: string
  answer: string
  notes: string
  steps: string[]
  rubric?: string[]
  figure?: Figure
  max: number
  earned: number
  pending: number
}
type Row = {
  topic?: string
  theme?: string
  stem?: string
  figure?: Figure
  assets?: Problem['assets']
  blocks?: Block[]
  parts: Mark[]
  earned: number
  pending: number
  max: number
  teacherScore?: number
  legacy?: string
  review?: { reason?: string; feedback?: string; resolved?: number }
}
export type ExamReport = {
  ref: ReportRef
  title: string
  paper: 1 | 2
  rows: Row[]
  comment?: string
  at: number
  assetURL?: string
  legacyNotes?: string
}
export const boundaries = {
  1: [0, 12, 20, 30, 39, 50, 58],
  2: [0, 11, 21, 30, 41, 53, 63],
}
export const band = (paper: 1 | 2, points: number) =>
  boundaries[paper].filter((n) => points >= n).length

export function ExamResults({
  source,
  leave,
  teacher = false,
}: {
  source: ReportRef | ExamReport
  leave: () => void
  teacher?: boolean
}) {
  const initial = 'rows' in source ? source : undefined
  const ref = initial?.ref ?? (source as ReportRef)
  const [report, setReport] = useState(initial),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0)
  const [editing, setEditing] = useState<number | null>(null),
    [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    if (!initial || retry) {
      setError('')
      request<ExamReport>('report', { action: 'open', ref })
        .then((r) => {
          if (active) setReport(r)
        })
        .catch((e) => {
          if (active) setError(e.message)
        })
    }
    return () => {
      active = false
    }
  }, [ref.id, ref.student, ref.assigned, retry])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const back = (
    <button className="back" onClick={leave}>
      Volver al aula
    </button>
  )
  const alert = error && (
    <p role="alert">
      {error}{' '}
      <button className="secondary" onClick={() => setRetry((n) => n + 1)}>
        Reintentar
      </button>
    </p>
  )
  if (!report)
    return (
      <section className="panel">
        {back}
        {alert || <p role="status">Cargando resultados…</p>}
      </section>
    )
  const earned = report.rows.reduce((n, q) => n + q.earned, 0),
    pending = report.rows.reduce((n, q) => n + q.pending, 0)
  const cutoff = boundaries[report.paper]
  const topics = [...new Set(report.rows.map((q) => q.theme).filter(Boolean))]
  function image(fig: ImagePart, i: number, inline: boolean) {
    return (
      <img
        key={i}
        loading="lazy"
        className={inline ? 'pro-formula' : 'pro-figure'}
        alt={inline ? 'Expresión matemática' : 'Figura de la pregunta'}
        src={report!.assetURL + fig.image}
        style={{ width: fig.width / 11 + 'em' }}
      />
    )
  }
  async function save(e: React.FormEvent<HTMLFormElement>, index: number) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    setNotice('')
    try {
      setReport(
        await request<ExamReport>(
          'report',
          teacher
            ? {
                action: 'resolve',
                ref,
                index,
                score: Number(form.get('score')),
                feedback: form.get('message'),
              }
            : { action: 'appeal', ref, index, reason: form.get('message') },
        ),
      )
      setEditing(null)
      setNotice(
        teacher ? 'Puntuación actualizada.' : 'Solicitud enviada al profesor.',
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="exam-results">
      {back}
      <header>
        <p className="eyebrow">
          {report.title} · Prueba {report.paper}
        </p>
        <h1>Resultados de la prueba</h1>
      </header>
      <div className="panel result-summary">
        <div>
          <span>Puntos {pending ? 'confirmados' : 'obtenidos'}</span>
          <strong>{earned} / 80</strong>
        </div>
        <div>
          <span>{pending ? 'Banda provisional' : 'Banda'}</span>
          <strong>{band(report.paper, earned)} / 7</strong>
        </div>
        {pending > 0 && (
          <p>
            {pending} puntos pendientes de revisión. Con esos puntos la banda
            puede llegar a {band(report.paper, earned + pending)}.
          </p>
        )}
        {report.comment && <p>Comentario del profesor · {report.comment}</p>}
        <details>
          <summary>Ver bandas de la Prueba {report.paper}</summary>
          <ul>
            {cutoff.map((min, i) => (
              <li key={min}>
                Banda {i + 1} · {min} a {(cutoff[i + 1] ?? 81) - 1} puntos
              </li>
            ))}
          </ul>
        </details>
        {topics.length > 0 && (
          <details>
            <summary>Informe por tema</summary>
            {topics.map((t) => {
              const group = report.rows.filter((q) => q.theme === t)
              return (
                <p key={t}>
                  {t} · {group.reduce((n, q) => n + q.earned, 0)} /{' '}
                  {group.reduce((n, q) => n + q.max, 0)} puntos
                </p>
              )
            })}
          </details>
        )}
      </div>
      {report.legacyNotes && (
        <details>
          <summary>Borrador de la versión anterior</summary>
          <p className="preserve-lines">{report.legacyNotes}</p>
        </details>
      )}
      <h2>Solucionario por pregunta</h2>
      <p>
        La corrección automática de práctica asigna los puntos del inciso a una
        respuesta final reconocida. El profesor puede valorar el procedimiento y
        conceder crédito parcial.
      </p>
      {alert}
      {notice && <p role="status">{notice}</p>}
      {report.rows.map((q, i) => (
        <details
          className="panel report-question"
          key={i}
          open={i === 0 || undefined}
        >
          <summary>
            Pregunta {i + 1} · {q.earned} / {q.max} puntos
            {q.pending > 0 && ' · En revisión'}
          </summary>
          {q.topic && <h3>{q.topic}</h3>}
          {q.stem && (
            <p className="preserve-lines">
              <MathText text={q.stem} />
            </p>
          )}
          {q.figure && <DataFigure data={q.figure} />}
          {q.assets
            ?.filter((a) => a.part === -1)
            .map((a) => (
              <img
                key={a.id}
                loading="lazy"
                className="exam-image"
                src={'/api/classroom?action=asset&id=' + a.id}
                alt={a.alt}
              />
            ))}
          {q.blocks && (
            <details className="pro-question">
              <summary>Ver enunciado y figuras</summary>
              {q.blocks.map((b, k) =>
                'parts' in b ? (
                  <p key={k}>
                    {b.parts.map((p, j) =>
                      typeof p === 'string' ? p : image(p, j, true),
                    )}
                  </p>
                ) : (
                  image(b, k, false)
                ),
              )}
            </details>
          )}
          {q.legacy && (
            <p className="preserve-lines">
              Respuesta a la pregunta completa · {q.legacy}
            </p>
          )}
          {q.parts.map((p, j) => (
            <section className="report-part" key={j}>
              <h4>
                {p.label === 'question' ? 'Respuesta' : 'Inciso ' + p.label}
                {q.teacherScore === undefined &&
                  (p.max
                    ? ' · ' + p.earned + ' / ' + p.max + ' pt'
                    : ' · puntuación conjunta')}
              </h4>
              {p.ask && (
                <p>
                  <MathText text={p.ask} />
                </p>
              )}
              {q.assets
                ?.filter((a) => a.part === j)
                .map((a) => (
                  <img
                    key={a.id}
                    loading="lazy"
                    className="exam-image"
                    src={'/api/classroom?action=asset&id=' + a.id}
                    alt={a.alt}
                  />
                ))}
              {p.figure && <DataFigure data={p.figure} />}
              <p className="preserve-lines">
                <b>Respuesta entregada</b> · {p.answer || 'Sin respuesta'}
              </p>
              {p.notes && (
                <p className="preserve-lines">
                  <b>Procedimiento entregado</b> · {p.notes}
                </p>
              )}
              <div className="solution">
                <b>Solución</b>
                {p.steps.map((s, k) => (
                  <p key={k}>
                    <MathText text={s} />
                  </p>
                ))}
                {!!p.rubric?.length && (
                  <details>
                    <summary>Criterios de corrección</summary>
                    {p.rubric.map((s, k) => (
                      <p key={k}>
                        <MathText text={s} />
                      </p>
                    ))}
                  </details>
                )}
              </div>
            </section>
          ))}
          {q.review?.reason && (
            <p>
              <b>Solicitud de revisión</b> · {q.review.reason}
            </p>
          )}
          {q.review?.feedback && (
            <p>
              <b>Respuesta del profesor</b> · {q.review.feedback}
            </p>
          )}
          {editing === i ? (
            <form onSubmit={(e) => save(e, i)}>
              {teacher && (
                <label>
                  Puntos de la pregunta
                  <input
                    name="score"
                    required
                    type="number"
                    min="0"
                    max={q.max}
                    step="1"
                    defaultValue={q.earned}
                  />
                </label>
              )}
              <label>
                {teacher
                  ? 'Respuesta al alumno'
                  : '¿Qué inciso y qué parte de tu respuesta debería revisar el profesor?'}
                <textarea required maxLength={2000} name="message" />
              </label>
              <div className="actions">
                <button className="primary" disabled={busy}>
                  {teacher ? 'Publicar corrección' : 'Enviar solicitud'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : teacher || !q.review?.reason || q.review.resolved ? (
            <button
              className="secondary"
              onClick={() => {
                setEditing(i)
                setNotice('')
              }}
            >
              {teacher ? 'Revisar puntos' : 'Solicitar revisión'}
            </button>
          ) : (
            <p role="status">Solicitud pendiente de revisión</p>
          )}
        </details>
      ))}
    </section>
  )
}
