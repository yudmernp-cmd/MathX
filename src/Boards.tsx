import { useCallback, useEffect, useState } from 'react'
import { request } from './request'
type Row = { name: string; points: number }
type Data = {
  exercises: Row[]
  exams: Row[] | null
  examTitle?: string
  legacy?: boolean
}
function Ranking({
  title,
  rows,
  detail,
}: {
  title: string
  rows: Row[]
  detail: string
}) {
  return (
    <section className="panel ranking">
      <h2>{title}</h2>
      <p>{detail}</p>
      {rows.length ? (
        <table>
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Estudiante</th>
              <th>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{rows.findIndex((x) => x.points === r.points) + 1}</td>
                <td>{r.name}</td>
                <td>{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Aún no hay resultados.</p>
      )}
    </section>
  )
}
export function Boards({ admin }: { admin: boolean }) {
  const [data, setData] = useState<Data | null>(null),
    [err, setErr] = useState(''),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try {
      setData(await request<Data>('boards'))
      setErr('')
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [])
  useEffect(() => {
    void load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])
  async function action(fn: () => Promise<void>) {
    setBusy(true)
    setErr('')
    try {
      await fn()
      await load()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="boards">
      <h1>{admin ? 'Gestión del aula' : 'Clasificaciones'}</h1>
      {err && <p role="alert">{err}</p>}
      {admin && (
        <section className="panel">
          <h2>Inscribir estudiante</h2>
          <form
            className="roster"
            onSubmit={(e) => {
              e.preventDefault()
              const form = e.currentTarget,
                values = new FormData(form)
              setCode('')
              void action(async () => {
                const r = await request<{ name: string; code: string }>(
                  'enroll',
                  { name: values.get('name'), dni: values.get('dni') },
                )
                form.reset()
                setCode(r.name + ' · ' + r.code)
              })
            }}
          >
            <label>
              Nombre
              <input required maxLength={80} name="name" autoComplete="off" />
            </label>
            <label>
              DNI
              <input
                required
                name="dni"
                inputMode="numeric"
                pattern="[0-9]{8}"
                maxLength={8}
                autoComplete="off"
              />
            </label>
            <button className="primary" disabled={busy}>
              Crear código personal
            </button>
          </form>
          {code && (
            <p role="status">
              Entrega este código en privado. <strong>{code}</strong>{' '}
              <button className="secondary" onClick={() => setCode('')}>
                Ocultar
              </button>
            </p>
          )}
        </section>
      )}
      {data && (
        <>
          <Ranking
            title="Top de ejercicios"
            rows={data.exercises}
            detail="Un punto por ejercicio distinto resuelto y hasta 20 por cada reto corregido."
          />
          {data.exams !== null && (
            <Ranking
              title="Top de simulacros"
              rows={data.exams}
              detail={
                data.legacy
                  ? 'Convocatoria anterior · mejores resultados verificados.'
                  : (data.examTitle ?? 'Convocatoria') +
                    ' · notas publicadas por el profesor, sobre 80.'
              }
            />
          )}
        </>
      )}
      <button className="secondary" onClick={load}>
        Actualizar clasificaciones
      </button>
    </div>
  )
}
