import { describe, it, expect } from 'vitest'
import katex from 'katex'
import { families, exam, exercise, duration } from '../src/math/engine'
import { correct, readNumber } from '../src/math/grading'
import { calc, levels, points, random, type Config } from '../src/math/model'
import { start, score } from '../src/math/session'
describe('Montaje de pruebas y cobertura', () => {
  for (const course of ['MAE', 'MAI'] as const)
    for (const paper of [1, 2] as const)
      for (const difficulty of [...levels, 'Mixto'] as const) {
        const c: Config = { course, paper, difficulty }
        it(`${course} P${paper} · ${difficulty} · 250 semillas`, () => {
          const seen = new Set<string>()
          for (let seed = 0; seed < 250; seed++) {
            const qs = exam(c, seed),
              marks = qs.map(points)
            if (marks.reduce((a, b) => a + b, 0) !== 80)
              throw Error('Total distinto de 80')
            if (
              course === 'MAE' &&
              marks.slice(0, 6).reduce((a, b) => a + b, 0) !== 40
            )
              throw Error('Sección A')
            if (
              course === 'MAI' &&
              marks.some((x) => (paper === 2 ? x < 10 : x > 8))
            )
              throw Error('Longitud incorrecta')
            if (new Set(qs.map((q) => q.family + q.variant)).size !== qs.length)
              throw Error('Estructura repetida')
            for (const q of qs) {
              seen.add(q.family)
              const f = families.find((f) => f.id === q.family)!
              if (!f.courses.includes(course) || (!calc(c) && f.id === 'lotes'))
                throw Error('Asignatura incompatible')
              if (difficulty !== 'Mixto' && q.level !== difficulty)
                throw Error('Nivel incorrecto')
            }
            if (difficulty === 'Mixto') {
              const counts = levels.map(
                (l) => qs.filter((q) => q.level === l).length,
              )
              if (Math.max(...counts) - Math.min(...counts) > 1)
                throw Error('Mezcla desequilibrada')
            }
          }
          expect(seen.size).toBeGreaterThanOrEqual(6)
          expect(exam(c, 64127)).toEqual(exam(c, 64127))
          expect(start(c, 'Simulacros', 62, [], 1999).deadline).toBe(
            1999 + duration,
          )
          expect(duration).toBe(5400000)
        })
      }
  it('la semilla mostrada reproduce el ejercicio tras evitar repeticiones', () => {
    const c: Config = { course: 'MAI', paper: 1, difficulty: 'Mixto' }
    const prev = exercise(c, 500)
    const next = start(c, 'Ejercicios', 500, [prev.family + '-' + prev.variant])
    expect(next.questions[0].family).not.toBe(prev.family)
    expect(exercise(c, next.seed)).toEqual(next.questions[0])
  })
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
    const run = start(
      { course: 'MAI', paper: 2, difficulty: 'Avanzado' },
      'Ejercicios',
      12,
      [],
    )
    expect(score(run)).toEqual({
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
      verified: 4,
      pending: points(run.questions[0]) - 4,
      total: points(run.questions[0]),
    })
  })
})
