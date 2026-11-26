import {
  ArrowRight,
  ChevronDown,
  NotebookPen,
  Files,
  Clock3,
} from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { themes, type Config, type Theme } from './math/model'

import { drillThemeName } from './math/drills'
import type { Mode } from './math/session'

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="select-wrap">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
    </div>
  )
}

export type SetupMode = Mode | 'Simulacro Pro'

export function Setup({
  config,
  setConfig,
  mode,
  setMode,
  begin,
  busy,
}: {
  config: Config
  setConfig: (c: Config) => void
  mode: SetupMode
  setMode: (m: SetupMode) => void
  busy: boolean
  begin: () => void
}) {
  const isExam = mode !== 'Ejercicios'
  const summary = [
    ['Asignatura', config.course + ' NM'],
    ...(isExam
      ? [
          ['Prueba', 'Prueba ' + config.paper],
          ['Calculadora', 'Gráfica requerida'],
        ]
      : [
          ['Tema', drillThemeName(config.theme)],
          ['Dificultad', (config.drillLevel ?? 3) + ' de 5'],
        ]),
  ]
  return (
    <>
      <div className="page-title">
        <h1>Práctica de MAI NM</h1>
      </div>
      <div className="setup-grid">
        <section className="panel setup">
          <h2>Configura tu práctica</h2>
          <fieldset>
            <legend>Modalidad</legend>
            <div className="mode-options">
              {(['Ejercicios', 'Simulacros', 'Simulacro Pro'] as const).map((m) => {
                const Icon = m === 'Ejercicios' ? NotebookPen : Files
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={m === mode}
                    onClick={() => setMode(m)}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>
                      {m === 'Ejercicios' ? 'Ejercicios por temas' : m === 'Simulacros' ? 'Pruebas tipo IB' : m}
                    </span>
                    <i className="dot" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </fieldset>
          {isExam && (
            <fieldset>
              <legend>Prueba</legend>
              <div className="seg">
                {([1, 2] as const).map((p) => (
                  <button
                    key={p}
                    aria-pressed={config.paper === p}
                    onClick={() =>
                      setConfig({
                        ...config,
                        paper: p,
                      })
                    }
                  >
                    Prueba {p}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {!isExam && (
            <div className="topic-fields">
              <Select
                label="Tema"
                value={config.theme || themes[0]}
                onChange={(theme) =>
                  setConfig({
                    ...config,
                    theme: (theme as Theme) || undefined,
                    subtopic: undefined,
                  })
                }
              >
                {themes.map((t) => (
                  <option key={t} value={t}>
                    {drillThemeName(t)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {!isExam && (
            <fieldset>
              <legend>Dificultad</legend>
              <div className="seg difficulties">
                {[1, 2, 3, 4, 5].map((l) => (
                  <button
                    key={l}
                    aria-pressed={(config.drillLevel ?? 3) === l}
                    onClick={() => setConfig({ ...config, drillLevel: l })}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </section>
        <aside className="panel summary">
          <h2>Resumen</h2>
          <dl>
            {summary.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {isExam && (
            <p className="exam-format">
              {mode === 'Simulacro Pro'
                ? 'Resuelve un examen real de una convocatoria anterior en español, con sus figuras originales.'
                : config.paper === 1
                ? '12 preguntas cortas. Seis originales y seis variantes de examen.'
                : '6 problemas extensos. Tres originales y tres variantes de examen.'}
            </p>
          )}
          <div className="time-note">
            <Clock3 size={16} />
            {isExam
              ? '90 minutos · 80 puntos'
              : '15 ejercicios · Sin límite de tiempo'}
          </div>
          <button disabled={busy} className="primary start" onClick={begin}>
            {busy
              ? 'Preparando…'
              : mode === 'Simulacro Pro'
                ? 'Empezar Simulacro Pro'
                : isExam
                ? 'Empezar prueba tipo IB'
                : 'Empezar práctica'}
            <ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </>
  )
}
