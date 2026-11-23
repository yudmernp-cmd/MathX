import { request } from './request'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { MathText } from './Figures'
import type { Run } from './math/session'
import { acceptsDrill } from './math/drills'

export function DrillWorkspace({
  run,
  change,
  another,
  home,
  busy,
}: {
  run: Run
  change: (patch: Partial<Run>) => void
  another: () => void
  home: () => void
  busy: boolean
}) {
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('')
  const [solution, setSolution] = useState(false)
  const i = run.index,
    q = run.questions[i].drill!,
    id = String(i),
    answer = run.answers[id] ?? '',
    checked = !!run.drillChecked?.[id]
  function jump(index: number) {
    setSolution(false)
    change({ index })
    window.scrollTo(0, 0)
  }
  const expr = q.expresion.startsWith('[')
    ? q.expresion.slice(1, -1)
    : '$' + q.expresion + '$'
  return (
    <div className="workspace">
      <div className="toolbar">
        <button className="back" onClick={home}>
          <ArrowLeft size={17} /> Configuración
        </button>
      </div>
      <section className="work-head">
        <div>
          <div className="eyebrow mint">MAI NM · {q.tema}</div>
          <h1>Ejercicios por tema</h1>
          <div className="work-meta">
            <span>Dificultad {q.dificultad} de 5</span>
          </div>
        </div>
      </section>
      <section className="panel question drill-card">
        <progress
          className="position-track"
          aria-label="Posición en la tanda"
          value={i + 1}
          max={run.questions.length}
        />
        <div className="qmeta">
          <span className="eyebrow">
            Ejercicio {i + 1} de {run.questions.length}
          </span>
          <span>Subtema {q.subtema}</span>
        </div>
        <h2>
          <label htmlFor="drill-answer">{q.instruccion}</label>
        </h2>
        <p key={run.questions[i].id} className="stem drill-expression">
          <MathText text={expr} />
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (saving) return
            setSaving(true)
            setError('')
            try {
              const { signature, ...drill } = q
              await request('submit', { signature, drill, answer })
              change({ drillChecked: { ...run.drillChecked, [id]: true } })
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setSaving(false)
            }
          }}
        >
          <input
            id="drill-answer"
            autoComplete="off"
            placeholder="Tu respuesta"
            value={answer}
            onChange={(e) =>
              change({
                answers: { ...run.answers, [id]: e.target.value },
                drillChecked: { ...run.drillChecked, [id]: false },
              })
            }
          />
          {error && <p role="alert">{error}</p>}
          {checked && (
            <p role="status" className="feedback">
              {acceptsDrill(q, answer)
                ? 'Resultado correcto'
                : 'Revisa tu respuesta.'}
            </p>
          )}
          <div className="actions">
            <button className="primary" disabled={saving || !answer.trim()}>
              <Check size={16} /> Comprobar respuesta
            </button>
            <button
              className="secondary"
              type="button"
              aria-expanded={solution}
              onClick={() => setSolution(!solution)}
            >
              {solution ? 'Ocultar solución' : 'Ver solución'}
            </button>
          </div>
        </form>
        {solution && (
          <div className="solution">
            <strong>Solución</strong>
            {q.solucion_pasos.map((step, j) => (
              <p key={j}>
                <MathText text={'$' + step + '$'} />
              </p>
            ))}
            <p>
              Respuesta <MathText text={'$' + q.respuesta + '$'} />
            </p>
          </div>
        )}
        <div className="actions">
          <button
            className="secondary"
            disabled={saving || i === 0}
            onClick={() => jump(i - 1)}
          >
            Anterior
          </button>
          {i + 1 < run.questions.length ? (
            <button
              className="secondary"
              disabled={saving}
              onClick={() => jump(i + 1)}
            >
              Siguiente ejercicio <ArrowRight size={16} />
            </button>
          ) : (
            <button className="primary" disabled={busy} onClick={another}>
              Generar otra tanda <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
