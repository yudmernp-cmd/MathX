import { useCallback, useEffect, useState } from 'react'
import { Avatar } from './ProfilePhoto'
import { request } from './request'
type Row = { name: string; points: number; photo?: string }
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
                <td><span className="ranked-student"><Avatar photo={r.photo}/>{r.name}</span></td>
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
export function Boards() {
  const [data, setData] = useState<Data | null>(null),
    [err, setErr] = useState('')
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
  return (
    <div className="boards">
      <h1>Clasificaciones</h1>
      {err && <p role="alert">{err}</p>}
      {data && (
        <>
          <Ranking
            title="Top de ejercicios"
            rows={data.exercises}
            detail="Un punto por ejercicio distinto resuelto y hasta 20 por cada reto corregido."
          />
          {data.exams !== null && (
            <Ranking
              title="Top de pruebas tipo IB"
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
