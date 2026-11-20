import { it, expect } from 'vitest'
import { families, exercise } from '../src/math/engine'
import {
  random,
  levels,
  themes,
  type Config,
  type Problem,
} from '../src/math/model'

import { exponential } from '../src/math/functions'
import { referenceAnswers, verified } from '../src/math/verification'

for (const course of ['MAI'] as const)
  for (const paper of [1, 2] as const)
    it(`catálogo y filtros completos de ${course} P${paper}`, () => {
      for (const difficulty of levels) {
        const config: Config = { course, paper, difficulty }
        for (const theme of themes) {
          const pool = families.filter((f) => f.theme === theme)
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
              expect(q.level).toBe(difficulty)
            }
        }
      }
    })

it('impide mostrar respuestas corruptas, tablas incompletas y gráficos inválidos', () => {
  const ctx = exponential.make(random(12), 0, 'Difícil')
  const ref = referenceAnswers(exponential.id, random(12), 0, 'Difícil')
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
        const q = exponential.make(random(seed), v, 'Difícil', {
          course: 'MAI',
          paper,
          difficulty: 'Difícil',
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
        expect(Math.abs(answer - Math.round(answer))).toBeGreaterThan(0.01)
      }
})
