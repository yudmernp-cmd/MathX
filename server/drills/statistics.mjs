import { form, sub, frac, root, fmt } from './math.mjs'
import { binomial, normalCdf } from '../practice/math.mjs'
const tab = (xs, fs) =>
  `\\begin{array}{c|${'c'.repeat(xs.length)}} x&${xs.join('&')}\\\\ f&${fs.join('&')}\\end{array}`
const deviation = ({ a, b, k }) =>
  form(
    'Calcula la desviación estándar poblacional.',
    `X=(${a - b},${a},${a},${a + b})`,
    `${b}\\sqrt{2}/2`,
    `\\mu=${a}`,
    `\\sigma^2=(2\\cdot${b}^2)/4`,
  )
export const statistics = [
  sub('Muestreo', {
    probabilidad_simple: ({ a, b, k }) =>
      form(
        'Calcula la probabilidad de inclusión de un elemento en la muestra aleatoria simple.',
        `N=${a + b + k},\\; n=${k},\\;\\text{sin reposición}`,
        frac(k, a + b + k),
        'P=n/N',
        `P=${k}/${a + b + k}`,
      ),
    probabilidad_condicional: ({ a, b, k }) =>
      form(
        'Calcula la probabilidad de inclusión dado el estrato B.',
        `N_A=${a},\\ n_A=${k},\\ N_B=${b + k},\\ n_B=${k},\\;\\text{muestreo aleatorio por estrato}`,
        frac(k, b + k),
        'P(I\\mid B)=n_B/N_B',
        `P(I\\mid B)=${k}/${b + k}`,
      ),
    media_mediana_moda: ({ a, b, k }) =>
      form(
        'Calcula la estimación estratificada de la media.',
        `N_1=${a},\\;N_2=${b},\\;\\bar x_1=${k},\\;\\bar x_2=${k + 2}`,
        frac(a * k + b * (k + 2), a + b),
        '\\hat\\mu=(N_1\\bar x_1+N_2\\bar x_2)/(N_1+N_2)',
        `\\hat\\mu=(${a * k}+${b * (k + 2)})/${a + b}`,
      ),
  }),
  sub('Presentación de datos', {
    cuartiles_percentiles: ({ a, b, k }) =>
      form(
        'Halla el percentil 75 por rango más próximo.',
        tab([a, a + b, a + 2 * b], [k, 2 * k, k]),
        a + b,
        `N=${4 * k},\\;j=\\lceil0.75N\\rceil=${3 * k}`,
        `F_1=${k},\\;F_2=${3 * k}`,
      ),
    media_mediana_moda: ({ a, b, k }) =>
      form(
        'Calcula la media de la tabla de frecuencias.',
        tab([a, a + b, a + 2 * b], [1, k, 2]),
        frac(a + k * (a + b) + 2 * (a + 2 * b), k + 3),
        '\\bar x=\\sum x_i f_i/\\sum f_i',
        `\\sum f_i=${k + 3},\\quad\\sum x_i f_i=${a + k * (a + b) + 2 * (a + 2 * b)}`,
      ),
    desviacion_estandar: ({ a, b, k }) =>
      form(
        'Calcula la desviación estándar poblacional de la tabla.',
        tab([a - b, a, a + b], [k, 2 * k, k]),
        `${b}\\sqrt{2}/2`,
        `\\mu=${a}`,
        `\\sigma^2=(${k}\\cdot${b}^2+${k}\\cdot${b}^2)/${4 * k}`,
      ),
  }),
  sub('Tendencia central y dispersión', {
    media_mediana_moda: ({ a, b, k, flip }) =>
      flip
        ? form(
            'Halla la mediana.',
            `X=(${a + 2 * b},${a},${a + k + b},${a + b},${a - b})`,
            a + b,
            'n=5,\\ j=3',
            `x_{(3)}=${a + b}`,
          )
        : form(
            'Halla la moda.',
            `X=(${a + b},${a},${a + k + b},${a},${a - b})`,
            a,
            `f(${a})=2`,
            '\\max f=2',
          ),
    desviacion_estandar: deviation,
    cuartiles_percentiles: ({ a, b, k }) =>
      form(
        'Calcula el rango intercuartílico usando las medianas de las dos mitades.',
        `X=(${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => a + i * k).join(',')})`,
        4 * k,
        `Q_1=${a + 1.5 * k},\\ Q_3=${a + 5.5 * k}`,
        'RIC=Q_3-Q_1',
      ),
  }),
  sub('Probabilidad', {
    probabilidad_simple: ({ a, b, k }) =>
      form(
        'Calcula la probabilidad de la unión.',
        `|\\Omega|=${a + b + k},\\ |A|=${a + k},\\ |B|=${b},\\ |A\\cap B|=${Math.min(k, b)},\\;\\text{resultados equiprobables}`,
        frac(a + k + b - Math.min(k, b), a + b + k),
        '|A\\cup B|=|A|+|B|-|A\\cap B|',
        'P(A\\cup B)=|A\\cup B|/|\\Omega|',
      ),
    probabilidad_condicional: ({ a, b, k }) =>
      form(
        'Calcula la probabilidad condicional.',
        `P(A\\cap B)=${frac(k, a + b + k)},\\;P(B)=${frac(b + k, a + b + k)},\\;P(A\\mid B)=?`,
        frac(k, b + k),
        'P(A\\mid B)=P(A\\cap B)/P(B)',
        `P(A\\mid B)=${k}/${b + k}`,
      ),
  }),
  sub('Distribuciones de probabilidad', {
    distribucion_binomial: ({ a, n, k, level }) => {
      const p = a / 100,
        count = n + k
      const tail = level >= 4
      return form(
        'Calcula la probabilidad indicada.',
        `X\\sim B(${count},${fmt(p)}),\\quad P(X${tail ? '\\le' : '='}${k})`,
        fmt(
          tail
            ? Array.from({ length: k + 1 }, (_, i) =>
                binomial(count, i, p),
              ).reduce((s, x) => s + x, 0)
            : binomial(count, k, p),
        ),
        `p_j=\\binom{${count}}{j}${fmt(p)}^j(1-${fmt(p)})^{${count}-j}`,
        tail ? `P=\\sum_{j=0}^{${k}}p_j` : `P=p_{${k}}`,
      )
    },
    distribucion_normal: ({ a, b, k }) => {
      const z = k / 4
      return form(
        'Calcula la probabilidad indicada.',
        `X\\sim N(${a},${b}^2),\\quad P(X>${fmt(a + b * z)})`,
        fmt(1 - normalCdf(z)),
        `z=(${fmt(a + b * z)}-${a})/${b}=${z}`,
        `P=1-\\Phi(${z})`,
      )
    },
  }),
  sub('Correlación y regresión', {
    coeficiente_correlacion: ({ a, b, k }) => {
      const ys = [a, a + k + b, a + 2 * k]
      const avg = (ys[0] + ys[1] + ys[2]) / 3,
        ss = ys.reduce((s, y) => s + (y - avg) ** 2, 0)
      return form(
        'Calcula el coeficiente de correlación de Pearson.',
        `(x,y)=(0,${ys[0]}),(1,${ys[1]}),(2,${ys[2]})`,
        fmt((2 * k) / Math.sqrt(2 * ss)),
        `S_{xx}=2,\\ S_{xy}=${2 * k},\\ S_{yy}=${frac(6 * k * k + 2 * b * b, 3)}`,
        'r=S_{xy}/\\sqrt{S_{xx}S_{yy}}',
      )
    },
    media_mediana_moda: ({ a, b, k }) =>
      form(
        'Calcula la media de y a partir del centroide de la recta de regresión.',
        `\\hat y=${k}x+${b},\\quad\\bar x=${a}`,
        k * a + b,
        '\\bar y=\\hat y(\\bar x)',
        `\\bar y=${k}\\cdot${a}+${b}`,
      ),
  }),
]
