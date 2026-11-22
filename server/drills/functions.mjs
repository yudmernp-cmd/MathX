import { form, sub, line, row, frac, poly } from './math.mjs'
const vertex = ({ a, b, k, level }) =>
  form(
    'Halla el vértice de la parábola.',
    level < 3
      ? `y=${k}(x-${b})^2+${a}`
      : `y=${poly([
          [k, 2],
          [-2 * k * b, 1],
          [k * b * b + a, 0],
        ])}`,
    row(b, a),
    `x_V=-\\frac{-${2 * k * b}}{2\\cdot${k}}=${b}`,
    `y_V=f(${b})=${a}`,
  )
const inverse = ({ a, k }) =>
  form(
    'Halla la expresión de la función inversa.',
    `f(x)=${k}x+${a}`,
    `\\frac{x-${a}}{${k}}`,
    `x=${k}y+${a}`,
    `y=(x-${a})/${k}`,
  )
export const functions = [
  sub('Rectas', {
    ecuacion_recta: ({ a, b, k, n }) =>
      form(
        'Halla la ecuación de la recta que pasa por A y B.',
        `A=${row(b, a + k * b)},\\ B=${row(b + n, a + k * (b + n))}`,
        line(k, a),
        `m=\\frac{${k * n}}{${n}}=${k}`,
        `y-${a + k * b}=${k}(x-${b})`,
      ),
    evaluar_funcion: ({ a, b, k }) =>
      form(
        'Calcula la ordenada en el origen.',
        `y-${a}=${k}(x-${b})`,
        a - k * b,
        'x=0',
        `y=${a}-${k}\\cdot${b}`,
      ),
    funcion_inversa: ({ a, b, k }) =>
      form(
        'Halla la abscisa correspondiente a la ordenada indicada.',
        `m=${k},\\quad P=(0,${b}),\\quad y=${k * a + b}`,
        a,
        `f(x)=${k}x+${b}`,
        `x=(${k * a + b}-${b})/${k}`,
      ),
  }),
  sub('Dominio y rango', {
    dominio_rango: ({ a, b, k, level, flip }) =>
      flip
        ? form(
            'Determina el dominio real en forma de intervalo.',
            `f(x)=\\sqrt{${k}x-${k * a}}`,
            `[${a},\\infty)`,
            `${k}x-${k * a}\\ge0`,
            `x\\ge ${a}`,
          )
        : form(
            'Determina el rango en forma de intervalo.',
            `f(x)=${a}-(x-${b})^2,\\ x\\in\\mathbb R`,
            `(-\\infty,${a}]`,
            `(x-${b})^2\\ge0`,
            `f(x)\\le${a},\\ f(${b})=${a}`,
          ),
    evaluar_funcion: ({ a, b, k }) =>
      form(
        'Calcula el máximo del rango en el dominio indicado.',
        `f(x)=${k}x+${b},\\quad -${b}\\le x\\le${a}`,
        k * a + b,
        `m=${k}>0`,
        `\\max f=f(${a})=${k * a + b}`,
      ),
  }),
  sub('Gráficas', {
    evaluar_funcion: ({ a, b, k, n }) =>
      form(
        'Calcula la ordenada del corte con el eje vertical.',
        `y=${k}(x-${b})^2-${a}`,
        k * b * b - a,
        'x=0',
        `y=${k}(-${b})^2-${a}`,
      ),
    dominio_rango: ({ a, b, k }) =>
      form(
        'Halla el intervalo de abscisas que ocupa el segmento AB.',
        `A=${row(-a, k)},\\ B=${row(b, -k)}`,
        `[-${a},${b}]`,
        `x_A=-${a},\\ x_B=${b}`,
        `-${a}\\le x\\le${b}`,
      ),
    ecuacion_recta: ({ a, b }) =>
      form(
        'Halla la ecuación de la recta con estos cortes de ejes.',
        `A=${row(a, 0)},\\ B=${row(0, b)}`,
        `y=-${frac(b, a)}x+${b}`,
        `m=-${frac(b, a)}`,
        `y=mx+${b}`,
      ),
  }),
  sub('Funciones compuestas e inversas', {
    funcion_inversa: inverse,
    funcion_compuesta: ({ a, b, k, flip }) =>
      flip
        ? form(
            'Calcula la expresión de la composición.',
            `f(x)=${k}x+${a},\\ g(x)=x^2-${b},\\ (f\\circ g)(x)`,
            poly([
              [k, 2],
              [a - k * b, 0],
            ]),
            `f(g(x))=${k}(x^2-${b})+${a}`,
            `f(g(x))=${poly([
              [k, 2],
              [a - k * b, 0],
            ])}`,
          )
        : form(
            'Evalúa la composición.',
            `f(x)=${k}x+${b},\\ g(x)=x^2,\\ (g\\circ f)(${a})`,
            (k * a + b) ** 2,
            `f(${a})=${k * a + b}`,
            `g(f(${a}))=${k * a + b}^2`,
          ),
  }),
  sub('Función cuadrática', {
    vertice_parabola: vertex,
    raices_cuadratica: ({ a, b, k }) =>
      form(
        'Halla el conjunto de raíces reales.',
        `${poly([
          [k, 2],
          [k * (a - b), 1],
          [-k * a * b, 0],
        ])}=0`,
        `\\{-${a},${b}\\}`,
        `${k}(x+${a})(x-${b})=0`,
        `x=-${a}\\;\\text{o}\\; x=${b}`,
      ),
  }),
  sub('Función exponencial', {
    evaluar_exponencial: ({ a, b, k, n }) =>
      form(
        'Evalúa la función exponencial.',
        `f(x)=${a}\\cdot${k}^{x-${b}},\\ f(${b + n})`,
        a * k ** n,
        `x-${b}=${n}`,
        `f(${b + n})=${a}\\cdot${k}^{${n}}`,
      ),
    dominio_rango: ({ a, b, k }) =>
      form(
        'Determina el rango en forma de intervalo.',
        `f(x)=${a}-${k}^{x+${b}},\\ x\\in\\mathbb R`,
        `(-\\infty,${a})`,
        `${k}^{x+${b}}>0`,
        `f(x)<${a},\\quad\\lim_{x\\to-\\infty}f(x)=${a}`,
      ),
  }),
  sub('Función sinusoidal', {
    amplitud_periodo: ({ a, b, k, flip }) =>
      flip
        ? form(
            'Calcula el período en radianes.',
            `f(x)=${a}\\sin(${k}x)+${b}`,
            `2\\pi/${k}`,
            'T=2\\pi/|B|',
            `B=${k}`,
          )
        : form(
            'Calcula la amplitud.',
            `f(x)=${b}-${a}\\cos(${k}x)`,
            a,
            `A=-${a}`,
            `|A|=${a}`,
          ),
    evaluar_funcion: ({ a, b, k }) =>
      form(
        'Evalúa la función en el ángulo indicado.',
        `f(x)=${a}\\sin(${k}x)+${b},\\ x=\\frac{\\pi}{${2 * k}}`,
        a + b,
        `${k}x=\\pi/2`,
        `f(x)=${a}+${b}`,
      ),
  }),
]
