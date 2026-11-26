import { useEffect, useRef, useState } from 'react'
import { request } from './request'
import {
  task,
  limaDate,
  stamp,
  type Attempt,
  type Learning,
  type Profile,
  type Review,
  type Task,
} from './learning'
import { ExamResults, type ReportLink } from './ExamResults'
import { ProfilePhoto } from './ProfilePhoto'
import { TaskWork, Prompt } from './TaskWork'
import { MathText, DataFigure } from './Figures'
import type { Problem } from './math/model'
type Source = { id: string; title: string; paper: number }
function Stats({ p }: { p: Profile }) {
  const rows = Object.entries(p.stats)
  const total = rows.reduce(
    (r, [, v]) => ({
      tried: r.tried + v.tried,
      solved: r.solved + v.solved,
      first: r.first + v.first,
    }),
    { tried: 0, solved: 0, first: 0 },
  )
  return (
    <>
      <p>
        {p.points} puntos acumulados · {total.solved} de {total.tried}{' '}
        ejercicios distintos resueltos en el seguimiento.
      </p>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tema · dificultad</th>
                <th>Practicados</th>
                <th>Resueltos</th>
                <th>Acierto inicial</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{v.tried}</td>
                    <td>{v.solved}</td>
                    <td>{Math.round((100 * v.first) / v.tried)} %</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          El desglose por tema comienza con el próximo ejercicio que compruebes.
        </p>
      )}
      {Object.keys(p.weeks).length > 0 && (
        <details>
          <summary>Evolución semanal por dificultad</summary>
          {Object.entries(p.weeks)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([week, levels]) => (
              <div key={week}>
                <b>Semana del {week}</b>
                {Object.entries(levels).map(([level, v]) => (
                  <p key={level}>
                    Nivel {level} · {v.first} de {v.tried} al primer intento
                  </p>
                ))}
              </div>
            ))}
        </details>
      )}
    </>
  )
}
function ClassStats({ students }: { students: Profile[] }) {
  const groups: Record<string, { tried: number; first: number }> = {}
  for (const p of students)
    for (const [k, v] of Object.entries(p.stats)) {
      const topic = k.split(' · ')[0]
      const row = (groups[topic] ??= { tried: 0, first: 0 })
      row.tried += v.tried
      row.first += v.first
    }
  return (
    Object.keys(groups).length > 0 && (
      <details>
        <summary>Acierto inicial por tema del aula</summary>
        {Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([topic, v]) => (
            <p key={topic}>
              {topic} · {v.first} de {v.tried} ejercicios al primer intento (
              {Math.round((100 * v.first) / v.tried)} %)
            </p>
          ))}
      </details>
    )
  )
}
export function ActivityNotice({ open }: { open: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  useEffect(() => {
    let live = true
    async function load() {
      try {
        const d = await request<Learning>('learning')
        if (live)
          setTasks(d.tasks.filter((t) => !t.submitted && t.closes > Date.now()))
      } catch {
        /* Mi aula ofrece reintento si la conexión falla. */
      }
    }
    void load()
    const timer = setInterval(load, 60000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [])
  if (!tasks.length) return null
  return (
    <aside className="activity-notice">
      <div>
        {tasks.map((t) => (
          <p key={t.id}>
            <strong>
              {t.kind === 'challenge'
                ? 'Reto diario · Avanzado · 20 puntos'
                : 'Prueba tipo IB asignada'}
            </strong>{' '}
            · {t.title}
          </p>
        ))}
      </div>
      <button className="secondary" onClick={open}>
        Ver en Mi aula
      </button>
    </aside>
  )
}
type Definition = Task & { question?: Problem; editVersion: number }
const limaInput = (t: number) => new Date(t - 18000000).toISOString().slice(0, 16)
function Publisher({ done, editing, cancel }: { done: () => void; editing: Definition | null; cancel: () => void }) {
  const current = editing?.question
  const own = current?.parts.length === 1 && current.parts[0].ask === 'Respuesta y procedimiento' && !current.provenance
  function timeValue(value: FormDataEntryValue | null, initial?: number) {
    return initial !== undefined && value === limaInput(initial) ? initial : Date.parse(value + ':00-05:00')
  }
  const [kind, setKind] = useState<string>(editing?.kind ?? 'challenge'),
    [mode, setMode] = useState(current && !own ? 'keep' : 'own'),
    [paper, setPaper] = useState(editing?.paper ?? 1),
    [sources, setSources] = useState<Source[]>([]),
    [source, setSource] = useState(''),
    [preview, setPreview] = useState<Problem | null>(null),
    [msg, setMsg] = useState(''),
    [busy, setBusy] = useState(false),
    [stem, setStem] = useState(own ? current.stem : ''),
    [title, setTitle] = useState(editing?.title ?? '')
  useEffect(() => {
    if (mode !== 'bank' || kind !== 'challenge') return
    let active = true
    task<Source[]>('sources')
      .then((a) => {
        if (active) setSources(a)
      })
      .catch((e) => {
        if (active) setMsg(e.message)
      })
    return () => {
      active = false
    }
  }, [mode, kind])
  useEffect(() => {
    setPreview(null)
    if (!source || mode !== 'bank') return
    let active = true
    task<Problem>('source', { sourceId: source })
      .then((q) => {
        if (active) setPreview(q)
      })
      .catch((e) => {
        if (active) setMsg(e.message)
      })
    return () => {
      active = false
    }
  }, [source, mode])
  const displayed = mode === 'keep' ? current : preview
  return (
    <form
      className="panel task-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setMsg('')
        const f = new FormData(e.currentTarget)
        try {
          await task(editing ? 'edit' : 'publish', {
            task: editing?.id,
            editVersion: editing?.editVersion,
            keepQuestions: mode === 'keep',
            replaceQuestions: f.has('replaceQuestions'),
            kind,
            title,
            paper,
            minutes: Number(f.get('minutes')),
            date: f.get('date'),
            opens: timeValue(f.get('opens'), editing?.opens),
            closes: timeValue(f.get('closes'), editing?.closes),
            showTop: f.has('showTop'),
            stem,
            solution: f.get('solution') ?? '',
            sourceId: mode === 'bank' ? source : undefined,
          })
          setMsg('Actividad publicada.')
          done()
        } catch (e) {
          setMsg((e as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <h2>{editing ? 'Editar actividad' : 'Asignar actividad'}</h2>
      {editing && <p>Los cambios de preguntas y duración se aplican a quienes empiecen después de guardar. Adelantar el cierre también acorta el plazo de los intentos abiertos.</p>}
      <label>
        Actividad
        <select
          disabled={!!editing}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value)
            setMsg('')
          }}
        >
          <option value="challenge">Reto diario avanzado · 20 puntos</option>
          <option value="exam">Convocatoria de prueba tipo IB · 80 puntos</option>
        </select>
      </label>
      <label>
        Título
        <input
          required
          autoFocus={!!editing}
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      {kind === 'challenge' ? (
        <>
          <label>
            Día del reto (Lima)
            <input
              type="date"
              required
              name="date"
              min={editing ? undefined : limaDate()}
              defaultValue={limaDate(editing?.opens)}
            />
          </label>
          <label>
            Origen
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {current && !own && <option value="keep">Pregunta actual</option>}
              <option value="own">Pregunta propia</option>
              <option value="bank">Banco autorizado de exámenes</option>
            </select>
          </label>
          {mode === 'own' ? (
            <>
              <label>
                Enunciado
                <textarea
                  required
                  value={stem}
                  maxLength={6000}
                  onChange={(e) => setStem(e.target.value)}
                />
              </label>
              <label>
                Solución para después del cierre
                <textarea name="solution" maxLength={6000} defaultValue={own ? current.parts[0].steps.join('\n') : ''} />
              </label>
            </>
          ) : null}
        </>
      ) : null}
      {(kind === 'exam' || mode === 'bank') && (
        <label>
          Prueba asignada
          <select
            value={paper}
            onChange={(e) => {
              setPaper(Number(e.target.value))
              setSource('')
            }}
          >
            <option value={1}>Prueba 1</option>
            <option value={2}>Prueba 2</option>
          </select>
        </label>
      )}
      {kind === 'challenge' && mode === 'bank' && (
        <label>
          Pregunta del banco
          <select
            required
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">Seleccionar pregunta</option>
            {sources
              .filter((x) => x.paper === paper)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
          </select>
        </label>
      )}
      {kind === 'challenge' && (mode === 'own' ? stem : displayed) && (
        <details>
          <summary>Vista previa del reto</summary>
          <h3>{title}</h3>
          {mode === 'own' ? (
            <MathText text={stem} />
          ) : (
            displayed && (
              <>
                <Prompt q={displayed} />
                {displayed.parts.map((p, i) => (
                  <div key={i}>
                    <MathText text={p.ask} />
                    {p.figure && <DataFigure data={p.figure} />}
                  </div>
                ))}
                {displayed.assets?.map((a) => (
                  <img
                    className="exam-image"
                    key={a.id}
                    alt={a.alt}
                    src={'/api/classroom?action=asset&id=' + a.id}
                  />
                ))}
              </>
            )
          )}
        </details>
      )}
      {kind === 'exam' && (
        <>
          <label>
            Inicio (hora de Lima)
            <input
              type="datetime-local"
              required
              name="opens"
              defaultValue={limaInput(editing?.opens ?? Date.now())}
            />
          </label>
          <label>
            Cierre (hora de Lima)
            <input
              type="datetime-local"
              required
              name="closes"
              defaultValue={limaInput(editing?.closes ?? Date.now() + 86400000)}
            />
          </label>
          <label>
            Duración en minutos
            <input
              required
              type="number"
              min={1}
              max={240}
              defaultValue={editing?.minutes ?? 90}
              name="minutes"
            />
          </label>
          <label>
            <input type="checkbox" name="showTop" defaultChecked={editing?.showTop} /> Mostrar top de esta
            convocatoria
          </label>
        </>
      )}
      {editing?.kind === 'exam' && <label><input type="checkbox" name="replaceQuestions" /> Sortear otras preguntas para esta convocatoria</label>}
      <button className="primary" disabled={busy}>
        {editing ? 'Guardar cambios' : kind === 'challenge' ? 'Publicar reto' : 'Publicar convocatoria'}
      </button>
      {editing && <button className="secondary" type="button" disabled={busy} onClick={cancel}>Cancelar edición</button>}
      {msg && <p role="status">{msg}</p>}
    </form>
  )
}
export function LearningPanel({
  admin = false,
  working,
}: {
  admin?: boolean
  working?: (v: boolean) => void
}) {
  const [data, setData] = useState<Learning | null>(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState<Attempt | null>(null),
    [review, setReview] = useState<Review>(),
    [pending, setPending] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportLink | null>(null)
  const [editing, setEditing] = useState<Definition | null>(null)
  const [notice, setNotice] = useState('')
  const version = useRef(0)
  async function load() {
    const n = ++version.current
    try {
      const d = await request<Learning>('learning')
      if (n === version.current) {
        setData(d)
        setError('')
      }
    } catch (e) {
      if (n === version.current) setError((e as Error).message)
    }
  }
  useEffect(() => {
    if (attempt || selectedReport) return
    void load()
    const timer = setInterval(load, admin ? 12000 : 30000)
    return () => {
      version.current++
      clearInterval(timer)
    }
  }, [admin, attempt, selectedReport])
  async function open(t: Task, r?: Review) {
    setPending(true)
    setError('')
    const start = !r && !t.submitted && t.closes > Date.now()
    try {
      if (start && t.kind === 'challenge' && !document.fullscreenElement)
        await document.documentElement.requestFullscreen?.().catch(() => {})
      const a = await task<Attempt>(
        r ? 'inspect' : start ? 'beginTask' : 'myTask',
        { task: t.id, student: r?.student },
      )
      setReview(r)
      setAttempt(a)
      working?.(true)
    } catch (e) {
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {})
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }
  async function changeActivity(t: Task, action: 'definition' | 'delete') {
    if (action === 'delete' && !confirm('¿Eliminar «' + t.title + '» junto con sus entregas, notas y puntos asociados?')) return
    setPending(true)
    setNotice('')
    try {
      if (action === 'definition') setEditing(await task<Definition>(action, { task: t.id }))
      else {
        await task(action, { task: t.id, editVersion: t.editVersion })
        if (editing?.id === t.id) setEditing(null)
        setNotice('Actividad eliminada.')
        await load()
      }
    } catch (e) { setError((e as Error).message) }
    finally { setPending(false) }
  }
  async function manage(t: Task, change: object) {
    setPending(true)
    try {
      await task('manage', { task: t.id, ...change })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }
  if (selectedReport) return <ExamResults source={selectedReport.ref} teacher={admin} leave={() => { setSelectedReport(null); working?.(false) }}/>
  if (attempt)
    return (
      <TaskWork
        initial={attempt}
        review={review}
        leave={() => {
          setAttempt(null)
          setReview(undefined)
          working?.(false)
        }}
      />
    )
  return (
    <div className="boards">
      <h1>{admin ? 'Panel del profesor' : 'Mi aula'}</h1>
      {error && (
        <p role="alert">
          {error} <button onClick={load}>Actualizar</button>
        </p>
      )}
      {data && <ProfilePhoto photo={data.photo} student={!admin} changed={photo => {
        version.current++
        setData(current => current && { ...current, photo })
      }}/>}
      {admin && data && (
        <section className="panel" aria-label="Avisos del reto">
          <h2>Avisos del reto</h2>
          <p>Actualización cada 12 segundos. Las horas se muestran en Lima.</p>
          <ul
            className="classroom-alerts"
            aria-live="polite"
            aria-relevant="additions"
            tabIndex={data.alerts?.length ? 0 : undefined}
          >
            {data.alerts?.map((x) => (
              <li key={[x.name, x.title, x.kind, x.at].join('|')}>
                {stamp(x.at)} · {x.name} · {x.kind} · {x.title}
              </li>
            ))}
          </ul>
          {!data.alerts?.length && <p>Sin incidencias registradas.</p>}
        </section>
      )}
      {admin && <Publisher key={editing ? editing.id + ':' + editing.editVersion : 'new'} editing={editing} cancel={() => setEditing(null)} done={() => {
        if (editing) { setEditing(null); setNotice('Cambios guardados.') }
        void load()
      }} />}
      {notice && <p role="status">{notice}</p>}
      {admin && data?.legacyRound && (
        <button
          className="secondary"
          disabled={pending}
          onClick={async () => {
            if (!confirm('¿Cerrar la convocatoria anterior?')) return
            setPending(true)
            try {
              await request('toggle', { active: false })
              await load()
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setPending(false)
            }
          }}
        >
          Cerrar convocatoria anterior
        </button>
      )}
      {data && (
        <button className="secondary" onClick={load}>
          Actualizar aula
        </button>
      )}
      {!data ? (
        <p>Cargando el aula…</p>
      ) : (
        <>
          <section className="panel">
            <h2>{admin ? 'Actividades asignadas' : 'Mis actividades'}</h2>
            {!data.tasks.length && <p>Todavía no hay actividades asignadas.</p>}
            {data.tasks.map((t) => (
              <article className="task-row" key={t.id}>
                <h3>{t.title}</h3>
                <p>
                  {t.kind === 'challenge'
                    ? 'Reto diario · Avanzado · 20 puntos'
                    : 'Convocatoria · Prueba ' +
                      t.paper +
                      ' · ' +
                      t.minutes +
                      ' min'}{' '}
                  · {stamp(t.opens)} – {stamp(t.closes)} (Lima)
                </p>
                {admin ? (
                  <div className="actions">
                    <button disabled={pending} className="secondary" onClick={() => changeActivity(t, 'definition')}>Editar</button>
                    <button disabled={pending} className="secondary" onClick={() => changeActivity(t, 'delete')}>Eliminar</button>
                    {t.kind === 'exam' && (
                      <button
                        disabled={pending}
                        className="secondary"
                        onClick={() => manage(t, { showTop: !t.showTop })}
                      >
                        {t.showTop ? 'Ocultar top' : 'Mostrar top'}
                      </button>
                    )}
                    {t.closes > Date.now() && (
                      <button
                        disabled={pending}
                        className="secondary"
                        onClick={() => {
                          if (
                            confirm(
                              '¿Cerrar el plazo ahora? Se recogerán las respuestas guardadas.',
                            )
                          )
                            void manage(t, { close: true })
                        }}
                      >
                        Cerrar plazo
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {t.kind === 'challenge' && !t.submitted && (
                      <p>
                        Al abrir el reto se solicitará pantalla completa. El
                        profesor verá los cambios de visibilidad, las salidas y
                        la última señal de conexión.
                      </p>
                    )}
                    {t.submitted && (
                      <p>
                        {t.grade
                          ? 'Nota publicada · ' + t.grade.points + ' puntos'
                          : 'Pendiente de revisión'}
                      </p>
                    )}
                    <button
                      className="primary"
                      disabled={pending}
                      onClick={() => open(t)}
                    >
                      {t.submitted
                        ? 'Ver entrega'
                        : t.started
                          ? 'Continuar'
                          : t.kind === 'challenge'
                            ? 'Resolver reto'
                            : 'Resolver prueba tipo IB'}
                    </button>
                  </>
                )}
              </article>
            ))}
          </section>
          {!!data.results?.length && <section className="panel"><h2>{admin ? 'Revisiones de pruebas' : 'Mis resultados de pruebas'}</h2>
            {data.results.map(item => <article className="task-row" key={item.ref.id + item.ref.student}>
              <h3>{admin && item.name + ' · '}{item.title} · Prueba {item.paper}</h3>
              <p>{stamp(item.at)}{item.waiting > 0 && ' · Revisión solicitada'}</p>
              <button className="secondary" onClick={()=>{setSelectedReport(item);working?.(true)}}>{admin ? 'Abrir revisión' : 'Ver resultados'}</button>
            </article>)}</section>}
          {data.profile && (
            <section className="panel">
              <h2>Mi progreso</h2>
              <Stats p={data.profile} />
            </section>
          )}
          {admin && (
            <>
              <section className="panel">
                <h2>Entregas para revisar</h2>
                {data.reviews?.map((r) => (
                  <article className="task-row" key={r.task + r.student}>
                    <b>
                      {r.name} · {r.title}
                    </b>
                    <p>
                      {r.grade
                        ? r.grade.points + ' puntos publicados'
                        : 'Pendiente de revisión'}{' '}
                      · {stamp(r.time)}
                    </p>
                    <button
                      className="secondary"
                      disabled={pending}
                      onClick={() =>
                        open(
                          data.tasks.find((t) => t.id === r.task)!,
                          r,
                        )
                      }
                    >
                      Revisar entrega
                    </button>
                  </article>
                ))}
                {!data.reviews?.length && <p>Aún no hay entregas.</p>}
              </section>
              <section className="panel">
                <h2>Participación del aula</h2>
                <p>
                  {data.students?.length} estudiantes inscritos ·{' '}
                  {
                    data.students?.filter(
                      (p) =>
                        p.activity && p.activity > Date.now() - 7 * 86400000,
                    ).length
                  }{' '}
                  con actividad en los últimos siete días
                </p>
                <ClassStats students={data.students ?? []} />
                {data.students?.map((p, i) => (
                  <details key={i}>
                    <summary>
                      {p.name} · {p.points} puntos
                    </summary>
                    <p>
                      Última actividad registrada ·{' '}
                      {p.activity
                        ? stamp(p.activity)
                        : 'Sin actividad registrada'}
                    </p>
                    <Stats p={p} />
                  </details>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
