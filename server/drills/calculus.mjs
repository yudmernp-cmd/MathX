import { form, sub, frac, poly, line, row } from './math.mjs'
const tangent = ({ a, b, k, flip }) => {
  const m = 2 * k * b,
    y = k * b * b + a
  return flip
    ? form(
        'Halla la ecuación de la normal.',
        `f(x)=${k}x^2+${a},\\ x_0=${b}`,
        `y=-\\frac{x-${b}}{${m}}+${y}`,
        `f'(${b})=${m},\\ m_N=-1/${m}`,
        `y-${y}=m_N(x-${b})`,
      )
    : form(
        'Halla la ecuación de la tangente.',
        `f(x)=${k}x^2+${a},\\ x_0=${b}`,
        line(m, y - m * b),
        `f'(${b})=${m}`,
        `y-${y}=${m}(x-${b})`,
      )
}
const chain = ({ a, b, k, level }) => {
  const exp = level <= 2 ? 2 : level >= 4 ? 4 : 3
  return form(
    'Deriva respecto de x.',
    `f(x)=(${k}x+${a})^{${exp}}`,
    `${exp * k}(${k}x+${a})^{${exp - 1}}`,
    `u=${k}x+${a},\\; u'=${k}`,
    `f'(x)=${exp}u^{${exp - 1}}u'`,
  )
}
const product = ({ a, b, k, flip }) =>
  flip
    ? form(
        'Deriva respecto de x.',
        `f(x)=(x+${a})(${k}x-${b})`,
        poly([
          [2 * k, 1],
          [a * k - b, 0],
        ]),
        `f'(x)=(${k}x-${b})+${k}(x+${a})`,
        `f'(x)=${poly([
          [2 * k, 1],
          [a * k - b, 0],
        ])}`,
      )
    : form(
        'Calcula la derivada para x distinto de cero.',
        `f(x)=\\frac{${k}x^3+${a}x^2}{x}`,
        poly([
          [2 * k, 1],
          [a, 0],
        ]),
        `f(x)=${k}x^2+${a}x`,
        `f'(x)=${2 * k}x+${a}`,
      )
