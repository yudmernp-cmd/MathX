import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityNotice } from './Learning'
import { Setup } from './Setup'
import { DrillWorkspace } from './DrillWorkspace'
import { drillRun, drillThemeName, type Drill } from './math/drills'
import { themes } from './math/model'
import { Workspace } from './Workspace'
import { restore, storageKey, type Run, type Mode } from './math/session'
import type { Config } from './math/model'
import { withHistory, HistoryError } from './practiceHistory'

import { ApiError, request } from './request'
export default function Classroom({
  onExpired,
  openActivities,
  owner,
}: {
  openActivities: () => void
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
      {!run && <ActivityNotice open={openActivities} />}
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
      ) : (
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
      )}
    </>
  )
}
