import { fmt, numberPart as n, review, type Family } from './model'

export const analysisFamilies: Family[] = [
  {
    id: 'deposito',
    topic: 'Cálculo y optimización',
    courses: ['MAI', 'MAE'],
    make(r, v, level) {
      const k = r(3, 9),
        a = r(1, 3),
        b = 2 * a * k,
        c = r(12, 30),
        peak = c + a * k * k,
        at = (t: number) => c + b * t - a * t * t
      return {
        stem: `El volumen de agua (litros) de un depósito se modela durante $0≤t≤${2 * k}$ minutos. ${v ? `Al inicio contiene ${c} litros y su tasa de cambio es $V'(t)=${b}-${2 * a}t$ litros por minuto.` : `El modelo es $V(t)=${c}+${b}t-${a}t^2$.`}`,
        tasks: [
          v
            ? n(
                'Calcula el volumen tras un minuto.',
                at(1),
                [
                  `Integra la tasa: $V(t)=C+${b}t-${a}t^2$. El volumen inicial fija $C=${c}$. Evalúa en 1.`,
                ],
                ['Acumula el cambio a partir del volumen inicial.'],
              )
            : n(
                level === 'Básico'
                  ? 'Calcula el volumen al cabo de dos minutos.'
                  : 'Calcula la tasa instantánea de cambio a los dos minutos.',
                level === 'Básico' ? at(2) : b - 4 * a,
                [
                  level === 'Básico'
                    ? 'Sustituye $t=2$ en el modelo.'
                    : `Deriva término a término: $V\u0027(t)=${b}-${2 * a}t$. Sustituye 2.`,
                ],
                ['Evalúa el modelo apropiado en el instante pedido.'],
              ),
          level === 'Avanzado'
            ? n(
                `El depósito contiene ${at(1)} litros en el minuto 1. Encuentra el segundo instante con ese volumen.`,
                2 * k - 1,
                [
                  `Por simetría respecto de $t=${k}$, el otro instante es $2·${k}-1$.`,
                ],
                ['Resuelve la ecuación cuadrática o usa simetría.'],
              )
            : n(
                '¿En qué minuto alcanza el máximo volumen?',
                k,
                [
                  `La tasa $ ${b}-${2 * a}t$ cambia de positiva a negativa en $t=${k}$.`,
                ],
                ['Localiza el cambio de signo de la tasa.'],
              ),
          n(
            `¿Cuántos litros deben extraerse de golpe en el instante de máximo volumen para volver al nivel del minuto 1?`,
            peak - at(1),
            [
              `En el minuto ${k} el máximo es ${peak} litros. En el minuto 1 hay ${at(1)}. Resta ambos valores.`,
            ],
            [
              'Localiza y evalúa el máximo.',
              'Compara con el volumen en el minuto 1.',
            ],
          ),
          n(
            'Calcula el cambio medio de volumen por minuto entre el minuto 1 y el instante del máximo.',
            (peak - at(1)) / (k - 1),
            [
              `La variación es ${peak - at(1)} litros en ${k - 1} minutos. Usa el cociente de incrementos.`,
            ],
            [
              'Obtiene la variación de volumen.',
              'Usa el intervalo temporal correcto.',
            ],
          ),
          review(
            'Un estudiante concluye que el depósito mantuvo su volumen constante porque los volúmenes inicial y final coinciden. Evalúa el argumento usando la tasa de cambio.',
            [
              `La tasa es positiva antes de ${k} y negativa después. Ambas variaciones se compensan, aunque el volumen alcanza ${peak} litros.`,
            ],
            [
              'Distingue cambio neto de tasa instantánea.',
              'Identifica un intervalo de crecimiento.',
              'Identifica un intervalo de decrecimiento.',
              'Explica por qué coinciden los extremos.',
            ],
          ),
        ],
      }
    },
  },
  {
    id: 'sucesion',
    topic: 'Sucesiones aritméticas',
    courses: ['MAE'],
    make(r, v, level) {
      const a = r(2, 8),
        d = r(2, 6),
        k = r(4, 9),
        term = (i: number) => a + (i - 1) * d,
        sum = (i: number) => (i * (a + term(i))) / 2
      return {
        stem: `Una sucesión aritmética tiene ${v ? `$u_3=${term(3)}$ y $u_${k}=${term(k)}$` : `primer término ${a} y diferencia común ${d}`}. El índice inicial es 1.`,
        tasks: [
          v
            ? n(
                'Determina la diferencia común.',
                d,
                [`Divide $u_${k}-u_3$ entre ${k - 3} intervalos.`],
                ['Relaciona la separación de índices con el cambio.'],
              )
            : n(
                level === 'Básico'
                  ? `Calcula el término de índice ${k}.`
                  : `Determina el índice del término ${term(k)}.`,
                level === 'Básico' ? term(k) : k,
                [`Usa $u_n=${a}+(n-1)${d}$ y sustituye el dato conocido.`],
                ['Emplea el término general con índice inicial 1.'],
              ),
          level === 'Avanzado'
            ? n(
                `¿Cuántos términos iniciales suman exactamente ${sum(k + 2)}?`,
                k + 2,
                [
                  `Resuelve $n(2·${a}+(n-1)${d})/2=${sum(k + 2)}$ y conserva la raíz positiva entera.`,
                ],
                ['Plantea una ecuación para la suma.'],
              )
            : n(
                `Calcula la suma de los primeros ${k} términos.`,
                sum(k),
                [
                  `Halla $u_1=${a}$ y $u_${k}=${term(k)}$. Multiplica su media por ${k}.`,
                ],
                ['Usa la suma aritmética.'],
              ),
          n(
            `Se descartan los primeros dos términos. Calcula la suma de los siguientes ${k}.`,
            sum(k + 2) - sum(2),
            [
              `Los extremos son $u_3=${term(3)}$ y $u_{${k + 2}}=${term(k + 2)}$. Su promedio multiplicado por ${k} da el total.`,
            ],
            [
              'Fija el primer índice retenido.',
              'Determina el último término incluido.',
              'Suma el bloque correcto.',
            ],
          ),
          n(
            `Se forma otra sucesión con los términos de índices impares de la original. Calcula la suma de sus primeros ${k} términos.`,
            (k * (a + term(2 * k - 1))) / 2,
            [
              `La nueva diferencia es ${2 * d}. El último índice original es ${2 * k - 1}. Promedia los extremos y multiplica por ${k}.`,
            ],
            [
              'Identifica el nuevo paso.',
              'Relaciona índices de ambas sucesiones.',
              'Aplica la suma al nuevo bloque.',
            ],
          ),
          review(
            'Demuestra que la suma de dos términos equidistantes del término de índice central es el doble de ese término central.',
            [
              'Para índices válidos, $u_{j-h}=u_j-hd$ y $u_{j+h}=u_j+hd$. Al sumar se cancelan los desplazamientos y queda $2u_j$.',
            ],
            [
              'Define los índices simétricos.',
              'Expresa el desplazamiento izquierdo.',
              'Expresa el desplazamiento derecho.',
              'Suma y justifica la cancelación.',
            ],
          ),
        ],
      }
    },
  },
  {
    id: 'parabola',
    topic: 'Funciones cuadráticas',
    courses: ['MAE'],
    make(r, v, level) {
      const k = r(3, 9),
        h = r(2, k - 1),
        a = r(1, 4),
        lo = k - h,
        hi = k + h,
        top = a * h * h
      return {
        stem: v
          ? `La parábola $f$ corta el eje horizontal en $${lo}$ y $${hi}$ y pasa por $(${k},${top})$.`
          : `Considera la función $f(x)=${top}-${a}(x-${k})^2$ definida para todo número real.`,
        tasks: [
          v
            ? n(
                'Halla el coeficiente de $x^2$ de la función.',
                -a,
                [
                  `Escribe $f(x)=A(x-${lo})(x-${hi})$ y sustituye el tercer punto.`,
                ],
                ['Usa la forma factorizada.'],
              )
            : n(
                level === 'Básico'
                  ? 'Halla la abscisa del vértice.'
                  : 'Halla la menor raíz de la función.',
                level === 'Básico' ? k : lo,
                [
                  level === 'Básico'
                    ? `El término cuadrado se anula en $x=${k}$.`
                    : `Igualar a cero da $(x-${k})^2=${h * h}$. Elige la raíz menor.`,
                ],
                ['Utiliza la forma de vértice.'],
              ),
          level === 'Avanzado'
            ? n(
                `Halla la longitud del intervalo donde $f(x)≥${top - a}$.`,
                2,
                [
                  `La desigualdad equivale a $(x-${k})^2≤1$. Los extremos son ${k - 1} y ${k + 1}.`,
                ],
                ['Resuelve la desigualdad en ambas ramas.'],
              )
            : n(
                'Calcula la ordenada del corte con el eje vertical.',
                -a * lo * hi,
                [`Evalúa $f(0)=-${a}(0-${lo})(0-${hi})$.`],
                ['Sustituye cero en la expresión.'],
              ),
          n(
            'Una recta horizontal corta la parábola en dos puntos separados por 2 unidades. Determina la altura de la recta.',
            top - a,
            [
              `El punto medio tiene abscisa ${k}. Los cortes están a una unidad de ese eje. Evalúa $f(${k + 1})$.`,
            ],
            [
              'Localiza el eje de simetría.',
              'Deduce las abscisas a partir de la separación.',
            ],
          ),
          n(
            'Calcula el área encerrada entre la parábola y el eje horizontal.',
            (4 * a * h ** 3) / 3,
            [
              `Integra entre ${lo} y ${hi}. La simetría permite usar $2\\int_0^{${h}}(${top}-${a}u^2)\\,du$. Evalúa $2[${top}u-${a}u^3/3]$ entre 0 y ${h}.`,
            ],
            [
              'Identifica los límites.',
              'Plantea área bajo la curva positiva.',
              'Obtiene y evalúa una primitiva.',
            ],
          ),
          review(
            'Justifica cuántas soluciones reales distintas tiene $f(x)=c$ según el valor de $c$.',
            [
              `La parábola abre hacia abajo y alcanza ${top}. Una horizontal inferior al máximo da dos cortes, la tangente horizontal uno y una superior ninguno.`,
            ],
            [
              'Identifica máximo y concavidad.',
              'Describe el caso bajo el máximo.',
              'Describe la igualdad.',
              'Describe el caso sobre el máximo.',
            ],
          ),
        ],
      }
    },
  },
]
