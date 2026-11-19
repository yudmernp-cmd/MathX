import {
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  Clock3,
  FileStack,
  GraduationCap,
  ListChecks,
  NotebookPen,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Timer,
  Shapes,
} from 'lucide-react'
import { Surface } from './Figures'
import { calc, levels, type Config, type Difficulty } from './math/model'
import type { Mode } from './math/session'
import type { ReactNode } from 'react'

export const names = {
  MAI: 'Aplicaciones e Interpretación',
  MAE: 'Análisis y Enfoques',
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
  function row(label: string, value: string, icon: ReactNode) {
    return (
      <div className="summary-row">
        {icon}
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    )
  }
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <div className="eyebrow mint">
            <span className="tiny-line" /> MATEMÁTICAS IB · NIVEL MEDIO
          </div>
          <h1>
            Laboratorio matemático<span>.</span>
          </h1>
          <p>
            Genera ejercicios originales y practica a tu ritmo con simulacros de
            examen.
          </p>
        </div>
        <div className="hero-art">
          <Surface />
        </div>
      </section>
      <div className="setup-grid">
        <section className="panel setup">
          <div className="section-title">
            <span className="iconbox">
              <SlidersHorizontal size={20} />
            </span>
            <h2>Configura tu práctica</h2>
          </div>
          <fieldset>
            <legend>Modalidad</legend>
            <div className="mode-options">
              {(['Ejercicios', 'Simulacros'] as const).map((m) => {
                const selected = m === mode,
                  Icon = m === 'Ejercicios' ? NotebookPen : FileStack
                return (
                  <button
                    key={m}
                    aria-pressed={selected}
                    className={'mode-card ' + (selected ? 'selected' : '')}
                    onClick={() => setMode(m)}
                  >
                    <Icon size={23} />
                    <span>
                      <b>{m}</b>
                      <small>
                        {m === 'Ejercicios'
                          ? 'Un problema a la vez'
                          : 'Una prueba completa'}
                      </small>
                    </span>
                    <i className="radio-dot">{selected && <i />}</i>
                  </button>
                )
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend>Asignatura</legend>
            <div className="select-wrap">
              <BookOpen size={19} />
              <select
                aria-label="Asignatura"
                value={config.course}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    course: e.target.value as Config['course'],
                  })
                }
              >
                {Object.entries(names).map(([id, name]) => (
                  <option key={id} value={id}>
                    {id} NM · {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={17} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Prueba</legend>
            <div className="seg papers">
              {([1, 2] as const).map((p) => (
                <button
                  key={p}
                  aria-pressed={config.paper === p}
                  className={config.paper === p ? 'active' : ''}
                  onClick={() => setConfig({ ...config, paper: p })}
                >
                  Prueba {p}
                  {config.paper === p && <Check size={15} />}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Dificultad</legend>
            <div className="seg difficulties">
              {[...levels, 'Mixto'].map((l, i) => (
                <button
                  key={l}
                  aria-pressed={config.difficulty === l}
                  className={config.difficulty === l ? 'active' : ''}
                  onClick={() =>
                    setConfig({ ...config, difficulty: l as Difficulty })
                  }
                >
                  {i === 3 ? (
                    <Layers size={15} />
                  ) : (
                    <span className="bars" aria-hidden="true">
                      {[0, 1, 2].map((n) => (
                        <i
                          key={n}
                          style={{
                            height: 5 + 3 * n,
                            opacity: n <= i ? 1 : 0.22,
                          }}
                        />
                      ))}
                    </span>
                  )}
                  {l}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
        <aside className="panel summary">
          <div className="summary-top">
            <span className="eyebrow">
              <span className="tiny-line" /> TU SESIÓN
            </span>
            <Shapes size={22} />
          </div>
          <h2>{isExam ? 'Simulacro de examen' : 'Ejercicio individual'}</h2>
          <p>
            {isExam
              ? 'Resuelve una prueba cronometrada y revisa tus soluciones al finalizar.'
              : 'Resuelve un problema por incisos y consulta la solución paso a paso.'}
          </p>
          <div className="rows">
            {row('Asignatura', config.course + ' NM', <GraduationCap />)}
            {row('Prueba', 'Prueba ' + config.paper, <FileStack />)}
            {row('Dificultad', config.difficulty, <Layers />)}
            {row(
              'Calculadora',
              calc(config) ? 'Permitida' : 'Sin calculadora',
              <Calculator />,
            )}
            {isExam
              ? row('Duración', '90 min · 80 puntos', <Timer />)
              : row('Tiempo', 'Sin límite', <Clock3 />)}
          </div>
          <button className="primary" onClick={begin}>
            {isExam ? <ListChecks size={18} /> : <Sparkles size={18} />}{' '}
            {isExam ? 'Iniciar simulacro' : 'Generar ejercicio'}
            <ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </>
  )
}
