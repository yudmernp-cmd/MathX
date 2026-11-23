import { useCallback, useEffect, useRef, useState } from 'react'
import { CourseCover } from './CourseCover'
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  LogOut,
} from 'lucide-react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './style.css'
import { Setup, type Catalog } from './Setup'
import { DrillWorkspace } from './DrillWorkspace'
import { drillRun, drillThemeName, type Drill } from './math/drills'
import { themes } from './math/model'
import { Workspace } from './Workspace'
import { restore, storageKey, type Run, type Mode } from './math/session'
import type { Config } from './math/model'
import { withHistory, HistoryError } from './practiceHistory'

import { ApiError, request } from './request'
import { Boards } from './Boards'
function clearSession() {
  try {
    for (const k of [storageKey, 'mathx.session.1'])
      sessionStorage.removeItem(k)
  } catch {}
}
function Classroom({
  onExpired,
  owner,
}: {
  onExpired: () => void
  owner: string
}) {
  const [run, setRun] = useState<Run | null>(() => {
    const stored = restore()
    if (stored?.owner !== owner) return null
    return stored?.mode === 'Ejercicios' && !stored.questions[0]?.drill
      ? null
      : stored
  })
  const [config, setConfig] = useState<Config>({
    course: 'MAI',
    paper: 1,
    difficulty: 'Medio',
    ...run?.config,
    theme: run?.config.theme ?? themes[0],
    drillLevel: run?.config.drillLevel ?? 3,
  })
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
          e instanceof ApiError || e instanceof HistoryError
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
    withHistory(undefined, undefined, owner).catch(report)
  }, [report, owner])
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
      const next = await withHistory(
        async (ticket) => {
          if (mode === 'Simulacros')
            return request<Run>('exam', { ...config, ...ticket })
          const items = await request<Drill[]>('drills', {
            tema: drillThemeName(config.theme),
            cantidad: 15,
            dificultad_objetivo: config.drillLevel ?? 3,
            ...ticket,
          })
          return drillRun(items, config, ticket.draw)
        },
        mode === 'Ejercicios'
          ? 'drills:' + config.theme + ':' + config.drillLevel
          : 'serie',
        owner,
      )
      if (!next) return
      setRun({ ...next, owner })
      window.scrollTo(0, 0)
    } catch (e) {
      report(e)
      window.scrollTo(0, 0)
    } finally {
      pending.current = false
      setLoading(false)
    }
  }
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!run?.finished || !run.ticket || run.sent) return
    let live = true
    request<{ counted: boolean; questions: Run['questions'] }>('submit', {
      ticket: run.ticket,
      answers: run.answers,
    })
      .then((result) => {
        if (live) {
          setError('')
          change({
            sent: true,
            counted: result.counted,
            questions: result.questions,
          })
        }
      })
      .catch((e) => {
        if (live) report(e)
      })
    return () => {
      live = false
    }
  }, [run?.finished, run?.ticket, run?.sent, retry, change, report])
  function home() {
    setRun(null)
    try {
      sessionStorage.removeItem(storageKey)
    } catch {}
    setError('')
  }
  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error}{' '}
          {run?.finished && run.ticket && !run.sent && (
            <button
              className="secondary"
              onClick={() => setRetry((n) => n + 1)}
            >
              Reintentar entrega
            </button>
          )}
        </p>
      )}
      {storageFailed && (
        <p role="status">
          Mantén abierta esta página para conservar las respuestas.
        </p>
      )}
      {run ? (
        run.questions[0]?.drill ? (
          <DrillWorkspace
            key={run.seed}
            run={run}
            change={change}
            another={begin}
            busy={loading}
            home={home}
          />
        ) : (
          <Workspace
            key={run.seed}
            run={run}
            change={change}
            another={begin}
            home={home}
          />
        )
      ) : catalog.length ? (
        <Setup
          config={config}
          setConfig={(c) => {
            setConfig(c)
            setError('')
          }}
          mode={mode}
          setMode={(m) => {
            setMode(m)
            setError('')
          }}
          begin={begin}
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
type Identity = { expires: number; id?: string; admin?: boolean }
function App() {
  const [identity, setIdentity] = useState<Identity>({ expires: 0 }),
    [adminForm, setAdminForm] = useState(false),
    [ranking, setRanking] = useState(false)
  const [name, setName] = useState(''),
    [dni, setDni] = useState('')

  const [unavailable, setUnavailable] = useState(false)
  const [expires, setExpires] = useState<number | null>(null),
    [password, setPassword] = useState('')
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const expire = useCallback(() => {
    clearSession()
    setIdentity({ expires: 0 })
    setRanking(false)
    setName('')
    setDni('')
    setExpires(0)
    setPassword('')
  }, [])
  const check = useCallback(async () => {
    try {
      const s = await request<Identity>('status')
      setUnavailable(false)
      if (s.expires > Date.now()) {
        setIdentity(s)
        setExpires(s.expires)
      } else expire()
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
        const s = await request<Identity>(
          'login',
          adminForm ? { admin: true, password } : { name, dni, code: password },
        )
        setIdentity(s)
        setName('')
        setDni('')
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
            <img src="/mathx.svg" width="32" height="32" alt="" />
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
              <LogOut size={16} aria-hidden="true" /> Salir del aula
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
          identity.admin ? (
            <Boards admin />
          ) : (
            <>
              <nav className="section-tabs" aria-label="Aula">
                <button
                  className="secondary"
                  aria-pressed={!ranking}
                  onClick={() => setRanking(false)}
                >
                  <BookOpen size={16} aria-hidden="true" /> Práctica
                </button>
                <button
                  className="secondary"
                  aria-pressed={ranking}
                  onClick={() => setRanking(true)}
                >
                  <ChartNoAxesColumnIncreasing size={16} aria-hidden="true" />{' '}
                  Clasificaciones
                </button>
              </nav>
              {ranking ? (
                <Boards admin={false} />
              ) : (
                <Classroom
                  key={identity.id}
                  owner={identity.id!}
                  onExpired={expire}
                />
              )}
            </>
          )
        ) : unavailable ? (
          <section className="panel login">
            <h1>Acceso al aula</h1>
            <button className="secondary" onClick={check}>
              Comprobar disponibilidad
            </button>
          </section>
        ) : (
          <div className="access-layout">
            <CourseCover />
            <form
              className="panel login"
              onSubmit={(e) => {
                e.preventDefault()
                auth(false)
              }}
            >
              <h1>{adminForm ? 'Administración' : 'Acceso al aula'}</h1>
              {!adminForm && (
                <>
                  <label htmlFor="name">Nombre</label>
                  <input
                    id="name"
                    placeholder="Nombre registrado"
                    autoComplete="name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <label htmlFor="dni">DNI</label>
                  <input
                    id="dni"
                    placeholder="8 dígitos"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{8}"
                    maxLength={8}
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                  />
                </>
              )}
              <label htmlFor="class-key">
                {adminForm ? 'Clave de administración' : 'Código personal'}
              </label>
              <input
                id="class-key"
                placeholder={
                  adminForm ? 'Clave de administración' : '6 dígitos'
                }
                pattern={adminForm ? undefined : '[0-9]{6}'}
                maxLength={adminForm ? 256 : 6}
                inputMode={adminForm ? undefined : 'numeric'}
                type="password"
                value={password}
                autoComplete="current-password"
                required
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="primary" disabled={busy}>
                {busy ? 'Entrando…' : 'Entrar al aula'}{' '}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="back"
                onClick={() => {
                  setAdminForm(!adminForm)
                  setPassword('')
                  setError('')
                }}
              >
                {adminForm ? 'Acceso de estudiantes' : 'Administración'}
              </button>
            </form>
          </div>
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
