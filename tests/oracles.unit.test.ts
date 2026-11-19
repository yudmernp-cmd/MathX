import { it, expect } from 'vitest'
import { families } from '../src/math/engine'
import { levels, random } from '../src/math/model'
import { referenceAnswers, verified } from '../src/math/verification'
for (const f of families)
  it('Soluciones independientes · ' + f.id, () => {
    for (let seed = 0; seed < 100; seed++)
      for (const v of [0, 1])
        for (const level of levels) {
          const ctx = f.make(random(seed), v, level),
            ref = referenceAnswers(f.id, random(seed), v, level)
          expect(verified(ctx, ref)).toBe(true)
          ref.forEach((z, i) => expect(ctx.tasks[i].value).toBeCloseTo(z, 8))
          if (ctx.figure?.type === 'graph') {
            const [[x0, y0], [x1, y1]] = ctx.figure.points
            expect(x0).toBe(0)
            expect(x1).toBeGreaterThan(0)
            const b = ctx.tasks[0]
            if (level === 'Básico') expect((y1 - y0) / (x1 - x0)).toBe(b.value)
          }
        }
  })
