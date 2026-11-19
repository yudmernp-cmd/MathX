import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import katex from 'katex'
import type { Figure } from './math/model'
export function MathText({ text }: { text: string }) {
  return (
    <>
      {text
        .split('$')
        .map((t, i) =>
          i % 2 ? (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(t, {
                  throwOnError: false,
                  trust: false,
                  output: 'htmlAndMathml',
                }),
              }}
            />
          ) : (
            <span key={i}>{t}</span>
          ),
        )}
    </>
  )
}
const linePath = line<[number, number]>()
// Isometric wireframe of a sampled, exponentially damped radial cosine.
function project(x: number, y: number): [number, number] {
  const radius = x * x + y * y
  const z = Math.cos(2.15 * Math.sqrt(radius)) * Math.exp(-0.41 * radius)
  return [222 + 37 * x + 32 * y, 134 + 12 * x - 15 * y - 88 * z]
}
export function Surface() {
  const grid = Array.from({ length: 31 }, (_, i) => (i - 15) / 5)
  const domain = Array.from({ length: 91 }, (_, i) => (i - 45) / 15)
  return (
    <svg className="surface" viewBox="0 0 445 245" aria-hidden="true">
      <defs>
        <linearGradient id="mesh" x2=".75" y2="1">
          <stop stopColor="#e5ffa8" />
          <stop offset=".58" stopColor="#9fd798" />
          <stop offset="1" stopColor="#479f87" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#a6deb8" opacity=".29" strokeWidth=".7">
        <path
          d="M17 161 397 228M106 225 402 80M222 116V12"
          strokeDasharray="3 5"
        />
      </g>
      <g stroke="url(#mesh)" fill="none" strokeWidth="1.05">
        {grid.map((x, i) => (
          <g key={i}>
            <path d={linePath(domain.map((y) => project(x, y))) || ''} />
            <path d={linePath(domain.map((y) => project(y, x))) || ''} />
          </g>
        ))}
      </g>
      <g fill="#b9dac1" fontSize="11" fontFamily="monospace">
        <text x="401" y="233">
          x
        </text>
        <text x="402" y="77">
          y
        </text>
        <text x="229" y="19">
          z
        </text>
      </g>
    </svg>
  )
}
export function DataFigure({ data }: { data: Figure }) {
  if (data.type === 'table')
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {data.headers.map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i}>
                {row.map((x, j) => (
                  <td key={j}>{x}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  const maxX = Math.max(...data.points.map((p) => p[0])),
    maxY = Math.max(...data.points.map((p) => p[1]))
  const x = scaleLinear().domain([0, maxX]).range([55, 335]),
    y = scaleLinear().domain([0, maxY]).range([158, 35])
  return (
    <figure>
      <svg
        viewBox="0 0 410 198"
        role="img"
        aria-label={data.points.map((p) => p.join(', ')).join(' y ')}
      >
        <path d="M55 24V158H365" fill="none" stroke="#617574" />
        <text x="7" y="18">
          {data.y}
        </text>
        <text x="321" y="193">
          {data.x}
        </text>
        <path
          d={linePath(data.points.map(([a, b]) => [x(a), y(b)])) || ''}
          stroke="#18715a"
          fill="none"
          strokeWidth="3"
        />
        {data.points.map(([a, b]) => (
          <g key={a}>
            <path
              d={`M55 ${y(b)}H${x(a)}V158`}
              stroke="#91a8a2"
              fill="none"
              strokeDasharray="3 4"
            />
            <circle cx={x(a)} cy={y(b)} r="4" fill="#18715a" />
            <text x="49" y={y(b) + 4} textAnchor="end">
              {b}
            </text>
            <text x={x(a)} y="177" textAnchor="middle">
              {a}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  )
}
