import { fmt, sum, near, result } from './series.mjs'
const sources = [
  [
    'net-sales',
    (a, b) => [
      `Venden ${b} entradas a ${a + 3} soles cada una y pagan ${a} soles por entrada emitida.`,
      3 * b,
      b * (a + 3) - b * a,
    ],
  ],
  [
    'arithmetic-sum',
    (a, b) => [
      `Cuatro aportes semanales: el primero es de ${b} soles y cada siguiente aumenta ${a} soles.`,
      4 * b + 6 * a,
      [0, 1, 2, 3].reduce((s, i) => s + b + i * a, 0),
    ],
  ],
  [
    'reverse-discount',
    (a, b) => [
      `Se dona el precio original de un artículo cuyo precio tras un descuento del 20 % es ${4 * b} soles.`,
      5 * b,
      (4 * b) / 0.8,
    ],
  ],
  [
    'geometric-sum',
    (a, b) => [
      `Tres entregas empiezan en ${a + b} soles y cada entrega duplica la anterior.`,
      7 * (a + b),
      [1, 2, 4].reduce((s, r) => s + r * (a + b), 0),
    ],
  ],
  [
    'simple-interest',
    (a, b) => [
      `Se dona solo el interés simple de ${100 * b} soles colocados al ${a} % anual durante dos años.`,
      2 * a * b,
      100 * b * (1 + (2 * a) / 100) - 100 * b,
    ],
  ],
  [
    'ratio-share',
    (a, b) => [
      `De ${(a + 2) * b} soles se destina al fondo la parte mayor de un reparto en razón ${a} a 2.`,
      a * b,
      ((a + 2) * b * a) / (a + 2),
    ],
  ],
  [
    'currency-fee',
    (a, b) => [
      `Se cambian ${b} dólares a 4 soles por dólar y se deduce una comisión fija de ${a} soles.`,
      4 * b - a,
      b * 4 - a,
    ],
  ],
  [
    'compound-interest',
    (a, b) => [
      `Se dona el interés de ${100 * b} soles capitalizados al 10 % anual durante dos años.`,
      21 * b,
      100 * b * 1.1 ** 2 - 100 * b,
    ],
  ],
]
export const funds = {
  title: 'Financiación de un proyecto',
  columns: ['Fuente', 'Condiciones de la aportación'],
  sources,
  methods: [
    'Resta al ingreso por venta el coste por entrada y multiplica el margen por la cantidad vendida.',
    'Suma la progresión aritmética usando el número de aportes por la semisuma de sus extremos.',
    'Divide el precio rebajado entre 0,80 para recuperar el original.',
    'Suma el primer aporte, su doble y su cuádruple.',
    'Calcula el interés simple con capital por tasa anual por número de años.',
    'Divide por el número total de partes y multiplica por las partes que corresponden al fondo.',
    'Multiplica los dólares por la cotización y resta la comisión fija.',
    'Capitaliza durante dos años y resta el depósito inicial para aislar los intereses.',
  ],
  goals: [
    'total-cash',
    'cash-shortfall',
    'inverse-matching-grant',
    'funding-installments',
    'annuity-finances-shortfall',
    'compound-break-even',
    'matched-total',
    'inverse-unit-price',
    'drawdown-shortfall',
  ],
  build(rows, goal, a, b) {
    const total = sum(rows.map((r) => r.value)),
      oracle = sum(rows.map((r) => r.ref)),
      budget = 2 * total + b
    const steps = [
      `Las aportaciones en soles son ${rows.map((r) => fmt(r.value)).join(', ')}. Al reunirlas se obtienen ${fmt(total)} soles.`,
    ]
    const stem =
      'Una asociación reúne aportaciones independientes para un proyecto. Todos los importes de la tabla se reciben en la misma fecha.'
    let q
    switch (goal) {
      case 0:
        q = result(
          '¿Cuántos soles ingresa en total el fondo?',
          total,
          'PEN',
          [
            'Interpreta cada condición y expresa su aportación en soles.',
            ...steps,
          ],
          (x) => near(x, oracle),
        )
        break
      case 1:
        q = result(
          `Si el proyecto cuesta ${budget} soles, ¿cuánto queda por financiar?`,
          budget - total,
          'PEN',
          [
            ...steps,
            `Resta el fondo disponible al presupuesto de ${budget} soles.`,
          ],
          (x) => near(x + oracle, budget),
        )
        break
      case 2: {
        const final = total * (1 + a / 10) + b
        q = result(
          `Una entidad aporta ${b} soles fijos más un porcentaje común del fondo. Después hay ${fmt(final)} soles. ¿Qué porcentaje aplicó?`,
          10 * a,
          '%',
          [
            ...steps,
            `Quita del saldo final el fondo inicial y los ${b} soles fijos.`,
            'Divide el complemento variable por el fondo inicial y multiplica por cien.',
          ],
          (x) => near(oracle * (1 + x / 100) + b, final),
        )
        break
      }
      case 3: {
        const net = b + 2 * a,
          remaining = budget - total,
          n = Math.ceil(remaining / net)
        q = result(
          `Para cubrir un presupuesto de ${budget} soles se organizan campañas que ingresan ${net + a} soles y cuestan ${a} soles cada una. ¿Cuántas campañas completas hacen falta como mínimo?`,
          n,
          '',
          [
            ...steps,
            `Faltan ${remaining} soles y cada campaña añade ${net} soles netos.`,
            'Divide lo pendiente por el ingreso neto y redondea hacia arriba.',
          ],
          (x) =>
            Number.isInteger(x) &&
            oracle + (x - 1) * net < budget &&
            oracle + x * net >= budget,
        )
        break
      }
      case 4: {
        const rate = a / 100,
          n = 4,
          p = budget - total,
          c = (p * rate) / (1 - (1 + rate) ** -n)
        q = result(
          `Se financia lo que falta para llegar a ${budget} soles con cuatro pagos anuales iguales a año vencido y un interés efectivo anual del ${a} %. ¿Cuánto debe valer cada pago en soles?`,
          c,
          'PEN',
          [
            ...steps,
            `El valor actual de los cuatro pagos debe ser ${p} soles.`,
            `El factor de anualidad es $(1-(1+${fmt(rate)})^{-4})/${fmt(rate)}$. Divide el capital pendiente por ese factor.`,
          ],
          (x) =>
            near(
              [1, 2, 3, 4].reduce((s, i) => s + x / (1 + rate) ** i, 0),
              budget - oracle,
            ),
        )
        break
      }
      case 5: {
        const r = 1 + (a + 3) / 100,
          t = 1.02,
          n = Math.ceil(Math.log(budget / total) / Math.log(r / t))
        q = result(
          `El fondo gana un ${a + 3} % efectivo anual. El proyecto cuesta hoy ${budget} soles y se encarece un 2 % anual. ¿Al final de qué año alcanzará el fondo por primera vez el coste del proyecto?`,
          n,
          'años',
          [
            ...steps,
            `Compara $${total}(${fmt(r)})^n$ con $${budget}(1.02)^n$.`,
            'Divide por el factor de encarecimiento, toma logaritmos y elige el menor año entero que cumple la desigualdad.',
          ],
          (x) =>
            Number.isInteger(x) &&
            oracle * r ** (x - 1) < budget * t ** (x - 1) &&
            oracle * r ** x >= budget * t ** x,
        )
        break
      }

      case 6:
        q = result(
          `Un patrocinador aporta además ${a} soles por cada 10 soles reunidos, incluso proporcionalmente para cantidades fraccionarias. ¿A cuánto asciende el fondo final en soles?`,
          total * (1 + a / 10),
          'PEN',
          [
            ...steps,
            `Por cada 10 soles iniciales quedan ${10 + a} soles tras el aporte. Multiplica el fondo por ese factor de escala.`,
          ],
          (x) => near(x - oracle, (a * oracle) / 10),
        )
        break
      case 7: {
        const grant = b * a,
          units = b + 3
        q = result(
          `Hay que adquirir ${units} equipos iguales. Se suma una ayuda de ${grant} soles, pero el transporte consume el 10 % del dinero disponible tras recibirla. ¿Cuál es el precio máximo en soles por equipo?`,
          (0.9 * (total + grant)) / units,
          'PEN',
          [
            ...steps,
            `Agrega la ayuda y reserva el 10 % para el transporte.`,
            `Divide el 90 % restante entre los ${units} equipos.`,
          ],
          (x) => near((x * units) / 0.9 - grant, oracle),
        )
        break
      }
      case 8: {
        const withdrawal = Math.ceil(total / 4) + a,
          r = 1.03
        let balance = total,
          paid = 0
        while (balance * r >= withdrawal) {
          balance = balance * r - withdrawal
          paid++
        }
        const after = (n) =>
          oracle * r ** n - (withdrawal * (r ** n - 1)) / (r - 1)
        q = result(
          `Se invierte el fondo al 3 % efectivo anual. Al final de cada año se retiran ${withdrawal} soles si hay saldo suficiente. ¿Cuántas retiradas completas puede financiar?`,
          paid,
          '',
          [
            ...steps,
            `Aplica la recurrencia $B_n=1.03 B_{n-1}-${withdrawal}$ tras cada retirada completa.`,
            `Después de ${paid} retiradas quedan aproximadamente ${fmt(balance)} soles. Incluso después de abonar el siguiente interés, el saldo es insuficiente.`,
          ],
          (x) => Number.isInteger(x) && after(x) >= -1e-8 && after(x + 1) < 0,
        )
        break
      }
    }
    return { stem, ...q }
  },
}
