import type { Config, Context, Level, Random } from './model'
// Independently reconstruct answers using enumerations, cash flows, coordinates,
// sample statistics and definite integrals. Feed the same sampled parameters to both paths.
const sum = (a: number[]) => a.reduce((t, x) => t + x, 0)
const range = (n: number) => Array.from({ length: n }, (_, i) => i)
export function referenceAnswers(
  id: string,
  r: Random,
  v: number,
  l: Level,
  config?: Config,
): number[] {
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
        -f(lo - 1),
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
        Math.sign(fit) * Math.sqrt(1 - sse / sum(y.map((t) => (t - avg) ** 2))),
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
    case 'exponenciales': {
      const initial = 4 * r(2, 6),
        base = r(2, 3),
        c = r(2, 10)
      const later = r(3, 4)
      const ratio = v ? 1 / base : base
      const values = [initial * (v ? base ** later : 1)]
      for (let i = 0; i < 4; i++) values.push(values[i] * ratio)
      const measured = values.map((z) => c + z)
      const factor = (measured[2] - measured[1]) / (measured[1] - measured[0])
      const amplitude = (measured[1] - measured[0]) / (factor - 1)
      const offset = measured[0] - amplitude
      const target =
        config && (config.course === 'MAI' || config.paper === 2)
          ? c +
            (v ? Math.floor(values[0] / (base + 1)) : values[0] * (base + 1))
          : v && hard
            ? c + values[0] / ratio
            : measured[3]
      // Bisect on the observed interval instead of inverting with logarithms.
      let low = -2,
        high = 4
      for (let i = 0; i < 52; i++) {
        const mid = (low + high) / 2,
          above = offset + amplitude * factor ** mid > target
        if (above === factor > 1) high = mid
        else low = mid
      }
      return [
        v && hard
          ? Math.log((measured[later] - offset) / amplitude) / Math.log(factor)
          : easy
            ? amplitude
            : factor,
        v && hard ? measured[1] - measured[2] : hard ? offset : measured[4],
        (low + high) / 2,
        measured[2] - offset,
      ]
    }
    case 'geometrica': {
      const first = r(2, 9),
        b = r(2, 3),
        k = r(3, 5),
        sizes = [first]
      for (let i = 1; i <= k + 1; i++) sizes.push(sizes[i - 1] * b)
      const totals = sizes.map((_, i) => sum(sizes.slice(0, i + 1)))
      return [
        v ? Math.sqrt(sizes[3] / sizes[1]) : hard ? first : easy ? sizes[1] : k,
        hard ? totals.filter((s) => s <= totals[k] - 1).length : totals[k - 1],
        sum(sizes.slice(1, k + 1)),
        sizes[0] + sizes[2] + sizes[4],
      ]
    }
    case 'voronoi': {
      const x = r(1, 5),
        y = r(1, 5),
        d = r(2, 5),
        h = r(2, 5)
      const A = [x, y],
        B = [x + 2 * d, y],
        C = [x, y + 2 * h]
      const square = (s: number[], u: number, w: number) =>
        (s[0] - u) ** 2 + (s[1] - w) ** 2
      const vertex = [(A[0] + B[0]) / 2, (A[1] + C[1]) / 2]
      const boundary = range(20).find(
        (t) =>
          square(A, x + t, y + t) >=
          Math.min(square(B, x + t, y + t), square(C, x + t, y + t)),
      )!
      return [
        v ? B[0] : easy ? B[0] - A[0] : vertex[0],
        hard ? Math.sqrt(square(A, vertex[0], vertex[1])) : vertex[1],
        boundary,
        (C[1] + 2 + A[1]) / 2,
      ]
    }
    case 'sectores': {
      const radius = r(3, 9),
        k = r(2, 4),
        fraction = 1 / (Math.PI * k)
      const arc = 2 * Math.PI * radius * fraction,
        area = Math.PI * radius ** 2 * fraction
      return [
        v ? (2 * area) / arc : easy ? arc : arc + 2 * radius,
        hard ? (2 * area) / (2 * radius) ** 2 : 3 * area,
        area - Math.PI * (radius / 2) ** 2 * fraction,
        (4 * area) / arc,
      ]
    }
    case 'tangentes': {
      const a = r(1, 4),
        t = r(2, 5),
        c = r(4, 10)
      const f = (x: number) => a * x * x + c
      const slope = (f(t + 1) - f(t - 1)) / 2
      const line = (x: number) => f(t) + (x - t) * slope
      return [
        v ? slope / (2 * t) : easy ? slope : t,
        hard ? -line(0) / slope : line(t + 0.5),
        f(t + 1) - line(t + 1),
        range(6)
          .filter((d) => f(t + d) - line(t + d) <= 4 * a)
          .at(-1)!,
      ]
    }
    case 'normal': {
      const mu = r(55, 85),
        sd = 2 * r(2, 5),
        z = 1 + r(0, 2) / 2
      const lo = mu - z * sd,
        hi = mu + z * sd
      // Simpson integration of the standard normal density between zero and z.
      const terms = 256,
        width = z / terms
      const area =
        (width / 3) *
        sum(
          range(terms + 1).map(
            (i) =>
              ((i === 0 || i === terms ? 1 : i % 2 ? 4 : 2) *
                Math.exp(-((i * width) ** 2) / 2)) /
              Math.sqrt(2 * Math.PI),
          ),
        )
      const tail = 0.5 - area
      return [
        v ? (hi - lo) / (2 * z) : easy ? (hi - mu) / sd : tail,
        hard ? tail / 0.5 : 2 * area,
        1 - tail ** 2 - (1 - tail) ** 2,
        (lo + hi) / 2 + 3 + (hi - mu) / 2,
      ]
    }
    case 'movimiento': {
      const a = r(2, 5),
        k = r(2, 5),
        start = r(8, 20),
        end = 2 * k + 1
      const speeds = range(end + 1).map((i) => a * (i - k))
      const increments = range(end).map((i) => (speeds[i] + speeds[i + 1]) / 2)
      const positions = speeds.map(
        (_, i) => start + sum(increments.slice(0, i)),
      )
      const total = sum(increments.map(Math.abs))
      return [
        v ? speeds.indexOf(0) : easy ? speeds[0] : Math.min(...positions),
        hard ? positions.lastIndexOf(start) : positions[k + 1] - start,
        total,
        total / end,
      ]
    }
    case 'independencia': {
      const e = r(9, 18),
        d = r(2, 6),
        cells = [e + d, e - d, e - d, e + d]
      const N = sum(cells),
        row = cells[0] + cells[1],
        col = cells[0] + cells[2]
      const expected = (row * col) / N
      const chi = sum(cells.map((o) => (o - expected) ** 2 / expected))
      return [
        v ? cells[0] : easy ? cells[0] / row : expected,
        hard ? chi : (cells[0] - expected) ** 2 / expected,
        sum(cells.map((o) => (2 * o - 2 * expected) ** 2 / (2 * expected))),
        cells[0] / row - cells[2] / (N - row),
      ]
    }
    default:
      throw Error(id)
  }
}

