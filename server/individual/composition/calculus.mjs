import { fmt, sum, near, result, invert } from './series.mjs'
// Each rate stays positive on its local interval. Simpson's rule is exact for
// all these cubic-or-lower polynomials and checks the independently written primitives.
const sources = [
  ['constant', (a, b) => [`q(u) = ${b}`, (u) => b, (t) => b * t]],
  [
    'linear-rising',
    (a, b) => [
      `q(0) = ${b}; el caudal aumenta ${a} L/min cada minuto.`,
      (u) => b + a * u,
      (t) => b * t + (a * t * t) / 2,
    ],
  ],
  [
    'quadratic-rise',
    (a, b) => [
      `q(u) = ${b} + ${a}u²`,
      (u) => b + a * u * u,
      (t) => b * t + (a * t ** 3) / 3,
    ],
  ],
  [
    'parabolic-hump',
    (a, b, d) => [
      `q(u) = ${b} + ${a}u(${d} − u)`,
      (u) => b + a * u * (d - u),
      (t) => b * t + a * ((d * t * t) / 2 - t ** 3 / 3),
    ],
  ],
  [
    'linear-two-readings',
    (a, b, d) => [
      `El caudal decrece linealmente de ${b + a * d} a ${b} L/min entre los extremos del tramo.`,
      (u) => b + a * (d - u),
      (t) => (b + a * d) * t - (a * t * t) / 2,
    ],
  ],
  [
    'cubic-rise',
    (a, b) => [
      `q(u) = ${b} + u³`,
      (u) => b + u ** 3,
      (t) => b * t + t ** 4 / 4,
    ],
  ],
  [
    'squared-linear',
    (a, b) => [
      `q(u) = (${a} + u)²`,
      (u) => (a + u) ** 2,
      (t) => ((a + t) ** 3 - a ** 3) / 3,
    ],
  ],
  [
    'cubic-taper',
    (a, b, d) => [
      `q(u) = ${b} + (${d} − u)³`,
      (u) => b + (d - u) ** 3,
      (t) => b * t + (d ** 4 - (d - t) ** 4) / 4,
    ],
  ],
]
export const calculus = {
  title: 'Caudal variable por tramos',
  columns: ['Tramo', 'Duración (min)', 'Caudal en L/min'],
  sources,
  methods: [
    'Para un caudal constante la integral es el caudal por la duración.',
    'Si el caudal es $q_0+ku$, su volumen acumulado es $q_0t+kt^2/2$.',
    'Integra el término cuadrático con la regla de la potencia y añade el caudal constante por el tiempo.',
    'Desarrolla $u(d-u)$ como $du-u^2$ antes de integrar término a término.',
    'El caudal cambia linealmente: el volumen de todo el tramo es la media de los caudales extremos por la duración.',
    'El término cúbico aporta $t^4/4$ a la integral.',
    'Una primitiva de $(a+u)^2$ es $(a+u)^3/3$. Resta los valores en los límites.',
    'Para integrar $(d-u)^3$ usa la primitiva $-(d-u)^4/4$.',
  ],
  goals: [
    'integral-volume',
    'mean-rate',
    'initial-level',
    'constant-outflow',
    'fill-time',
    'time-after-valve-change',
    'final-state',
    'piecewise-tariff',
    'sensor-gain',
  ],
  build(rows, goal, a, b) {
    const integrals = rows.map((r) => r.ref(r.duration)),
      total = sum(integrals),
      period = sum(rows.map((r) => r.duration))
    function volume(time, quadrature = false) {
      let remaining = time,
        v = 0
      for (const r of rows) {
        const t = Math.min(remaining, r.duration)
        if (t <= 0) break
        v += quadrature
          ? (t * (r.value(0) + 4 * r.value(t / 2) + r.value(t))) / 6
          : r.ref(t)
        remaining -= t
      }
      return v
    }
    const oracle = volume(period, true),
      steps = [
        'Integra el caudal desde cero hasta la duración de cada tramo.',
        `Las aportaciones, en el orden de la tabla, son aproximadamente ${integrals.map(fmt).join(', ')} L. Suman ${fmt(total)} L.`,
      ]
    const stem =
      'Un depósito recibe agua en tramos consecutivos. En cada fila, u es el tiempo en minutos transcurrido desde el inicio de ese tramo. El caudal puede cambiar al pasar al tramo siguiente.'
    let q
    switch (goal) {
      case 0:
        q = result(
          '¿Cuántos litros entran durante todo el registro?',
          total,
          'L',
          steps,
          (x) => near(x, oracle),
        )
        break
      case 1:
        q = result(
          '¿Qué caudal constante en L/min aportaría el mismo volumen en el mismo tiempo?',
          total / period,
          'L/min',
          [
            ...steps,
            `Divide el volumen acumulado entre los ${period} minutos de registro.`,
          ],
          (x) => near(x * period, oracle),
        )
        break
      case 2: {
        const end = Math.ceil(total) + 10 * b
        q = result(
          `Al final se registran ${end} L y no hubo salidas. ¿Cuántos litros había al principio?`,
          end - total,
          'L',
          [
            ...steps,
            `Resta el volumen integrado al volumen final de ${end} L.`,
          ],
          (x) => near(x + oracle, end),
        )
        break
      }
      case 3: {
        const gain = Math.floor(total * 0.7)
        q = result(
          `También hubo una salida constante durante todo el registro y el aumento neto fue de ${gain} L. ¿Cuál fue el caudal de salida en L/min?`,
          (total - gain) / period,
          'L/min',
          [
            ...steps,
            `El agua evacuada es la entrada total menos ${gain} L. Divide el resultado por ${period} minutos.`,
          ],
          (x) => near(oracle - x * period, gain),
        )
        break
      }
      case 4:
      case 5: {
        // Choose a target in the final stage so every preceding row is necessary.
        const last = rows.at(-1),
          start = period - last.duration,
          prior = volume(start)
        const ratio = goal === 4 ? 1 : 0.5
        const target = Math.ceil(prior + ratio * (total - prior) * 0.45)
        const adjusted = (t, independent = false) =>
          volume(start, independent) +
          ratio * (volume(t, independent) - volume(start, independent))
        const t = invert(adjusted, target, start, period)
        const extra =
          goal === 5
            ? 'Durante el último tramo se desvía la mitad del caudal descrito y solo la otra mitad llega al depósito. '
            : ''
        q = result(
          `${extra}¿En qué minuto desde el inicio se habrán recibido ${target} litros?`,
          t,
          'min',
          [
            `Suma las integrales hasta el penúltimo tramo. En el minuto ${start} han entrado aproximadamente ${fmt(prior)} L.`,
            `Faltan aproximadamente ${fmt(target - prior)} L. Iguala esa cantidad a ${goal === 4 ? 'la integral' : 'la mitad de la integral'} del caudal del último tramo entre 0 y el tiempo local buscado.`,
            'Resuelve en el intervalo del último tramo y suma el tiempo transcurrido antes de él.',
          ],
          (x) => x >= start && x <= period && near(adjusted(x, true), target),
        )
        break
      }

      case 6:
        q = result(
          `Al inicio había ${10 * b} L y no se extrae agua. ¿Cuál es el volumen final en litros?`,
          10 * b + total,
          'L',
          [
            ...steps,
            'Suma al volumen integrado el contenido que ya había al inicio.',
          ],
          (x) => near(x - 10 * b, oracle),
        )
        break
      case 7: {
        const first = integrals[0],
          cost = a * first + (a + 2) * (total - first)
        q = result(
          `El primer tramo se factura a ${a} céntimos por litro y el resto a ${a + 2} céntimos por litro. ¿Cuánto cuesta toda la entrada en soles?`,
          cost / 100,
          'PEN',
          [
            ...steps,
            'Separa la integral del primer tramo de las restantes. Aplica a cada volumen su tarifa.',
            'Suma los costes en céntimos y divide entre cien.',
          ],
          (x) =>
            near(
              100 * x,
              (a + 2) * oracle - 2 * volume(rows[0].duration, true),
            ),
        )
        break
      }
      case 8: {
        const last = rows.at(-1),
          early = total - integrals.at(-1),
          reading = Math.ceil(total) + b,
          factor = (reading - early) / integrals.at(-1)
        q = result(
          `Una medición independiente indica ${reading} L de entrada total. Los caudales anteriores al último tramo eran exactos. ¿Por qué factor constante debe multiplicarse el caudal del último tramo para reproducir esa medición?`,
          factor,
          '',
          [
            ...steps,
            `Resta a los ${reading} L medidos la entrada integrada antes del tramo final.`,
            'Solo el volumen del último tramo cambia con la calibración. Divide el volumen que falta por la integral registrada para ese tramo.',
          ],
          (x) =>
            near(
              volume(period - last.duration, true) +
                x * (oracle - volume(period - last.duration, true)),
              reading,
            ),
        )
        break
      }
    }
    return { stem, ...q }
  },
}
