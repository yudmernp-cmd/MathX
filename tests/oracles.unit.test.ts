import { it, expect } from 'vitest'
import { families } from '../src/math/engine'
import { levels, random, type Level, type Random } from '../src/math/model'
// Independently reconstruct answers using enumerations, cash flows, coordinates,
// sample statistics and definite integrals. Feed the same sampled parameters to both paths.
const sum = (a: number[]) => a.reduce((t, x) => t + x, 0)
const range = (n: number) => Array.from({ length: n }, (_, i) => i)
function oracle(id: string, r: Random, v: number, l: Level): number[] {
  const easy = l === 'Básico',
    hard = l === 'Avanzado'
  switch (id) {
    case 'tarifas': {
      const b = r(8, 20),
        m = r(2, 7),
        k = r(3, 7),
        c = r(9, 16),
        A = (x: number) => b + m * x,
        B = (x: number) => A(c) + (m - 1) * (x - c)
      return [
        easy ? A(1) - A(0) : B(0),
        hard ? range(100).find((t) => A(t) - B(t) >= k)! : v ? A(0) : k + 2,
        range(100)
          .filter((t) => 3 * A(t) <= 3 * A(k) + m - 1)
          .at(-1)!,
        range(100)
          .map((i) => i / 2)
          .find((t) => A(t) === (m + 2) * t)!,
      ]
    }
    case 'capital': {
      const p = 100 * r(12, 45),
        rate = r(3, 8) / 100,
        t = r(3, 7),
        A = [p]
      for (let i = 0; i < 12; i++) A.push(A.at(-1)! + A.at(-1)! * rate)
      return [
        v ? p : easy ? p * rate : A[t - 1] * rate,
        hard ? A.findIndex((x) => x > Math.floor(A[t + 2]) - 1) : A[t],
        A[t] - (p + sum(range(t).map(() => p * rate))),
        range(t).reduce((x) => x / 1.02, A[t]),
      ]
    }
    case 'muestras': {
      const m = r(8, 18),
        d = r(2, 5),
        a = r(2, 5),
        b = 2 * r(1, 4) + 1,
        s = [
          ...Array(a).fill(m - d),
          ...Array(b).fill(m),
          ...Array(a).fill(m + d),
        ],
        N = s.length,
        mean = sum(s) / N
      const pairs = s.flatMap((x, i) => s.map((y, j) => ({ x, y, i, j })))
      return [
        v
          ? b
          : easy
            ? N
            : pairs.filter((p) => p.i !== p.j && p.x === m - d && p.y === m - d)
                .length /
              (N * (N - 1)),
        hard ? sum([...s, m + N]) / (N + 1) : mean,
        sum(s.map((x) => (x - mean) ** 2)) / N,
        pairs.filter((p) => p.x === p.y).length / N ** 2,
      ]
    }
    case 'condicional': {
      const a = r(2, 7),
        b = r(2, 6),
        c = r(3, 8),
        d = r(3, 7)
      const pop = ['MB', 'MN', 'TB', 'TN'].flatMap((s, i) =>
        Array<string>([a, b, c, d][i]).fill(s),
      )
      const count = (f: (x: string) => boolean) => pop.filter(f).length
      const cyclists = count((x) => x[1] === 'B'),
        N = pop.length
      const pairs = pop.flatMap((x, i) =>
          pop.flatMap((y, j) => (j !== i ? [x + y] : [])),
        ),
        both = pairs.filter((s) => s[1] === 'B' && s[3] === 'B')
      return [
        v ? c : easy ? cyclists / N : a / cyclists,
        hard
          ? both.filter((s) => s[0] !== s[2]).length / both.length
          : v
            ? a / (a + b)
            : count((x) => x[0] === 'T' || x[1] === 'B') / N,
        pairs.filter((s) => s.includes('B')).length / pairs.length,
        (a / (a + b) + c / (c + d)) / 2,
      ]
    }
    case 'triangulos': {
      const k = r(2, 7),
        [x, h] = r(0, 1) ? [3 * k, 4 * k] : [5 * k, 12 * k],
        s = Math.hypot(x, h)
      return [
        v ? h : s,
        hard ? 0.25 : easy ? (x * h) / 2 : Math.sin(Math.atan2(h, x)),
        Math.hypot(x * 2, h) - s,
        x * Math.sin(Math.atan2(h, x)),
      ]
    }
    case 'deposito': {
      const k = r(3, 9),
        a = r(1, 3),
        b = 2 * a * k,
        c = r(12, 30),
        A = range(2 * k + 1).map((t) => c + b * t - a * t * t),
        max = Math.max(...A),
        index = A.indexOf(max)
      return [
        v ? A[1] : easy ? A[2] : (A[3] - A[1]) / 2,
        hard ? A.lastIndexOf(A[1]) : index,
        max - A[1],
        (max - A[1]) / (index - 1),
      ]
    }
    case 'sucesion': {
      const a = r(2, 8),
        d = r(2, 6),
        k = r(4, 9),
        s = [a]
      for (let i = 0; i < 25; i++) s.push(s.at(-1)! + d)
      return [
        v ? (s[k - 1] - s[2]) / (k - 3) : easy ? s[k - 1] : k,
        hard ? k + 2 : sum(s.slice(0, k)),
        sum(s.slice(2, 2 + k)),
        sum(s.filter((_, i) => i % 2 === 0).slice(0, k)),
      ]
    }
    case 'parabola': {
      const k = r(3, 9),
        h = r(2, k - 1),
        a = r(1, 4),
        lo = k - h,
        hi = k + h,
        f = (x: number) => -a * (x - lo) * (x - hi)
      return [
        v ? (f(2) - 2 * f(1) + f(0)) / 2 : easy ? k : lo,
        hard ? 2 : f(0),
        f(k - 1),
        ((hi - lo) * (f(lo) + 4 * f(k) + f(hi))) / 6,
      ]
    }
    case 'ajuste': {
      const m = r(3, 8),
        b = r(10, 18),
        e = r(1, 3),
        k = r(2, 5),
        x = [k, k + 2, k + 4],
        y = x.map((t, i) => m * t + b + (i === 1 ? -2 : 1) * e)
      const avg = sum(y) / 3,
        dx = x.map((t) => t - sum(x) / 3),
        fit =
          sum(y.map((t, i) => (t - avg) * dx[i])) / sum(dx.map((z) => z * z)),
        predict = (t: number) => avg + fit * (t - sum(x) / 3),
        sse = sum(y.map((t, i) => (t - predict(x[i])) ** 2))
      return [
        v ? y[0] - predict(x[0]) : fit,
        hard ? k + 3 : predict(k + 1),
        sse,
        100 * (1 - sse / sum(y.map((t) => (t - avg) ** 2))),
      ]
    }
    case 'lotes': {
      const N = r(6, 12),
        p = r(2, 6) / 10
      let dist = [1]
      for (let t = 0; t < N; t++)
        dist = range(dist.length + 1).map(
          (i) => (dist[i] || 0) * (1 - p) + (dist[i - 1] || 0) * p,
        )
      let miss = 1,
        n = 0
      while (miss > 0.05) {
        miss *= 1 - p
        n++
      }
      return [
        v ? p : easy ? sum(dist.map((x, i) => x * i)) : dist[0],
        hard ? dist[1] / sum(dist.slice(1)) : sum(dist.slice(1)),
        sum(dist.slice(2)),
        n,
      ]
    }
    default:
      throw Error(id)
  }
}
for (const f of families)
  it('Soluciones independientes · ' + f.id, () => {
    for (let seed = 0; seed < 100; seed++)
      for (const v of [0, 1])
        for (const level of levels) {
          const ctx = f.make(random(seed), v, level),
            ref = oracle(f.id, random(seed), v, level)
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