export const calculus = [
  sub('Límites y derivadas', {
    derivar_polinomio: ({ a, b, k }) =>
      form(
        'Evalúa el límite incremental.',
        `f(x)=${k}x^2+${a}x,\\quad\\lim_{h\\to0}\\frac{f(${b}+h)-f(${b})}{h}`,
        2 * k * b + a,
        `\\frac{f(${b}+h)-f(${b})}{h}=${2 * k * b + a}+${k}h`,
        `h\\to0\\;\\Rightarrow\\; f'(${b})=${2 * k * b + a}`,
      ),
    tangente_normal: ({ a, b, k }) =>
      form(
        'Halla la pendiente de la tangente.',
        `f(x)=${a}x^2-${k}x,\\quad x_0=${b}`,
        2 * a * b - k,
        `f'(x)=${2 * a}x-${k}`,
        `m=f'(${b})`,
      ),
    derivar_regla_cadena: ({ a, b, k }) =>
      form(
        'Calcula la derivada en el punto indicado.',
        `f(x)=(${k}x-${a})^2,\\quad f'(${b})`,
        2 * k * (k * b - a),
        `f'(x)=${2 * k}(${k}x-${a})`,
        `f'(${b})=${2 * k}(${k * b}-${a})`,
      ),
    derivar_producto_cociente: ({ a, b, k }) =>
      form(
        'Evalúa el límite del cociente incremental en el punto indicado.',
        `f(x)=(x+${a})(x-${b}),\\quad\\lim_{h\\to0}\\frac{f(${k}+h)-f(${k})}{h}`,
        2 * k + a - b,
        `f'(x)=(x-${b})+(x+${a})`,
        `f'(${k})=2\\cdot${k}+${a}-${b}`,
      ),
  }),
  sub('Reglas de derivación', {
    derivar_polinomio: ({ a, b, k, level }) => {
      const p = level + 1
      return form(
        'Deriva respecto de x.',
        `f(x)=${poly([
          [a, p],
          [-b, 1],
          [k, 0],
        ])}`,
        poly([
          [p * a, p - 1],
          [-b, 0],
        ]),
        `(x^{${p}})'=${p}x^{${p - 1}}`,
        `(-${b}x+${k})'=-${b}`,
      )
    },
    derivar_regla_cadena: chain,
    derivar_producto_cociente: product,
    tangente_normal: ({ a, b, k }) =>
      form(
        'Calcula la pendiente de la normal en el punto indicado.',
        `f(x)=x(${k}x+${a}),\\quad x_0=${b}`,
        frac(-1, 2 * k * b + a),
        `f'(x)=2\\cdot${k}x+${a}`,
        `m_N=-1/f'(${b})`,
      ),
  }),
  sub('Aplicaciones de la derivada', {
    optimizacion: ({ a, b, k, flip }) =>
      flip
        ? form(
            'Halla la abscisa del máximo.',
            `f(x)=${poly([
              [-k, 2],
              [2 * k * b, 1],
              [a, 0],
            ])}`,
            b,
            `f'(x)=-${2 * k}x+${2 * k * b}=0`,
            `f''(x)=-${2 * k}<0`,
          )
        : form(
            'Calcula el valor mínimo de la función.',
            `f(x)=${poly([
              [k, 2],
              [-2 * k * b, 1],
              [a, 0],
            ])}`,
            a - k * b * b,
            `f'(x)=0\\Rightarrow x=${b},\\quad f''(x)=${2 * k}>0`,
            `f(${b})=${a}-${k * b * b}`,
          ),
    tangente_normal: tangent,
    derivar_polinomio: ({ a, b, k }) =>
      form(
        'Halla la abscisa positiva con la pendiente indicada.',
        `f(x)=x^3+${a}x+${k},\\quad f'(x)=${3 * b * b + a}`,
        b,
        `3x^2+${a}=${3 * b * b + a}`,
        `x^2=${b * b},\\quad x>0`,
      ),
    derivar_regla_cadena: ({ a, b, k }) =>
      form(
        'Calcula la tasa instantánea de cambio en el punto indicado.',
        `g(x)=(${k}x+${a})^3,\\quad x=${b}`,
        3 * k * (k * b + a) ** 2,
        `g'(x)=${3 * k}(${k}x+${a})^2`,
        `g'(${b})=${3 * k}\\cdot${k * b + a}^2`,
      ),
  }),
  sub('Integración', {
    integrar_potencia: ({ a, b, k, level }) => {
      const n = level + 1
      return form(
        'Halla la integral indefinida.',
        `\\int (${a * (n + 1)}x^{${n}}-${b})\\,dx`,
        poly([
          [a, n + 1],
          [-b, 1],
        ]) + '+C',
        `\\int x^{${n}}dx=x^{${n + 1}}/${n + 1}+C`,
        `F(x)=${poly([
          [a, n + 1],
          [-b, 1],
        ])}+C`,
      )
    },
    integral_definida: ({ a, b, k, n }) =>
      form(
        'Calcula la integral definida.',
        `\\int_{${k}}^{${k + n}}(2x+${a})\\,dx`,
        (k + n) ** 2 - k * k + a * n,
        `F(x)=x^2+${a}x`,
        `I=F(${k + n})-F(${k})`,
      ),
    area_bajo_curva: ({ a, b, k }) =>
      form(
        'Calcula el área entre la curva y el eje horizontal.',
        `y=${k}(x-${a}),\\quad ${a - b}\\le x\\le${a + b}`,
        k * b * b,
        `A=\\int_{${a - b}}^{${a + b}}|${k}(x-${a})|\\,dx`,
        `A=2\\cdot\\frac{${b}\\cdot${k * b}}{2}`,
      ),
  }),
]
