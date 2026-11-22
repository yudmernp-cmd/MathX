import { form, sub, frac, fmt } from './math.mjs'
export const algebra = [
  sub('Notación científica', {
    notacion_cientifica: ({ a, n, k }) =>
      form(
        'Escribe el resultado en notación científica.',
        `${a}\\times10^{${n}}`,
        `${fmt(a / 10)}\\times10^{${n + 1}}`,
        `${a}=${fmt(a / 10)}\\times10`,
        `10\\times10^{${n}}=10^{${n + 1}}`,
      ),
    evaluar_logaritmo: ({ a, n, k }) =>
      form(
        'Evalúa el logaritmo del cociente en notación científica.',
        `\\log_{10}\\left(\\frac{${a}\\times10^{${n + k}}}{${a}\\times10^{${k}}}\\right)`,
        n,
        `\\frac{10^{${n + k}}}{10^{${k}}}=10^{${n}}`,
        `\\log_{10}(10^{${n}})=${n}`,
      ),
    error_porcentual: ({ a, b, n }) =>
      form(
        'Calcula el error porcentual.',
        `v=${a}\\times10^{${n}},\\quad v_{\\mathrm{aprox}}=${a + b}\\times10^{${n}}`,
        frac(100 * b, a) + '\\%',
        `|v_{\\mathrm{aprox}}-v|=${b}\\times10^{${n}}`,
        `100\\frac{${b}}{${a}}=${frac(100 * b, a)}`,
      ),
  }),
  sub('Sucesiones aritméticas', {
    termino_aritmetico: ({ a, b, n, k, level }) =>
      form(
        `Calcula el término de índice ${n + k}.`,
        level <= 2
          ? `u_1=${a},\\ d=${b}`
          : `u_{${k}}=${a + (k - 1) * b},\\ u_{${k + 2}}=${a + (k + 1) * b},\\quad d=\\mathrm{constante}`,
        a + (n + k - 1) * b,
        `d=${b}`,
        `u_{${n + k}}=${a}+(${n + k}-1)${b}`,
      ),
    suma_aritmetica: ({ a, b, n }) =>
      form(
        `Calcula la suma de los primeros ${n} términos.`,
        `u_j=${a}+${b}(j-1)`,
        (n * (2 * a + (n - 1) * b)) / 2,
        `u_{${n}}=${a + (n - 1) * b}`,
        `S_{${n}}=\\frac{${n}}{2}(${a}+${a + (n - 1) * b})`,
      ),
    error_porcentual: ({ a, b, n, k }) => {
      const v = a + b * (n - 1)
      return form(
        'Calcula el error porcentual de la estimación del término.',
        `u_j=${a}+${b}(j-1),\\quad \\widehat u_{${n}}=${v + k}`,
        frac(k * 100, v) + '\\%',
        `u_{${n}}=${v}`,
        `100\\frac{|${v + k}-${v}|}{${v}}=${frac(k * 100, v)}`,
      )
    },
  }),
  sub('Sucesiones geométricas', {
    termino_geometrico: ({ a, k, n, level }) =>
      form(
        `Calcula el término de índice ${n}.`,
        level <= 2
          ? `u_1=${a},\\ r=${k}`
          : `u_2=${a * k},\\ u_3=${a * k * k},\\quad u_{j+1}=r u_j`,
        a * k ** (n - 1),
        `r=${k},\\quad u_1=${a}`,
        `u_{${n}}=${a}\\cdot ${k}^{${n - 1}}`,
      ),
    suma_geometrica: ({ a, k, n }) =>
      form(
        `Calcula la suma de los primeros ${n} términos.`,
        `u_j=${a}\\cdot${k}^{j-1}`,
        (a * (k ** n - 1)) / (k - 1),
        `S_n=u_1(r^n-1)/(r-1)`,
        `S_{${n}}=${a}(${k}^{${n}}-1)/${k - 1}`,
      ),
    evaluar_logaritmo: ({ a, k, n }) =>
      form(
        'Calcula el número de intervalos de crecimiento.',
        `u_1=${a},\\ r=${k},\\quad \\log_{${k}}\\left(\\frac{${a * k ** n}}{u_1}\\right)`,
        n,
        `\\frac{${a * k ** n}}{${a}}=${k}^{${n}}`,
        `\\log_{${k}}${k}^{${n}}=${n}`,
      ),
  }),
  sub('Finanzas', {
    interes_compuesto: ({ a, b, k, n, level }) => {
      const periods = level > 2 ? 2 : 1,
        rate = 2 * k
      return form(
        'Calcula el capital final.',
        `C_0=${100 * a + b},\\quad j_{\\mathrm{anual}}=${rate}\\%,\\quad m=${periods}\\text{ capitalizaciones/año},\\quad t=${n}\\text{ años}`,
        `${100 * a + b}(1+${frac(rate, 100 * periods)})^{${periods * n}}`,
        `i=${frac(rate, 100 * periods)},\\quad N=${periods * n}`,
        `C_N=C_0(1+i)^N`,
      )
    },
    depreciacion: ({ a, b, k, n }) =>
      form(
        'Calcula el valor final tras la depreciación.',
        `V_0=${100 * a + b},\\quad d=${k + 2}\\%\\text{ anual},\\quad t=${n}\\text{ años}`,
        `${100 * a + b}\\cdot ${fmt(1 - (k + 2) / 100)}^{${n}}`,
        `r=1-${k + 2}/100=${fmt(1 - (k + 2) / 100)}`,
        `V_t=V_0r^t`,
      ),
  }),
  sub('Logaritmos', {
    evaluar_logaritmo: ({ a, k, n, level }) =>
      form(
        'Evalúa la expresión.',
        level < 3
          ? `${a}+\\log_{${k}}(${k ** n})`
          : `\\log_{${k}}(${k ** n})+\\log_{${k}}(${k ** 2})+${a}`,
        a + n + (level < 3 ? 0 : 2),
        `${k ** n}=${k}^{${n}}`,
        `\\log_{${k}}(${k}^{${n}})=${n}`,
      ),
    resolver_ecuacion_log: ({ a, k, n }) =>
      form(
        'Resuelve para x.',
        `\\log_{${k}}(x-${a})=${n}`,
        a + k ** n,
        `x-${a}=${k}^{${n}}`,
        `x=${a}+${k ** n}`,
      ),
  }),
  sub('Aproximación y error', {
    error_porcentual: ({ a, b, k }) =>
      form(
        'Calcula el error porcentual.',
        `x_{\\mathrm{exacto}}=${a * b},\\quad x_{\\mathrm{aprox}}=${a * b - k}`,
        frac(100 * k, a * b) + '\\%',
        `|\\Delta x|=${k}`,
        `E=100|\\Delta x|/${a * b}`,
      ),
    notacion_cientifica: ({ a, b, n }) => {
      const m = (a * 100 + b) / 1000,
        r = Math.round(m * 10) / 10
      return form(
        'Expresa el número en notación científica con dos cifras significativas.',
        `${fmt(m)}\\times10^{${n + 1}}`,
        `${r.toFixed(1)}\\times10^{${n + 1}}`,
        `1\\leq${fmt(m)}<10`,
        `${fmt(m)}\\approx${r.toFixed(1)}`,
      )
    },
  }),
]
