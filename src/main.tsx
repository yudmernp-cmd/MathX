import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './style.css'
import { Setup, type Catalog } from './Setup'
import { Workspace } from './Workspace'
import { restore, storageKey, type Run, type Mode } from './math/session'
import type { Config } from './math/model'

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}
async function request<T>(action: string, data?: unknown): Promise<T> {
  const res = await fetch('/api/classroom?action=' + action, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    ...(data === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
  })
  const body = await res.json()
  if (!res.ok)
    throw new ApiError(
      body.error || 'No se pudo consultar el aula.',
      res.status,
    )
  return body
}
function clearSession() {
  try {
    for (const k of [storageKey, 'mathx.session.1', 'mathx.recientes'])
      sessionStorage.removeItem(k)
  } catch {}
}
function Classroom({ onExpired }: { onExpired: () => void }) {
  const [run, setRun] = useState<Run | null>(restore)
  const [config, setConfig] = useState<Config>(
    run?.config || { course: 'MAI', paper: 1, difficulty: 'Medio' },
  )
  const [mode, setMode] = useState<Mode>(run?.mode || 'Ejercicios')
  const [catalog, setCatalog] = useState<Catalog>([])
  const [loading, setLoading] = useState(false),
    pending = useRef(false)
  const [error, setError] = useState(''),
    [storageFailed, setStorageFailed] = useState(false)
  const report = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) onExpired()
      else
        setError(
          e instanceof ApiError
            ? e.message
            : 'No se pudo conectar con el aula. Vuelve a intentarlo.',
        )
    },
    [onExpired],
  )
  const loadCatalog = useCallback(() => {
    setError('')
    request<Catalog>('catalog').then(setCatalog).catch(report)
  }, [report])
  useEffect(loadCatalog, [loadCatalog])
  useEffect(() => {
    if (!run) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(run))
      setStorageFailed(false)
    } catch {
      setStorageFailed(true)
    }
  }, [run])
  const change = useCallback(
    (patch: Partial<Run>) =>
      setRun((r) =>
        !r
          ? r
          : r.mode === 'Simulacros' && !r.finished && Date.now() >= r.deadline
            ? { ...r, finished: true }
            : { ...r, ...patch },
      ),
    [],
  )
  async function begin() {
    if (pending.current) return
    pending.current = true
    setLoading(true)
    setError('')
    try {
      let recent: string[] = []
      try {
        recent = JSON.parse(sessionStorage.getItem('mathx.recientes') || '[]')
      } catch {}
      const next = await request<Run>(
        mode === 'Ejercicios' ? 'practice' : 'exam',
        { ...config, recent },
      )
      next.ordinal = run?.mode === 'Ejercicios' ? (run.ordinal || 1) + 1 : 1
      if (mode === 'Ejercicios')
        try {
          sessionStorage.setItem(
            'mathx.recientes',
            JSON.stringify([...recent, next.questions[0].id].slice(-18)),
          )
        } catch {}
      setRun(next)
      window.scrollTo(0, 0)
    } catch (e) {
      report(e)
    } finally {
      pending.current = false
      setLoading(false)
    }
  }
  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {storageFailed && (
        <p role="status">
          Mantén abierta esta página para conservar las respuestas.
        </p>
      )}
      {run ? (
        <Workspace
          key={run.seed}
          run={run}
          change={change}
          another={begin}
          home={() => {
            setRun(null)
            try {
              sessionStorage.removeItem(storageKey)
            } catch {}
            setError('')
          }}
        />
      ) : catalog.length ? (
        <Setup
          config={config}
          setConfig={setConfig}
          mode={mode}
          setMode={(m) => {
            setMode(m)
            setError('')
          }}
          begin={begin}
          catalog={catalog}
          busy={loading}
        />
      ) : (
        <p role="status">
          {error ? (
            <button className="secondary" onClick={loadCatalog}>
              Volver a cargar el banco
            </button>
          ) : (
            'Cargando el banco del aula…'
          )}
        </p>
      )}
    </>
  )
}
function App() {
  const [unavailable, setUnavailable] = useState(false)
  const [expires, setExpires] = useState<number | null>(null),
    [password, setPassword] = useState('')
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const expire = useCallback(() => {
    clearSession()
    setExpires(0)
    setPassword('')
  }, [])
  const check = useCallback(async () => {
    try {
      const s = await request<{ expires: number }>('status')
      setUnavailable(false)
      if (s.expires > Date.now()) setExpires(s.expires)
      else expire()
      setError('')
    } catch (e) {
      setUnavailable(true)
      setExpires((v) => (v && v > Date.now() ? v : 0))
      setError(
        e instanceof ApiError
          ? e.message
          : 'No se pudo comprobar el acceso del aula.',
      )
    }
  }, [expire])
  useEffect(() => {
    check()
  }, [check])
  useEffect(() => {
    if (!expires) return
    const timer = window.setTimeout(expire, Math.max(0, expires - Date.now()))
    const focus = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', focus)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', focus)
    }
  }, [expires, expire, check])
  async function auth(logout: boolean) {
    setBusy(true)
    setError('')
    try {
      if (logout) {
        await request('logout', {})
        expire()
      } else {
        const s = await request<{ expires: number }>('login', { password })
        setPassword('')
        setExpires(s.expires)
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo conectar con el aula.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <header>
        <div className="shell header-row">
          <div className="brand">
            Math<span>X</span>
          </div>
          <span className="header-label">
            MAI NM · Aplicaciones e Interpretación
          </span>
          {!!expires && (
            <button
              className="back logout"
              onClick={() => auth(true)}
              disabled={busy}
            >
              Salir del aula
            </button>
          )}
        </div>
      </header>
      <main className="shell">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {expires === null ? (
          <p role="status">Comprobando acceso…</p>
        ) : expires ? (
          <Classroom onExpired={expire} />
        ) : unavailable ? (
          <section className="panel login">
            <h1>Acceso al aula</h1>
            <button className="secondary" onClick={check}>
              Comprobar disponibilidad
            </button>
          </section>
        ) : (
          <form
            className="panel login"
            onSubmit={(e) => {
              e.preventDefault()
              auth(false)
            }}
          >
            <h1>Acceso al aula</h1>
            <label htmlFor="class-key">Clave compartida de la clase</label>
            <input
              id="class-key"
              type="password"
              value={password}
              autoComplete="current-password"
              required
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="primary" disabled={busy}>
              Entrar al aula
            </button>
          </form>
        )}
      </main>
      <footer className="shell">
        <span>
          Math<b>X</b>
        </span>
        Práctica de Matemáticas IB · Nivel Medio
      </footer>
    </>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
