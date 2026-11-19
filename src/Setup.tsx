import {
  ArrowRight,
  ChevronDown,
  NotebookPen,
  Files,
  Clock3,
} from 'lucide-react'
import { useId, type ReactNode } from 'react'
import {
  calc,
  levels,
  themes,
  type Config,
  type Difficulty,
  type Theme,
} from './math/model'
import { courseFamilies } from './math/engine'
import type { Mode } from './math/session'

const names = {
  MAI: 'Aplicaciones e Interpretación',
  MAE: 'Análisis y Enfoques',
}

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

export function Setup({
  config,
  setConfig,
  mode,
  setMode,
  begin,
}: {
  config: Config
  setConfig: (c: Config) => void
  mode: Mode
  setMode: (m: Mode) => void
  begin: () => void
}) {
  const isExam = mode === 'Simulacros'
  const topics = courseFamilies(config).filter((f) => f.theme === config.theme)
  const current = topics.find((f) => f.id === config.subtopic)
  function updateCourseOrPaper(next: Config) {
    const accessible = courseFamilies(next)
    setConfig({
      ...next,
      subtopic: accessible.some(
        (f) => f.id === next.subtopic && f.theme === next.theme,
      )
        ? next.subtopic
        : undefined,
    })
  }
  const summary = [
    ['Asignatura', config.course + ' NM'],
    ['Prueba', 'Prueba ' + config.paper],
    ...(isExam
      ? []
      : [
          ['Tema', config.theme || 'Todos los temas'],
          ['Subtema', current?.topic || 'Todos los subtemas'],
        ]),
    ['Dificultad', config.difficulty],
    ['Calculadora', calc(config) ? 'Gráfica requerida' : 'Sin calculadora'],
  ]
  return (
    <>
      <div className="page-title">
        <h1>Práctica de Matemáticas IB</h1>
      </div>
      <div className="setup-grid">
        <section className="panel setup">
          <h2>Configura tu práctica</h2>
          <fieldset>
            <legend>Modalidad</legend>
            <div className="mode-options">
              {(['Ejercicios', 'Simulacros'] as const).map((m) => {
                const Icon = m === 'Ejercicios' ? NotebookPen : Files
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={m === mode}
                    onClick={() => setMode(m)}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>{m}</span>
                    <i className="dot" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </fieldset>
          <Select
            label="Asignatura"
            value={config.course}
            onChange={(course) =>
              updateCourseOrPaper({
                ...config,
                course: course as Config['course'],
              })
            }
          >
            {Object.entries(names).map(([id, name]) => (
              <option key={id} value={id}>
                {id} NM — {name}
              </option>
            ))}
          </Select>
          <fieldset>
            <legend>Prueba</legend>
            <div className="seg">
              {([1, 2] as const).map((p) => (
                <button
                  key={p}
                  aria-pressed={config.paper === p}
                  onClick={() => updateCourseOrPaper({ ...config, paper: p })}
                >
                  Prueba {p}
                </button>
              ))}
            </div>
          </fieldset>
          {!isExam && (
            <div className="topic-fields">
              <Select
                label="Tema"
                value={config.theme || ''}
                onChange={(theme) =>
                  setConfig({
                    ...config,
                    theme: (theme as Theme) || undefined,
                    subtopic: undefined,
                  })
                }
              >
                <option value="">Todos los temas</option>
                {themes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
              {config.theme && (
                <Select
                  label="Subtema"
                  value={config.subtopic || ''}
                  onChange={(value) =>
                    setConfig({ ...config, subtopic: value || undefined })
                  }
                >
                  <option value="">Todo el tema</option>
                  {topics.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.topic}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}
          <fieldset>
            <legend>Dificultad</legend>
            <div className="seg difficulties">
              {[...levels, 'Mixto'].map((l) => (
                <button
                  key={l}
                  aria-pressed={config.difficulty === l}
                  onClick={() =>
                    setConfig({ ...config, difficulty: l as Difficulty })
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          </fieldset>
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
              {config.course === 'MAE'
                ? 'Sección A de respuesta corta y sección B de respuesta extensa.'
                : config.paper === 1
                  ? 'Preguntas de respuesta corta.'
                  : 'Problemas de respuesta extensa.'}
            </p>
          )}
          <div className="time-note">
            <Clock3 size={16} />
            {isExam ? '90 minutos · 80 puntos' : 'Sin límite de tiempo'}
          </div>
          <button className="primary start" onClick={begin}>
            {isExam ? 'Empezar simulacro' : 'Empezar práctica'}
            <ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </>
  )
}
