import { fmt, sum, near, result } from './series.mjs'
const sources = [
  [
    'complement',
    (a, b) => [
      `Hay ${a + b} fichas; ${b} son blancas. Éxito: sacar una que no sea blanca.`,
      a / (a + b),
      1 - b / (a + b),
    ],
  ],
  [
    'two-without-replacement',
    (a, b) => [
      `De ${a} verdes y ${b} blancas se sacan dos sin reposición. Éxito: dos verdes.`,
      (a * (a - 1)) / ((a + b) * (a + b - 1)),
      (a / (a + b)) * ((a - 1) / (a + b - 1)),
    ],
  ],
  [
    'two-independent-attempts',
    (a, b) => [
      `Dos intentos independientes, cada uno con probabilidad ${a}/${a + b} de acierto. Éxito: al menos un acierto.`,
      1 - (b / (a + b)) ** 2,
      (a * a + 2 * a * b) / (a + b) ** 2,
    ],
  ],
  [
    'uniform-sector',
    (a, b) => [
      `Ruleta uniforme con un sector ganador de ${10 * a} grados. Un giro.`,
      a / 36,
      (10 * a) / 360,
    ],
  ],
  [
    'disjoint-prizes',
    (a, b) => [
      `Una de ${a + 2 * b} tarjetas equiprobables: ${a} premian con libro y ${b} con entrada, premios excluyentes. Éxito: cualquier premio.`,
      (a + b) / (a + 2 * b),
      1 - b / (a + 2 * b),
    ],
  ],
  [
    'ordered-draw',
    (a, b) => [
      `Se extraen dos fichas sin reposición de ${a} rojas y ${b} azules. Éxito: primero roja y después azul.`,
      (a * b) / ((a + b) * (a + b - 1)),
      (a / (a + b)) * (b / (a + b - 1)),
    ],
  ],
  [
    'conditional-sample',
    (a, b) => [
      `Solo participan las ${b} tarjetas selladas: ${a} son premiadas. Las otras ${b + 3} tarjetas quedan fuera. Éxito: premio.`,
      a / b,
      1 - (b - a) / b,
    ],
  ],
  [
    'even-on-die',
    (a, b) => [
      `Dado justo de caras numeradas de 1 a ${2 * a + 1}. Éxito: obtener un número par.`,
      a / (2 * a + 1),
      Array.from({ length: 2 * a + 1 }, (_, i) => i + 1).filter(
        (n) => n % 2 === 0,
      ).length /
        (2 * a + 1),
    ],
  ],
]
export const statistics = {
  title: 'Probabilidad en estaciones de juego',
  columns: ['Estación', 'Boletos de acceso', 'Regla de éxito'],
  sources,
  methods: [
    'Usa el complemento de la proporción de fichas blancas.',
    'Multiplica las probabilidades de las dos verdes reduciendo en uno tanto las verdes como el total tras la primera extracción.',
    'La probabilidad de algún acierto es uno menos la del doble fallo independiente.',
    'Divide el ángulo del sector ganador entre 360 grados.',
    'Suma las tarjetas con libro y con entrada antes de dividir entre el total.',
    'Multiplica la proporción inicial de rojas por la de azules tras retirar una roja.',
    'Usa como denominador únicamente el número de tarjetas selladas.',
    'Cuenta las caras pares y divide por el número de caras del dado.',
  ],
  goals: [
    'mixture-probability',
    'expected-successes',
    'posterior-source',
    'exactly-one-of-two',
    'shared-source-both',
    'same-source-given-successes',
    'expected-net-pay',
    'no-success',
    'posterior-mixture-retest',
  ],
  build(rows, goal, a, b) {
    const weights = rows.map((r) => r.b),
      total = sum(weights),
      base = rows.map((r, i) => (weights[i] / total) * r.value)
    const P = sum(base),
      Q = sum(rows.map((r, i) => r.ref * weights[i])) / total
    const stem =
      'Al iniciar una visita se elige un boleto al azar entre todos los boletos de acceso. El boleto indica en qué estación se jugará. En visitas independientes se devuelven los boletos y se restablece el material.'
    const steps = [
      `En cada estación, la probabilidad de éxito es aproximadamente ${rows.map((r) => fmt(r.value)).join(', ')}, en orden.`,
      `Pondera cada probabilidad por sus boletos divididos entre ${total}. La probabilidad total de éxito es ${fmt(P)}.`,
    ]
    let q
    switch (goal) {
      case 0:
        q = result(
          '¿Cuál es la probabilidad de éxito en una visita?',
          P,
          '',
          steps,
          (x) => near(x, Q),
        )
        break
      case 1:
        q = result(
          `En ${10 * b} visitas independientes, ¿cuántos éxitos se esperan?`,
          10 * b * P,
          '',
          [
            ...steps,
            `Por linealidad de la esperanza, multiplica esa probabilidad por ${10 * b}.`,
          ],
          (x) => near(x, 10 * b * Q),
        )
        break
      case 2:
        q = result(
          'Si una visita termina en éxito, ¿cuál es la probabilidad de que fuera en la primera estación de la tabla?',
          base[0] / P,
          '',
          [
            ...steps,
            'Divide la probabilidad conjunta de primera estación y éxito entre la probabilidad total de éxito.',
          ],
          (x) => near(x * Q, (rows[0].ref * weights[0]) / total),
        )
        break
      case 3:
        q = result(
          'En dos visitas independientes, ¿cuál es la probabilidad de obtener exactamente un éxito?',
          2 * P * (1 - P),
          '',
          [
            ...steps,
            'Suma los casos éxito–fracaso y fracaso–éxito. Cada uno tiene probabilidad $p(1-p)$.',
          ],
          (x) => near(x, 1 - Q ** 2 - (1 - Q) ** 2),
        )
        break
      case 4: {
        const joint = sum(
          rows.map((r, i) => (weights[i] / total) * r.value ** 2),
        )
        q = result(
          'Se escoge una estación una sola vez y se juega allí dos veces, restableciendo el material entre partidas. ¿Cuál es la probabilidad de dos éxitos?',
          joint,
          '',
          [
            steps[0],
            'Condicionado a la estación, las partidas son independientes: eleva al cuadrado la probabilidad de éxito de cada estación.',
            `Pondera cada cuadrado por la probabilidad de elegir esa estación, usando los ${total} boletos.`,
          ],
          (x) =>
            near(
              x,
              sum(rows.map((r, i) => r.ref * r.ref * weights[i])) / total,
            ),
        )
        break
      }
      case 5:
        q = result(
          'Dos visitas independientes terminaron en éxito. ¿Cuál es la probabilidad de que las dos se realizaran en la misma estación?',
          sum(base.map((p) => p * p)) / (P * P),
          '',
          [
            ...steps,
            'Condicionado al éxito, el peso de cada estación es su probabilidad conjunta de estación y éxito dividida por la probabilidad total de éxito.',
            'Eleva esos pesos al cuadrado y súmalos. Cada término representa coincidir en una estación distinta.',
          ],
          (x) =>
            near(
              x * Q ** 2,
              sum(rows.map((r, i) => ((weights[i] * r.ref) / total) ** 2)),
            ),
        )
        break

      case 6:
        q = result(
          `Cada éxito paga ${b} soles y una visita cuesta ${a} soles. ¿Cuál es la ganancia neta esperada por visita, en soles?`,
          b * P - a,
          'PEN',
          [
            ...steps,
            'Multiplica el premio por la probabilidad de cobrarlo y resta el coste de participar.',
          ],
          (x) => near(x, (b - a) * Q - a * (1 - Q)),
        )
        break
      case 7:
        q = result(
          `¿Cuál es la probabilidad de que ninguna de tres visitas independientes termine en éxito?`,
          (1 - P) ** 3,
          '',
          [
            ...steps,
            'Calcula la probabilidad complementaria de fracaso en una visita. Por independencia, elévala al cubo.',
          ],
          (x) => near(x, (1 - Q) ** 3),
        )
        break
      case 8: {
        const joint = sum(
          rows.map((r, i) => (weights[i] / total) * r.value ** 2),
        )
        q = result(
          'Se elige la estación una sola vez. La primera partida tiene éxito y se repite allí tras restablecer el material. ¿Cuál es la probabilidad de éxito en la segunda partida sabiendo el resultado de la primera?',
          joint / P,
          '',
          [
            ...steps,
            'Para cada estación, multiplica su peso de acceso por su probabilidad de dos éxitos. Suma los productos.',
            'Divide la probabilidad conjunta de dos éxitos por la probabilidad de éxito en la primera partida.',
          ],
          (x) =>
            near(
              x * Q,
              sum(rows.map((r, i) => weights[i] * r.ref ** 2)) / total,
            ),
        )
        break
      }
    }
    return { stem, ...q }
  },
}
