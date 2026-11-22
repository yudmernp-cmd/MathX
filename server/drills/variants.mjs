import { form, frac, root, row, poly, line } from './math.mjs'
// Alternative data representations or solution methods for the same catalogue type.
export const variants = {
  1.1: {
    notacion_cientifica: ({ a, b, n, k }) =>
      form(
        'Expresa el producto en notación científica.',
        `(${a / 10}\\times10^{${n}})(2\\times10^{-${k}})`,
        `${a >= 50 ? a / 50 : a / 5}\\times10^{${n - k + Number(a >= 50)}}`,
        '(u\\times10^m)(v\\times10^n)=uv\\times10^{m+n}',
        `uv=${a / 5},\\quad m+n=${n - k}`,
      ),
  },
  1.2: {
    suma_aritmetica: ({ a, b, n }) =>
      form(
        `Halla la suma de los primeros ${n} términos.`,
        `u_2=${a + b},\\ u_4=${a + 3 * b},\\quad d=\\mathrm{constante}`,
        (n * (2 * a + (n - 1) * b)) / 2,
        `d=(u_4-u_2)/2=${b},\\quad u_1=${a}`,
        `S_{${n}}=${n}(2u_1+${n - 1}d)/2`,
      ),
  },
  1.3: {
    suma_geometrica: ({ a, k, n }) =>
      form(
        `Calcula la suma de los primeros ${n} términos.`,
        `u_2=${a * k},\\ u_3=${a * k * k},\\quad u_{j+1}=r u_j`,
        (a * (k ** n - 1)) / (k - 1),
        `r=u_3/u_2=${k},\\quad u_1=u_2/r=${a}`,
        'S_n=u_1(r^n-1)/(r-1)',
      ),
  },
  1.4: {
    depreciacion: ({ a, b, k }) =>
      form(
        'Calcula el valor después de las dos depreciaciones consecutivas.',
        `V_0=${a * 100},\\ d_1=${b}\\%,\\ d_2=${k}\\%`,
        `${a * 100}(1-${frac(b, 100)})(1-${frac(k, 100)})`,
        `V_1=V_0(1-${frac(b, 100)})`,
        `V_2=V_1(1-${frac(k, 100)})`,
      ),
  },
  1.5: {
    resolver_ecuacion_log: ({ a, k, n }) =>
      form(
        'Resuelve para x.',
        `\\log_{${k}}x-\\log_{${k}}${a}=${n}`,
        a * k ** n,
        `\\log_{${k}}(x/${a})=${n}`,
        `x=${a}\\cdot${k}^{${n}}`,
      ),
  },
  1.6: {
    error_porcentual: ({ a, b, k }) =>
      form(
        'Halla el error porcentual máximo respecto al valor indicado.',
        `v=${a * b},\\quad|\\widehat v-v|\\le${k}`,
        frac(100 * k, a * b) + '\\%',
        'E=100|\\Delta v|/|v|',
        `\\max E=100\\cdot${k}/${a * b}`,
      ),
  },
  2.1: {
    ecuacion_recta: ({ a, b, k }) =>
      form(
        'Halla la recta que pasa por P y es perpendicular a r.',
        `P=${row(b, a)},\\quad r:\\ y=-x/${k}+${b}`,
        line(k, a - k * b),
        `m=-1/(-1/${k})=${k}`,
        `y-${a}=${k}(x-${b})`,
      ),
  },
  2.2: {
    dominio_rango: ({ a, k }) =>
      form(
        'Determina el dominio en forma de intervalo.',
        `f(x)=\\log_{${k}}(${a}-x)`,
        `(-\\infty,${a})`,
        `${a}-x>0`,
        `x<${a}`,
      ),
  },
  2.3: {
    evaluar_funcion: ({ a, b, k }) =>
      form(
        'Calcula la ordenada tras la traslación indicada.',
        `f(${a})=${b},\\ g(x)=f(x-${k})+${a},\\quad g(${a + k})`,
        a + b,
        `g(${a + k})=f(${a})+${a}`,
        `g(${a + k})=${b}+${a}`,
      ),
  },
  2.4: {
    funcion_inversa: ({ a, b, k }) =>
      form(
        'Calcula la expresión de la función inversa.',
        `f(x)=\\frac{x-${a}}{${k}}+${b}`,
        poly([
          [k, 1],
          [a - k * b, 0],
        ]),
        `x=(y-${a})/${k}+${b}`,
        `y=${k}(x-${b})+${a}`,
      ),
  },
  2.5: {
    raices_cuadratica: ({ a, k }) =>
      form(
        'Halla el conjunto de raíces reales.',
        `(x-${a})^2=${k * k}`,
        `\\{${a - k},${a + k}\\}`,
        `x-${a}=\\pm${k}`,
        `x=${a}\\pm${k}`,
      ),
  },
  2.6: {
    evaluar_exponencial: ({ a, k, n }) =>
      form(
        'Evalúa f en el punto indicado.',
        `f(x)=Ar^x,\\ A>0,\\ r>0,\\quad f(0)=${a},\\ f(2)=${a * k * k},\\quad f(${n})`,
        a * k ** n,
        `A=${a},\\quad r=\\sqrt{f(2)/f(0)}=${k}`,
        `f(${n})=A r^{${n}}`,
      ),
  },
  2.7: {
    amplitud_periodo: ({ a, b, k }) =>
      form(
        'Halla la amplitud del modelo sinusoidal.',
        `\\max f=${a + b},\\quad\\min f=${b - a}`,
        a,
        'A=(\\max f-\\min f)/2',
        `A=${2 * a}/2`,
      ),
  },
  3.1: {
    punto_medio_3d: ({ a, b, k, n }) =>
      form(
        'Halla el punto medio de AB.',
        `A=${row(a, b, -n)},\\quad B-A=${row(2 * k, -2 * n, 2 * b)}`,
        row(a + k, b - n, b - n),
        'M=A+(B-A)/2',
        `(B-A)/2=${row(k, -n, b)}`,
      ),
  },
  3.2: {
    pitagoras: ({ a, b }) =>
      form(
        'Calcula la diagonal del rectángulo.',
        `[Rectángulo de perímetro ${2 * (a + b)} y ancho ${b}.]`,
        root(a * a + b * b),
        `l=${a + b}-${b}=${a}`,
        'd=\\sqrt{l^2+w^2}',
      ),
  },
  3.3: {
    bearing_a_rumbo: ({ a, b }) => {
      const v = 1 + ((a + b) % 89)
      return form(
        'Expresa la dirección de B hacia A como rumbo cuadrantal.',
        `\\operatorname{azimut}(A\\to B)=${180 + v}^\\circ`,
        `N\\,${v}^\\circ\\,E`,
        `\\operatorname{azimut}(B\\to A)=${180 + v}^\\circ-180^\\circ`,
        `0<${v}<90`,
      )
    },
  },
  3.4: {
    radio_desde_arco: ({ a, k }) =>
      form(
        'Halla el radio del sector.',
        `s=${a}\\pi,\\quad\\theta=${30 * k}^\\circ`,
        frac(6 * a, k),
        `\\theta=${frac(k, 6)}\\pi\\;\\mathrm{rad}`,
        'r=s/\\theta',
      ),
  },
  3.5: {
    interseccion_bisectriz: ({ a, b, k }) =>
      form(
        'Halla la ordenada del punto de r equidistante de A y B.',
        `A=${row(a - k, b - 1)},\\ B=${row(a + k, b + 1)},\\ r:\\ x=${a + 1}`,
        b - k,
        `M=${row(a, b)},\\quad m_\\perp=-${k}`,
        `y=${b}-${k}(x-${a})`,
      ),
  },
  3.6: {
    interpretar_regiones: ({ a, b, k }) =>
      form(
        'Halla la menor abscisa entera de un punto estrictamente más cercano a B que a A.',
        `A=${row(a, b)},\\ B=${row(a + 2 * k, b)},\\ P=(x,${b})`,
        a + k + 1,
        `PB<PA\\iff x>${a + k}`,
        `x_{\\min}= ${a + k}+1`,
      ),
  },
  4.1: {
    probabilidad_simple: ({ a, b, k }) => {
      const N = a + b + k,
        left = N - k
      return form(
        'Calcula la probabilidad de que dos elementos fijados queden ambos fuera de la muestra.',
        'N=' +
          N +
          ',\\quad n=' +
          k +
          ',\\quad\\text{muestra aleatoria simple sin reposición}',
        frac(left * (left - 1), N * (N - 1)),
        'P(A\\text{ fuera})=(N-n)/N',
        'P(B\\text{ fuera}\\mid A\\text{ fuera})=(N-n-1)/(N-1)',
      )
    },
  },
  4.2: {
    media_mediana_moda: ({ a, b, k }) =>
      form(
        'Calcula la moda de la distribución acumulada.',
        `\\begin{array}{c|ccc}x&${a}&${a + b}&${a + 2 * b}\\\\F&${k}&${3 * k}&${4 * k}\\end{array}`,
        a + b,
        `(f_1,f_2,f_3)=(${k},${2 * k},${k})`,
        `\\max f= ${2 * k}`,
      ),
  },
  4.3: {
    desviacion_estandar: ({ a, b, k }) =>
      form(
        'Calcula la desviación estándar de Y.',
        `Y=${k}X-${a},\\quad\\sigma_X=${b}`,
        k * b,
        '\\sigma_{cX+d}=|c|\\sigma_X',
        `\\sigma_Y=${k}\\cdot${b}`,
      ),
  },
  4.4: {
    probabilidad_condicional: ({ a, b, k }) =>
      form(
        'Calcula la probabilidad condicional invertida.',
        `P(A)=${frac(a, a + b)},\\quad P(B\\mid A)=1/2,\\quad P(B\\mid A^c)=1/4,\\quad P(A\\mid B)=?`,
        frac(2 * a, 2 * a + b),
        'P(B)=P(B\\mid A)P(A)+P(B\\mid A^c)P(A^c)',
        'P(A\\mid B)=P(B\\mid A)P(A)/P(B)',
      ),
  },
  4.5: {
    distribucion_binomial: ({ a, k, n }) =>
      form(
        'Calcula la probabilidad de obtener al menos un éxito.',
        'X\\sim B(' + (k + n) + ',' + frac(a, 100) + '),\\quad P(X\\ge1)',
        '1-(1-' + frac(a, 100) + ')^{' + (k + n) + '}',
        'P(X\\ge1)=1-P(X=0)',
        'P(X=0)=(1-p)^{' + (k + n) + '}',
      ),
  },
  4.6: {
    coeficiente_correlacion: ({ a, b, k }) =>
      form(
        'Halla el coeficiente de Pearson a partir de la pendiente de regresión.',
        `m_{y|x}=${frac(k, b)},\\ s_x=${a},\\ s_y=${a * k},\\quad r=?`,
        frac(1, b),
        'm_{y|x}=r s_y/s_x',
        'r=m_{y|x}s_x/s_y',
      ),
  },
  5.1: {
    derivar_polinomio: ({ a, b, k }) =>
      form(
        'Evalúa el límite incremental.',
        `\\lim_{h\\to0}\\frac{${a}[(${b}+h)^3-${b}^3]}{h}`,
        3 * a * b * b,
        `((${b}+h)^3-${b}^3)/h=3\\cdot${b}^2+3\\cdot${b}h+h^2`,
        `L=3\\cdot${a}\\cdot${b}^2`,
      ),
  },
  5.2: {
    derivar_regla_cadena: ({ a, b, k }) =>
      form(
        'Deriva respecto de x.',
        `f(x)=(x^2+${a}x+${b})^2`,
        `2(x^2+${a}x+${b})(2x+${a})`,
        `u=x^2+${a}x+${b},\\ u'=2x+${a}`,
        "f'(x)=2uu'",
      ),
  },
  5.3: {
    optimizacion: ({ a, b, k }) =>
      form(
        'Halla el valor máximo en el intervalo cerrado.',
        `f(x)=(x-${a})^2+${b},\\quad ${a - k}\\le x\\le${a + 2 * k}`,
        4 * k * k + b,
        `f'(${a})=0,\\ f(${a})=${b}`,
        `f(${a - k})=${k * k + b},\\quad f(${a + 2 * k})=${4 * k * k + b}`,
      ),
  },
  5.4: {
    area_bajo_curva: ({ a, b, k }) =>
      form(
        'Calcula el área encerrada por la parábola y el eje horizontal.',
        `y=${k}x(${a}-x),\\quad 0\\le x\\le${a}`,
        frac(k * a ** 3, 6),
        `A=\\int_0^{${a}}${k}x(${a}-x)\\,dx`,
        `A=${k}[${a}x^2/2-x^3/3]_0^{${a}}`,
      ),
  },
}