export function verified(ctx: Context, reference: number[]): boolean {
  const textOK = (s: string) =>
    s.trim().length > 0 &&
    s.split('$').length % 2 === 1 &&
    !/undefined|NaN|Infinity/.test(s)
  const g = ctx.figure
  if (!textOK(ctx.stem) || ctx.tasks.length !== reference.length + 1)
    return false
  if (
    g?.type === 'table' &&
    (!g.headers.length ||
      !g.rows.length ||
      g.rows.some(
        (row) =>
          row.length !== g.headers.length ||
          row.some((v) =>
            typeof v === 'number' ? !Number.isFinite(v) : !textOK(v),
          ),
      ))
  )
    return false
  if (
    g?.type === 'graph' &&
    (g.points.length < 2 ||
      g.points.some(
        ([x, y], i) =>
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          (i > 0 && x <= g.points[i - 1][0]),
      ))
  )
    return false
  return ctx.tasks.every(
    (part, i) =>
      textOK(part.ask) &&
      part.steps.length > 0 &&
      part.steps.every(textOK) &&
      part.rubric.length >= 2 &&
      part.rubric.length <= 4 &&
      part.rubric.every(textOK) &&
      (i === reference.length
        ? part.value === null
        : part.value !== null &&
          Number.isFinite(part.value) &&
          Math.abs(reference[i] - part.value) <=
            1e-9 * Math.max(1, Math.abs(reference[i]))),
  )
}
