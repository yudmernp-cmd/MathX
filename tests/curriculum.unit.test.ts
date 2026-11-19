import { it, expect } from 'vitest'
import { courseFamilies, exam, exercise, signature } from '../src/math/engine'
import {
  random,
  levels,
  themes,
  type Config,
  type Problem,
} from '../src/math/model'
import { start } from '../src/math/session'
import { exponential } from '../src/math/functions'
import { referenceAnswers, verified } from '../src/math/verification'

for (const course of ['MAI', 'MAE'] as const)
  for (const paper of [1, 2] as const)
    it(`catálogo y filtros completos de ${course} P${paper}`, () => {
      for (const difficulty of [...levels, 'Mixto'] as const) {
        const config: Config = { course, paper, difficulty }
        for (const theme of themes) {
          const pool = courseFamilies(config).filter((f) => f.theme === theme)
          expect(pool.length).toBeGreaterThan(0)
          const seen = new Set<string>()
          for (let seed = 0; seed < 80; seed++) {
            const q = exercise({ ...config, theme }, seed)
            expect(q.theme).toBe(theme)
            seen.add(q.family)
          }
          expect(seen).toEqual(new Set(pool.map((f) => f.id)))
          for (const f of pool)
            for (let seed = 0; seed < 20; seed++) {
              const q = exercise({ ...config, theme, subtopic: f.id }, seed)
              expect(q.family).toBe(f.id)
              expect(q.topic).toBe(f.topic)
              if (difficulty !== 'Mixto') expect(q.level).toBe(difficulty)
            }
        }
      }
    })

it('rechaza filtros incompatibles y los descarta en simulacros', () => {
  const c: Config = {
    course: 'MAE',
    paper: 1,
    difficulty: 'Intermedio',
    theme: 'Funciones',
    subtopic: 'voronoi',
  }
  expect(() => exercise(c, 1)).toThrow('verificado')
  expect(exam(c, 1)).toEqual(
    exam({ course: 'MAE', paper: 1, difficulty: 'Intermedio' }, 1),
  )
  expect(courseFamilies(c).map((f) => f.id)).not.toContain('normal')
  expect(courseFamilies({ ...c, paper: 2 }).map((f) => f.id)).toContain(
    'normal',
  )
})

it('alterna estructuras de un subtema y equilibra la dificultad mixta durante sesiones largas', () => {
  const c: Config = {
    course: 'MAI',
    paper: 1,
    difficulty: 'Mixto',
    theme: 'Funciones',
    subtopic: 'exponenciales',
  }
  let recent: string[] = []
  const seq: Problem[] = []
  for (let i = 0; i < 36; i++) {
    const run = start(c, 'Ejercicios', 200 + i, recent)
    const q = run.questions[0]
    expect(q.family).toBe(c.subtopic)
    expect(q).toEqual(exercise(c, run.seed))
    if (i) expect(q.variant).not.toBe(seq[i - 1].variant)
    seq.push(q)
    recent = [...recent, signature(q) + ':' + q.level].slice(-12)
    if (i >= 2) expect(new Set(seq.slice(-3).map((p) => p.level)).size).toBe(3)
  }
})

it('impide mostrar respuestas corruptas, tablas incompletas y gráficos inválidos', () => {
  const ctx = exponential.make(random(12), 0, 'Avanzado')
  const ref = referenceAnswers(exponential.id, random(12), 0, 'Avanzado')
  expect(verified(ctx, ref)).toBe(true)
  expect(
    verified(
      {
        ...ctx,
        tasks: [{ ...ctx.tasks[0], value: Infinity }, ...ctx.tasks.slice(1)],
      },
      ref,
    ),
  ).toBe(false)
  expect(
    verified(
      {
        ...ctx,
        tasks: [
          { ...ctx.tasks[0], value: (ctx.tasks[0].value || 0) + 1 },
          ...ctx.tasks.slice(1),
        ],
      },
      ref,
    ),
  ).toBe(false)
  expect(
    verified(
      { ...ctx, figure: { type: 'table', headers: ['x', 'y'], rows: [[2]] } },
      ref,
    ),
  ).toBe(false)
  expect(
    verified(
      {
        ...ctx,
        figure: {
          type: 'graph',
          x: 'x',
          y: 'y',
          points: [
            [0, 1],
            [0, 5],
          ],
        },
      },
      ref,
    ),
  ).toBe(false)
})

it('la tabla exponencial determina las respuestas en ambas pruebas sin conocer la semilla', () => {
  for (const paper of [1, 2] as const)
    for (const v of [0, 1])
      for (let seed = 0; seed < 60; seed++) {
        const q = exponential.make(random(seed), v, 'Avanzado', {
          course: 'MAE',
          paper,
          difficulty: 'Avanzado',
        })
        if (q.figure?.type !== 'table') throw Error('Faltan los datos')
        const rows = q.figure.rows.map((row) => Number(row[1]))
        if (!v) {
          const b = (rows[2] - rows[1]) / (rows[1] - rows[0])
          expect(q.tasks[0].value).toBeCloseTo(b, 10)
          expect(q.tasks[1].value).toBeCloseTo(
            rows[0] - (rows[1] - rows[0]) / (b - 1),
            10,
          )
        } else {
          const c = Number(q.stem.match(/asíntota es \$y=(\d+)/)?.[1])
          const target = Number(q.stem.match(/lectura es (\d+)/)?.[1])
          const b = Math.sqrt((rows[1] - c) / (rows[0] - c))
          expect(c + (rows[0] - c) * b ** q.tasks[0].value!).toBeCloseTo(
            target,
            10,
          )
          expect(c + (rows[0] - c) * b - rows[1]).toBeCloseTo(
            q.tasks[1].value!,
            10,
          )
        }
        const answer = q.tasks[2].value!
        if (paper === 1) expect(answer).toBeCloseTo(Math.round(answer), 10)
        else expect(Math.abs(answer - Math.round(answer))).toBeGreaterThan(0.01)
      }
})
