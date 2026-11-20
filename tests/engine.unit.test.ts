import { describe, it, expect } from 'vitest'
import katex from 'katex'
import { families, exercise } from '../src/math/engine'
import { correct, readNumber } from '../src/math/grading'
import { levels, points, random, type Config } from '../src/math/model'
import { score, type Run } from '../src/math/session'
describe('Montaje de pruebas y cobertura', () => {
  for (const family of families)
    it(family.id + ' · 600 combinaciones y baremos', () => {
      for (let seed = 0; seed < 100; seed++)
        for (const variant of [0, 1])
          for (const level of levels) {
            const q = family.make(random(seed), variant, level)
            expect(q.tasks).toHaveLength(5)
            expect(
              q.tasks.every(
                (x) => x.rubric.length >= 2 && x.rubric.length <= 4,
              ),
            ).toBe(true)
            for (const p of q.tasks) {
              expect(p.steps.length).toBeGreaterThan(0)
              if (p.value !== null) {
                expect(Number.isFinite(p.value)).toBe(true)
                expect(correct(String(p.value), p.value)).toBe(true)
                expect(correct(p.value.toPrecision(3), p.value)).toBe(true)
              }
            }
            if (seed === 0)
              for (const t of [
                q.stem,
                ...q.tasks.flatMap((p) => [p.ask, ...p.steps]),
              ]) {
                expect(t.split('$').length % 2).toBe(1)
                t.split('$').forEach((s, i) => {
                  if (i % 2)
                    katex.renderToString(s, {
                      throwOnError: true,
                      strict: 'ignore',
                    })
                })
              }
          }
    })
})
describe('Corrección segura', () => {
  it.each([
    ['1/2', 0.5],
    ['0,5', 0.5],
    ['√(8)/2', Math.SQRT2],
    ['2(3+4)', 14],
    ['−3²', -9],
    ['2^-2', 0.25],
    ['2^3^2', 512],
    ['2π', 2 * Math.PI],
    ['ln(9)/ln(3)', 2],
    ['log(1000)', 3],
    ['1e-3', 0.001],
  ] as const)('%s', (s, v) => expect(readNumber(s)).toBeCloseTo(v, 12))
  it.each([
    '',
    '1 2',
    '1/0',
    'NaN',
    'sqrt(-1)',
    '2+',
    'process.exit()',
    '2**3',
    '1.2.3',
    '3foo',
    '(1+2',
  ])('rechaza %s', (s) => expect(readNumber(s)).toBeNull())
  it('maneja tolerancia, trabajo escrito y respuestas sin contestar', () => {
    expect(correct('50%', 0.5)).toBe(true)
    expect(correct('50%', 50, true)).toBe(true)
    expect(correct('0', 1e-10)).toBe(false)
    expect(correct('1.24', 1.2345)).toBe(false)
    const config: Config = { course: 'MAI', paper: 2, difficulty: 'Difícil' }
    const run: Run = {
      config,
      mode: 'Ejercicios',
      questions: [exercise(config, 12)],
      seed: 12,
      index: 0,
      deadline: 0,
      checked: false,
      finished: false,
      answers: {},
      notes: {},
    }
    expect(score(run)).toEqual({
      withoutScheme: 0,
      verified: 0,
      pending: 0,
      total: points(run.questions[0]),
    })
    run.questions[0].parts.forEach((p, i) => {
      run.answers['0-' + i] =
        p.value === null ? 'Mi razonamiento' : String(p.value)
      run.notes['0-' + i] = 'Procedimiento'
    })
    expect(score(run)).toEqual({
      withoutScheme: 0,
      verified: 4,
      pending: points(run.questions[0]) - 4,
      total: points(run.questions[0]),
    })
  })
})
