import type { Figure } from './math/model'
type Solid = Extract<Figure, { type: 'solid' }>
export function SolidFigure({ data }: { data: Solid }) {
  const { shape, radius, unit } = data
  const measure = Number(radius.toPrecision(8)) + ' ' + unit
  const title = {
    sector: 'Disco con un sector retirado',
    fold: 'Formación del cono a partir del sector restante',
    scoop: 'Cono de helado con un hemisferio encima',
    hemisphere: 'Hemisferio macizo',
  }[shape]
  return (
    <figure>
      <svg
        viewBox="0 0 320 170"
        role="img"
        aria-label={
          title +
          '. ' +
          (shape === 'scoop'
            ? 'El hemisferio y el cono comparten el radio r.'
            : 'Radio del disco o generatriz: ' + measure) +
          '. Esquema fuera de escala.'
        }
      >
        {(shape === 'hemisphere' || shape === 'scoop') && (
          <g stroke="#45675b" strokeWidth="1.6">
            <path d="M75 97a85 74 0 0 1 170 0" fill="#e0ebe4" />
            <ellipse cx="160" cy="97" rx="85" ry="16" fill="#d0e1d5" />
            {shape === 'scoop' && (
              <path d="M75 97L160 160L245 97" fill="none" />
            )}
            <path d="M160 97H245" />
            <text x="181" y="92" stroke="none">
              {shape === 'scoop' ? 'r' : measure}
            </text>
          </g>
        )}
        {shape === 'sector' && (
          <g stroke="#45675b" strokeWidth="1.6">
            <path d="M150 86L220 86A70 70 0 1 1 185 25.38Z" fill="#d0e1d5" />
            <path
              d="M185 25.38A70 70 0 0 1 220 86"
              strokeDasharray="4 4"
              fill="none"
            />
            <text x="190" y="25" stroke="none">
              A
            </text>
            <text x="225" y="91" stroke="none">
              B
            </text>
            <text x="133" y="93" stroke="none">
              O
            </text>
            <text x="193" y="50" stroke="none">
              x
            </text>
            <text x="163" y="79" stroke="none">
              θ
            </text>
            <text x="160" y="105" stroke="none">
              {measure}
            </text>
          </g>
        )}
        {shape === 'fold' && (
          <g stroke="#45675b" strokeWidth="1.6">
            <path d="M65 91H112A47 47 0 1 1 88.5 50.3Z" fill="#d0e1d5" />
            <text x="91" y="45" stroke="none">
              A
            </text>
            <text x="113" y="97" stroke="none">
              B
            </text>
            <text x="50" y="99" stroke="none">
              O
            </text>
            <path
              d="M129 85h23m-6 -5l6 5 -6 5M173 125L225 27L277 125"
              fill="none"
            />
            <ellipse cx="225" cy="125" rx="52" ry="12" fill="none" />
            <path d="M225 28V125H277" strokeDasharray="4 3" fill="none" />
            <text x="212" y="80" stroke="none">
              h
            </text>
            <text x="242" y="121" stroke="none">
              r
            </text>
            <text x="218" y="21" stroke="none">
              O
            </text>
            <text x="270" y="147" stroke="none">
              A/B
            </text>
            <text x="254" y="77" stroke="none">
              {measure}
            </text>
          </g>
        )}
      </svg>
    </figure>
  )
}
