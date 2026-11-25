import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { CourseCover } from './CourseCover'
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  LogOut,
} from 'lucide-react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { storageKey } from './math/session'
import { ApiError, request } from './request'
import { Boards } from './Boards'
const Enrollment = lazy(() => import('./Students').then(m => ({ default: m.Enrollment })))
const Students = lazy(() => import('./Students').then(m => ({ default: m.Students })))

const Classroom = lazy(() => import('./Classroom'))
const LearningPanel = lazy(() =>
  import('./Learning').then(({ LearningPanel }) => ({ default: LearningPanel })),
)

function clearSession() {
  try {
    for (const k of [storageKey, 'mathx.session.1', 'mathx.pro.1'])
      sessionStorage.removeItem(k)
  } catch {}
}
type Identity = { expires: number; id?: string; admin?: boolean }
function App() {
  const [identity, setIdentity] = useState<Identity>({ expires: 0 }),
    [adminTab, setAdminTab] = useState('Actividades'),
    [adminForm, setAdminForm] = useState(false),
    [view, setView] = useState<'practice' | 'ranking' | 'learning'>('practice'),
    [working, setWorking] = useState(false)
  const [name, setName] = useState(''),
    [dni, setDni] = useState('')

  const [unavailable, setUnavailable] = useState(false)
  const sessionRequest = useRef(0)
  const [expires, setExpires] = useState(0),
    [password, setPassword] = useState('')
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const expire = useCallback(() => {
    sessionRequest.current++
    clearSession()
    setWorking(false)
    setIdentity({ expires: 0 })
    setView('practice')
    setAdminTab('Actividades')
    setName('')
    setDni('')
    setExpires(0)
    setPassword('')
  }, [])
  const check = useCallback(async (initial = false) => {
    const version = ++sessionRequest.current
    try {
      const s = await request<Identity>('status')
      if (version !== sessionRequest.current) return
      setUnavailable(false)
      if (s.expires > Date.now()) {
        setIdentity(s)
        setExpires(s.expires)
      } else if (initial) clearSession()
      else expire()
      setError('')
    } catch (e) {
      if (version !== sessionRequest.current) return
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
    void check(true)
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
    sessionRequest.current++
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
        setUnavailable(false)
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
          {!!expires && !working && (
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
        <Suspense fallback={<p role="status">Cargando el aula…</p>}>
          {expires ? (
            identity.admin ? (
              <>
                {!working && <nav className="section-tabs" aria-label="Administración del aula">
                  {['Actividades', 'Inscribir alumno', 'Usuarios', 'Clasificaciones'].map(tab =>
                    <button key={tab} className="secondary" aria-pressed={tab === adminTab}
                      onClick={() => setAdminTab(tab)}>{tab}</button>)}
                </nav>}
                {adminTab === 'Actividades' && <LearningPanel admin working={setWorking} />}
                {adminTab === 'Inscribir alumno' && <Enrollment />}
                {adminTab === 'Usuarios' && <Students />}
                {adminTab === 'Clasificaciones' && <Boards />}
              </>
            ) : (
              <>
                {!working && (
                  <nav className="section-tabs" aria-label="Aula">
                    <button
                      className="secondary"
                      aria-pressed={view === 'practice'}
                      onClick={() => setView('practice')}
                    >
                      <BookOpen size={16} aria-hidden="true" /> Práctica
                    </button>
                    <button
                      className="secondary"
                      aria-pressed={view === 'ranking'}
                      onClick={() => setView('ranking')}
                    >
                      <ChartNoAxesColumnIncreasing size={16} aria-hidden="true" />{' '}
                      Clasificaciones
                    </button>
                    <button
                      className="secondary"
                      aria-pressed={view === 'learning'}
                      onClick={() => setView('learning')}
                    >
                      Mi aula
                    </button>
                  </nav>
                )}
                {view === 'learning' ? (
                  <LearningPanel working={setWorking} />
                ) : view === 'ranking' ? (
                  <Boards />
                ) : (
                  <Classroom
                    openActivities={() => setView('learning')}
                    key={identity.id}
                    owner={identity.id!}
                    onExpired={expire}
                  />
                )}
              </>
            )
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
                {unavailable && (
                  <button type="button" className="secondary" onClick={() => check()}>
                    Comprobar disponibilidad
                  </button>
                )}
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
        </Suspense>
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
