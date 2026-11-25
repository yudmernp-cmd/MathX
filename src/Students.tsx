import { useEffect, useRef, useState } from 'react'
import { request } from './request'

export function Enrollment() {
  const [code, setCode] = useState(''),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false)
  async function enroll(form: HTMLFormElement) {
    const values = new FormData(form)
    setBusy(true)
    setCode('')
    setErr('')
    try {
      const r = await request<{ name: string; code: string }>('enroll', {
        name: values.get('name'),
        dni: values.get('dni'),
      })
      form.reset()
      setCode(r.name + ' · ' + r.code)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="boards">
      <h1>Inscripción de alumnos</h1>
      {err && (
        <p role="alert" className="error">
          {err}
        </p>
      )}
      <section className="panel">
        <form
          className="roster"
          onSubmit={(e) => {
            e.preventDefault()
            void enroll(e.currentTarget)
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
    </div>
  )
}

type Student = {
  id: string
  name: string
  dni: string | null
  hasCode: boolean
  points: number
}

function Account({
  student,
  refresh,
  onRemoved,
}: {
  student: Student
  refresh: () => Promise<void>
  onRemoved: (message: string) => void
}) {
  const [shown, setShown] = useState(''),
    [code, setCode] = useState(''),
    [dni, setDni] = useState('')
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  async function act(
    operation: string,
    data: { code?: string; dni?: string } = {},
  ) {
    const warning =
      operation === 'delete'
        ? 'Se eliminarán su cuenta, entregas y avance.'
        : operation === 'reset'
          ? 'Se borrarán sus puntos, entregas e historial de práctica. Conservará su código.'
          : operation === 'code'
            ? 'Su código anterior dejará de funcionar y deberá iniciar sesión de nuevo.'
            : ''
    if (
      warning &&
      !window.confirm(student.name + ' · ' + warning + ' ¿Continuar?')
    )
      return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await request<{ code?: string | null }>('student', {
        id: student.id,
        operation,
        ...data,
      })
      if (operation === 'reveal' || operation === 'code') {
        setShown(result.code ?? '')
        setCode('')
      }
      if (operation !== 'reveal') {
        if (operation === 'delete')
          onRemoved(student.name + ' fue eliminado del aula.')
        if (operation === 'reset')
          onRemoved('Se reinició el avance de ' + student.name + '.')
        await refresh()
        setMessage(
          operation === 'code' ? 'Código actualizado.' : 'Cambios guardados.',
        )
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section
      className="panel account-editor"
      aria-label={'Cuenta de ' + student.name}
    >
      <h2>{student.name}</h2>
      <p>Usuario de ingreso · {student.name}</p>
      <p>DNI · {student.dni ?? 'Pendiente de confirmar'}</p>
      <p>Puntos · {student.points}</p>
      {!student.dni && (
        <form
          className="roster"
          onSubmit={(e) => {
            e.preventDefault()
            void act('dni', { dni })
          }}
        >
          <label>
            DNI de la inscripción
            <input
              required
              pattern="[0-9]{8}"
              maxLength={8}
              inputMode="numeric"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
          </label>
          <button className="secondary" disabled={busy}>
            Confirmar DNI
          </button>
        </form>
      )}
      <h3>Código personal de acceso</h3>
      {shown ? (
        <p>
          Código vigente · <strong>{shown}</strong>{' '}
          <button className="secondary" onClick={() => setShown('')}>
            Ocultar código
          </button>
        </p>
      ) : student.hasCode ? (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => act('reveal')}
        >
          Ver código
        </button>
      ) : (
        <p>
          El código anterior estará disponible tras el próximo ingreso del
          alumno. También puedes asignarle uno nuevo.
        </p>
      )}
      <form
        className="roster"
        onSubmit={(e) => {
          e.preventDefault()
          void act('code', { code })
        }}
      >
        <label>
          Nuevo código de seis dígitos
          <input
            required
            pattern="[0-9]{6}"
            maxLength={6}
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <div className="actions">
          <button className="primary" disabled={busy}>
            Cambiar código
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => act('code')}
          >
            Generar nuevo código
          </button>
        </div>
      </form>
      <div className="actions account-actions">
        <button
          className="secondary"
          disabled={busy}
          onClick={() => act('reset')}
        >
          Reiniciar avance
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => act('delete')}
        >
          Eliminar alumno
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  )
}

export function Students() {
  const [rows, setRows] = useState<Student[] | null>(null),
    [selected, select] = useState('')
  const [search, setSearch] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const revision = useRef(0)
  async function load() {
    const current = ++revision.current
    try {
      const data = await request<Student[]>('directory')
      if (current === revision.current) {
        setRows(data)
        setError('')
      }
    } catch (e) {
      if (current === revision.current) setError((e as Error).message)
    }
  }
  useEffect(() => {
    void load()
    return () => {
      revision.current++
    }
  }, [])
  const match = search.trim().toLocaleLowerCase('es')
  const filtered = rows?.filter(
    (s) =>
      s.name.toLocaleLowerCase('es').includes(match) || s.dni?.includes(match),
  )
  const student = rows?.find((s) => s.id === selected)
  return (
    <div className="boards">
      <h1>Usuarios del aula</h1>
      <div className="directory-layout">
        <section className="panel">
          <h2>Alumnos inscritos{rows && ' · ' + rows.length}</h2>
          <label className="directory-search">
            Buscar por nombre o DNI
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error} <button onClick={load}>Reintentar</button>
            </p>
          )}
          {!rows && !error && <p role="status">Cargando alumnos…</p>}
          {filtered?.length === 0 && (
            <p>
              {rows?.length
                ? 'Sin coincidencias.'
                : 'Todavía no hay alumnos inscritos.'}
            </p>
          )}
          <ul className="student-list">
            {filtered?.map((s) => (
              <li key={s.id}>
                <button
                  aria-pressed={s.id === selected}
                  onClick={() => {
                    select(s.id)
                    setNotice('')
                  }}
                >
                  <strong>{s.name}</strong>
                  <span>{s.dni ?? 'DNI pendiente'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {student && (
          <Account
            key={student.id}
            student={student}
            refresh={load}
            onRemoved={(message) => {
              select('')
              setNotice(message)
            }}
          />
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
    </div>
  )
}
