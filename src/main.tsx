import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './style.css'
import { Setup } from './Setup'
import { Workspace } from './Workspace'
import { start, restore, storageKey, type Run, type Mode } from './math/session'
import { signature } from './math/engine'
import type { Config } from './math/model'
function App() {
  const [run, setRun] = useState<Run | null>(restore)
  const [config, setConfig] = useState<Config>(
    run?.config || { course: 'MAI', paper: 1, difficulty: 'Mixto' },
  )
  const [mode, setMode] = useState<Mode>(run?.mode || 'Ejercicios')
  const [error, setError] = useState('')
  const [storageFailed, setStorageFailed] = useState(false)
  useEffect(() => {
    try {
      if (run) sessionStorage.setItem(storageKey, JSON.stringify(run))
      else sessionStorage.removeItem(storageKey)
      setStorageFailed(false)
    } catch {
      setStorageFailed(true)
    }
  }, [run])
  const change = useCallback(
    (patch: Partial<Run>) =>
      setRun((r) => {
        if (!r) return r
        if (r.mode === 'Simulacros' && !r.finished && Date.now() >= r.deadline)
          return { ...r, finished: true }
        return { ...r, ...patch }
      }),
    [],
  )
  function begin() {
    setError('')
    const historyKey = [
      'mathx.recent',
      config.course,
      config.paper,
      config.theme || '',
      config.subtopic || '',
      config.difficulty,
    ].join('.')
    let history: string[] = []
    try {
      const stored = JSON.parse(sessionStorage.getItem(historyKey) || '[]')
      if (Array.isArray(stored))
        history = stored.filter((x) => typeof x === 'string').slice(-12)
    } catch {
      /* storage may be disabled */
    }
    let next: Run
    try {
      next = start(
        config,
        mode,
        crypto.getRandomValues(new Uint32Array(1))[0],
        history,
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo generar la sesión.',
      )
      return
    }
    next.ordinal = run?.mode === 'Ejercicios' ? (run.ordinal || 1) + 1 : 1
    if (mode === 'Ejercicios')
      try {
        sessionStorage.setItem(
          historyKey,
          JSON.stringify(
            [
              ...history,
              signature(next.questions[0]) + ':' + next.questions[0].level,
            ].slice(-12),
          ),
        )
      } catch {
        /* session state remains in memory */
      }
    setRun(next)
    window.scrollTo(0, 0)
  }
  return (
    <>
      <header>
        <div className="shell header-row">
          <div className="brand">
            Math<span>X</span>
          </div>
          <span className="header-label">Matemáticas IB · Nivel Medio</span>
        </div>
      </header>
      <main className="shell">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {storageFailed && (
          <p role="status">
            El navegador impide guardar la sesión. Mantén abierta esta página
            para conservar tus respuestas.
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
              setError('')
            }}
          />
        ) : (
          <Setup
            config={config}
            setConfig={setConfig}
            mode={mode}
            setMode={setMode}
            begin={begin}
          />
        )}
      </main>
      <footer className="shell">
        <span>
          Math<b>X</b>
        </span>{' '}
        Práctica independiente para Matemáticas IB
      </footer>
    </>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
