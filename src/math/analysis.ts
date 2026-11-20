import { fmt, numberPart as n, review, type Family } from './model'

export const analysisFamilies: Family[] = [
  {
    id: 'deposito',
    theme: 'Análisis matemático',
    topic: 'Optimización y tasas de cambio',
    courses: ['MAI'],
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
                  `La tasa es lineal. El cambio de volumen en el primer minuto es el área del trapecio de alturas ${b} y ${b - 2 * a}, con base 1. Suma este cambio a los ${c} litros iniciales.`,
                ],
                ['Acumula el cambio a partir del volumen inicial.'],
              )
            : n(
                level === 'Fácil'
                  ? 'Calcula el volumen al cabo de dos minutos.'
                  : 'Calcula la tasa instantánea de cambio a los dos minutos.',
                level === 'Fácil' ? at(2) : b - 4 * a,
                [
                  level === 'Fácil'
                    ? 'Sustituye $t=2$ en el modelo.'
                    : `Deriva término a término: $V\u0027(t)=${b}-${2 * a}t$. Sustituye 2.`,
                ],
                ['Evalúa el modelo apropiado en el instante pedido.'],
              ),
          level === 'Difícil'
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
]
