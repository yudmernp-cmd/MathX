import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import katex from 'katex'
import { SolidFigure } from './SolidFigure'
import type { Figure } from './math/model'
export function MathText({ text }: { text: string }) {
  return (
    <>
      {text.split('$').map((t, i) =>
        i % 2 ? (
          <span
            key={i}
            className={
              t.includes('\\begin{array}')
                ? 'math-table math-expression'
                : 'math-expression'
            }
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
export function DataFigure({ data }: { data: Figure }) {
  if (data.type === 'solid') return <SolidFigure data={data} />
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
  if (data.type === 'curve') {
    const x = scaleLinear()
      .domain([data.points[0][0], data.points.at(-1)![0]])
      .range([52, 355])
    const heights = data.points.map((p) => p[1])
    const y = scaleLinear()
      .domain([Math.min(0, ...heights), Math.max(0, ...heights)])
      .nice(5)
      .range([165, 22])
    return (
      <figure>
        <svg
          viewBox="0 0 410 208"
          role="img"
          aria-label={data.y + ' en función de ' + data.x}
        >
          <path d={`M52 20V165 M52 ${y(0)}H355`} fill="none" stroke="#a599b4" />
          {x.ticks(6).map((t) => (
            <g key={t}>
              <path d={`M${x(t)} ${y(0)}v4`} stroke="#a599b4" />
              <text x={x(t)} y="184" textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          {y.ticks(5).map((h) => (
            <text key={h} x="46" y={y(h) + 4} textAnchor="end">
              {h}
            </text>
          ))}
          <text x="4" y="14">
            {data.y}
          </text>
          <text x="295" y="202">
            {data.x}
          </text>
          <path
            d={linePath(data.points.map(([t, h]) => [x(t), y(h)])) || ''}
            fill="none"
            stroke="#c4a0ff"
            strokeWidth="2.5"
          />
        </svg>
      </figure>
    )
  }
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
        <path d="M55 24V158H365" fill="none" stroke="#a599b4" />
        <text x="7" y="18">
          {data.y}
        </text>
        <text x="321" y="193">
          {data.x}
        </text>
        <path
          d={linePath(data.points.map(([a, b]) => [x(a), y(b)])) || ''}
          stroke="#c4a0ff"
          fill="none"
          strokeWidth="3"
        />
        {data.points.map(([a, b]) => (
          <g key={a}>
            <path
              d={`M55 ${y(b)}H${x(a)}V158`}
              stroke="#93869f"
              fill="none"
              strokeDasharray="3 4"
            />
            <circle cx={x(a)} cy={y(b)} r="4" fill="#c4a0ff" />
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
