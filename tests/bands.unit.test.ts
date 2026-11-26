import { describe, expect, it } from 'vitest'
import { band } from '../src/ExamResults'

describe('bandas de las pruebas de MAI NM sobre 80', () => {
  const expected: { paper: 1 | 2; ranges: [number, number][] }[] = [
    { paper: 1, ranges: [[0, 11], [12, 19], [20, 29], [30, 38], [39, 49], [50, 57], [58, 80]] },
    { paper: 2, ranges: [[0, 10], [11, 20], [21, 29], [30, 40], [41, 52], [53, 62], [63, 80]] },
  ]
  for (const { paper, ranges } of expected) {
    it('asigna cada puntaje entero de la Prueba ' + paper, () => {
      ranges.forEach(([min, max], index) => {
        for (let points = min; points <= max; points++)
          expect(band(paper, points), paper + ' · ' + points).toBe(index + 1)
      })
    })
  }
})
