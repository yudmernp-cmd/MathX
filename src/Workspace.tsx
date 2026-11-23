import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  BookOpen,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Run } from './math/session'
import { key, score } from './math/session'
import { levelName, partMarks, points } from './math/model'
import { correct, answerNumber } from './math/grading'
import { MathText, DataFigure } from './Figures'
type Props = {
  run: Run
  change: (update: Partial<Run>) => void
  home: () => void
  another: () => void
}
export function Workspace({ run, change, home, another }: Props) {
  const [now, setNow] = useState(Date.now)
  const [dialog, setDialog] = useState<'finish' | 'exit' | null>(null)
  const [solution, setSolution] = useState(false)
  const sim = run.mode === 'Simulacros',
    locked = run.finished || run.checked,
    q = run.questions[run.index],
    scores = score(run)
  useEffect(() => {
    if (!sim || run.finished) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      if (t >= run.deadline) {
        change({ finished: true })
        setDialog(null)
      }
    }
    tick()
    const timer = window.setInterval(tick, 500)
    return () => window.clearInterval(timer)
  }, [run.deadline, run.finished, sim, change])
  const seconds = Math.max(0, Math.ceil((run.deadline - now) / 1000))
  function jump(index: number) {
    change({ index })
    setSolution(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  if (run.ticket && run.finished && !run.sent)
    return <p role="status">Entrega del simulacro pendiente de confirmación.</p>
  const showSolutions = run.finished || solution
  return (
    <div className="workspace">
      <div className="toolbar">
        <button
          className="back"
          onClick={() => (sim && !run.finished ? setDialog('exit') : home())}
        >
          <ArrowLeft size={17} /> Configuración
        </button>
        <span className="seed">Semilla {run.seed}</span>
      </div>
      <section className="work-head">
        <div>
          <div className="eyebrow mint">
            {run.config.course} NM{sim && ' · PRUEBA ' + run.config.paper}
          </div>
          <h1>
            {sim
              ? run.finished
                ? 'Revisión del simulacro'
                : 'Simulacro en curso'
              : 'Ejercicio individual'}
          </h1>
          <div className="work-meta">
            {sim && (
              <span>
                <Calculator size={15} />
                Calculadora gráfica requerida
              </span>
            )}
            {!sim && <span>{levelName[q.level]}</span>}
          </div>
        </div>
        {sim && !run.finished && (
          <div className="timer">
            <Clock3 size={19} />
            <strong>
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:
              {String(seconds % 60).padStart(2, '0')}
            </strong>
          </div>
        )}
      </section>
      {sim && locked && (
        <section className="result" aria-live="polite">
          <CheckCircle2 />
          <div>
            <b>
              {sim ? 'Resultado del simulacro' : 'Comprobación del ejercicio'}
            </b>
            <p>
              {scores.verified}{' '}
              {scores.verified === 1
                ? 'punto verificado'
                : 'puntos verificados'}{' '}
              · {scores.pending}{' '}
              {scores.pending === 1 ? 'pendiente' : 'pendientes'} de revisión ·{' '}
              {scores.total} puntos posibles.{' '}
              {scores.withoutScheme > 0 &&
                `${scores.withoutScheme} puntos sin esquema de calificación.`}
            </p>
            {run.ticket && run.sent && (
              <p>
                {run.counted
                  ? 'Resultado registrado en la convocatoria.'
                  : 'La convocatoria o el plazo de entrega ha terminado.'}
              </p>
            )}
            <small>
              La comprobación automática valora el resultado numérico. Revisa el
              procedimiento escrito con el baremo. Puntuación de práctica.
            </small>
          </div>
        </section>
      )}
      <div className={'work-layout ' + (!sim ? 'solo' : '')}>
        <section className="panel question">
          <div className="qmeta">
            <span className="eyebrow">
              {'PREGUNTA ' + (sim ? run.index + 1 : run.ordinal || 1)}
            </span>
            <span>
              {q.origin === 'real'
                ? 'Pregunta de examen'
                : q.origin === 'adapted'
                  ? 'Variante de examen · datos modificados'
                  : 'Original de MathX'}{' '}
              {sim && ' · ' + points(q) + ' puntos · ' + levelName[q.level]}
            </span>
          </div>
          {q.theme && <p className="question-theme">{q.theme}</p>}
          <h2>{q.topic}</h2>
          <p key={run.index} className="stem preserve-lines exam-stem">
            <MathText text={q.stem} />
          </p>
          {(q.origin === 'real' || q.origin === 'adapted') && q.provenance && (
            <p className="hint">
              {q.origin === 'adapted' && 'Basada en '}
              {[
                q.provenance.session,
                q.provenance.year,
                'Pregunta ' + q.provenance.number,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {q.assets
            ?.filter((a) => a.part === -1)
            .map((a) => (
              <img
                className="exam-image"
                key={a.id}
                src={'/api/classroom?action=asset&id=' + a.id}
                alt={a.alt}
              />
            ))}
          {q.figure && <DataFigure data={q.figure} />}
          {q.origin !== 'real' && (
            <p className="hint">
              Da resultados exactos o redondeados a tres cifras significativas.
              Puedes usar fracciones y expresiones como √(2).{' '}
              {sim &&
                'Escribe el procedimiento para revisar los puntos de método.'}
            </p>
          )}
          {q.parts.map((p, j) => {
            const id = key(run.index, j),
              letter = String.fromCharCode(97 + j),
              val = run.answers[id] || '',
              note = run.notes[id] || ''
            function answer(s: string) {
              change({ answers: { ...run.answers, [id]: s } })
            }
            return (
              <div key={id} className="part">
                <div className="prompt">
                  {sim && <b>{p.label ?? '(' + letter + ')'}</b>}
                  <label className="preserve-lines" htmlFor={'answer' + id}>
                    <MathText text={p.ask} />
                  </label>
                  {sim && partMarks(p) > 0 && <small>{partMarks(p)} pt</small>}
                </div>
                {q.assets
                  ?.filter((a) => a.part === j)
                  .map((a) => (
                    <img
                      className="exam-image"
                      key={a.id}
                      src={'/api/classroom?action=asset&id=' + a.id}
                      alt={a.alt}
                    />
                  ))}
                {p.figure && <DataFigure data={p.figure} />}
                {partMarks(p) === 0 ? null : p.value === null && !p.numeric ? (
                  <textarea
                    id={'answer' + id}
                    value={val}
                    readOnly={locked}
                    onChange={(e) => answer(e.target.value)}
                    placeholder="Escribe tu razonamiento"
                  />
                ) : (
                  <>
                    <input
                      id={'answer' + id}
                      value={val}
                      readOnly={locked}
                      onChange={(e) => answer(e.target.value)}
                      placeholder="Tu respuesta"
                      autoComplete="off"
                    />
                    {sim && (
                      <details key={id + 'work'}>
                        <summary>Procedimiento</summary>
                        <textarea
                          aria-label={'Procedimiento ' + letter}
                          value={note}
                          readOnly={locked}
                          onChange={(e) =>
                            change({
                              notes: { ...run.notes, [id]: e.target.value },
                            })
                          }
                          placeholder="Escribe los pasos para revisar los puntos de método"
                        />
                      </details>
                    )}
                  </>
                )}
                {locked && partMarks(p) > 0 && (
                  <div
                    role="status"
                    className={
                      'feedback ' +
                      (p.value !== null &&
                      correct(val, p.value, p.percentage, p.unit)
                        ? 'yes'
                        : '')
                    }
                  >
                    {!val.trim()
                      ? 'Sin respuesta'
                      : p.value === null
                        ? q.scheme === 'sin esquema'
                          ? 'Sin esquema de calificación'
                          : 'Pendiente de revisión humana'
                        : correct(val, p.value, p.percentage, p.unit)
                          ? sim
                            ? 'Resultado correcto · 1 punto verificado'
                            : 'Resultado correcto'
                          : answerNumber(val, p.percentage, p.unit) === null
                            ? 'Formato no reconocido'
                            : 'Resultado incorrecto'}
                  </div>
                )}
                {showSolutions && (
                  <div className="solution">
                    <strong>
                      {q.scheme === 'sin esquema'
                        ? 'Sin esquema de calificación disponible'
                        : 'Solución'}
                    </strong>
                    {p.steps.map((step, i) => (
                      <p key={i}>
                        <MathText text={step} />
                      </p>
                    ))}
                    {sim && !!p.rubric.length && (
                      <strong>
                        {q.origin === 'adapted'
                          ? 'Guía de revisión de MathX'
                          : q.origin === 'real'
                            ? 'Criterios de revisión'
                            : 'Criterios · 1 punto por criterio'}
                      </strong>
                    )}
                    <ul>
                      {p.rubric.map((x) => (
                        <li key={x}>
                          <MathText text={x} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
          {!sim ? (
            <div className="actions">
              {!run.checked ? (
                <button
                  className="primary"
                  onClick={() => change({ checked: true })}
                >
                  <Check size={17} />
                  Comprobar respuesta
                </button>
              ) : (
                <button
                  className="secondary"
                  onClick={() => {
                    change({ checked: false })
                    setSolution(false)
                  }}
                >
                  Volver a intentar
                </button>
              )}
              <button
                className="secondary"
                onClick={() => setSolution((x) => !x)}
              >
                <BookOpen size={17} />
                {solution ? 'Ocultar solución' : 'Ver solución'}
              </button>
              <button className="secondary" onClick={another}>
                Siguiente ejercicio <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="actions">
              <button
                className="secondary"
                disabled={run.index === 0}
                onClick={() => jump(run.index - 1)}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              {run.index < run.questions.length - 1 ? (
                <button className="primary" onClick={() => jump(run.index + 1)}>
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              ) : run.finished ? (
                <button className="primary" onClick={home}>
                  Volver a configuración
                </button>
              ) : (
                <button className="primary" onClick={() => setDialog('finish')}>
                  Finalizar simulacro
                </button>
              )}
            </div>
          )}
        </section>
        {sim && (
          <aside className="panel navigator">
            <div className="section-title">
              <FileText size={20} />
              <h2>Preguntas</h2>
            </div>
            <div className="navbuttons">
              {run.questions.map((ques, i) => (
                <button
                  key={i}
                  aria-label={'Pregunta ' + (i + 1)}
                  aria-current={run.index === i ? 'step' : undefined}
                  className={
                    run.index === i
                      ? 'current'
                      : ques.parts.some((_, j) =>
                            run.answers[key(i, j)]?.trim(),
                          )
                        ? 'filled'
                        : ''
                  }
                  onClick={() => jump(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p>
              {
                run.questions.filter((item, i) =>
                  item.parts.every(
                    (part, j) =>
                      partMarks(part) === 0 || run.answers[key(i, j)]?.trim(),
                  ),
                ).length
              }{' '}
              de {run.questions.length} preguntas completadas · 80 puntos
            </p>
            {!run.finished && (
              <button className="secondary" onClick={() => setDialog('finish')}>
                Finalizar simulacro
                <ArrowRight size={16} />
              </button>
            )}
          </aside>
        )}
      </div>
      {dialog && (
        <dialog
          ref={(el) => {
            if (el && !el.open) el.showModal()
          }}
          onCancel={() => setDialog(null)}
          aria-label={
            dialog === 'exit' ? 'Salir del simulacro' : 'Finalizar simulacro'
          }
        >
          <h2>
            {dialog === 'exit'
              ? '¿Descartar este simulacro?'
              : '¿Finalizar el simulacro?'}
          </h2>
          <p>
            {dialog === 'exit'
              ? 'Se perderán las respuestas de esta sesión.'
              : 'Al finalizar podrás revisar las soluciones y los puntos de cada inciso.'}
          </p>
          <div className="actions">
            <button
              className="secondary"
              autoFocus
              onClick={() => setDialog(null)}
            >
              Continuar resolviendo
            </button>
            <button
              className="primary"
              onClick={() => {
                if (dialog === 'exit') home()
                else change({ finished: true })
                setDialog(null)
              }}
            >
              {dialog === 'exit' ? 'Descartar' : 'Confirmar finalización'}
            </button>
          </div>
        </dialog>
      )}
    </div>
  )
}
