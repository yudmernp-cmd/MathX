import { fmt, sum, near, result, invert } from './series.mjs'
const sources = [
  [
    'affine-two-points',
    (a, b) => [
      `Modelo lineal: a las 0 h hay ${b} L y a las 2 h, ${b + 2 * a} L.`,
      (t) => b + a * t,
      (t) => b + ((b + 2 * a - b) * t) / 2,
    ],
  ],
  [
    'quadratic-vertex',
    (a, b) => [
      `Volumen inicial ${b} L. El aumento es proporcional al cuadrado del tiempo y en 2 h aumenta ${4 * a} L.`,
      (t) => b + a * t * t,
      (t) => b + 4 * a * (t / 2) ** 2,
    ],
  ],
  [
    'exponential-doubling',
    (a, b) => [
      `Parte de ${b} L y se duplica cada ${a} h según un modelo exponencial continuo.`,
      (t) => b * 2 ** (t / a),
      (t) => b * Math.exp((t * Math.LN2) / a),
    ],
  ],
  [
    'piecewise-rate',
    (a, b) => [
      `Parte de ${b} L. Entra 1 L/h hasta la hora 3 y después entran ${a} L/h.`,
      (t) => b + Math.min(t, 3) + a * Math.max(t - 3, 0),
      (t) => (t <= 3 ? b + t : b + 3 + a * (t - 3)),
    ],
  ],
  [
    'square-root',
    (a, b) => [
      `Parte de ${b} L. El aumento es proporcional a la raíz cuadrada del tiempo y a las 4 h es de ${2 * a} L.`,
      (t) => b + a * Math.sqrt(t),
      (t) => b + 2 * a * Math.sqrt(t / 4),
    ],
  ],
  [
    'saturating-rational',
    (a, b) => [
      `Volumen en litros: V(t) = ${b} + ${10 * a}t/(2+t).`,
      (t) => b + (10 * a * t) / (2 + t),
      (t) => b + 10 * a - (20 * a) / (2 + t),
    ],
  ],
  [
    'cubic',
    (a, b) => [
      `Volumen inicial ${b} L. El aumento es proporcional al cubo del tiempo y en 2 h aumenta ${8 * a} L.`,
      (t) => b + a * t ** 3,
      (t) => b + 8 * a * (t / 2) ** 3,
    ],
  ],
  [
    'log-growth',
    (a, b) => [
      `Volumen en litros: V(t) = ${b} + ${a} log₂(1+t).`,
      (t) => b + a * Math.log2(1 + t),
      (t) => b + (a * Math.log(1 + t)) / Math.LN2,
    ],
  ],
]
export const functions = {
  title: 'Modelos de llenado',
  columns: ['Depósito', 'Modelo de volumen'],
  sources,
  methods: [
    'Obtén la pendiente restando los dos volúmenes y dividiendo entre las dos horas. Usa la lectura inicial como ordenada en el origen.',
    'Escribe el aumento como $kt^2$ y despeja $k$ con el aumento de la hora dos.',
    'Si el tiempo de duplicación es $d$, multiplica el volumen inicial por $2^{t/d}$.',
    'Suma la entrada hasta el cambio de caudal y añade la entrada posterior solo si el tiempo supera tres horas.',
    'Escribe el aumento como $k\\sqrt{t}$ y divide el aumento conocido en la hora cuatro por dos para obtener $k$.',
    'Evalúa primero el cociente del modelo racional y después suma el volumen inicial.',
    'Divide el aumento observado en la hora dos entre ocho para obtener el coeficiente de $t^3$.',
    'Para evaluar el logaritmo en base dos puedes usar $\\ln(1+t)/\\ln 2$.',
  ],
  goals: [
    'combined-output',
    'increase',
    'first-level-crossing',
    'secant-rate',
    'time-after-unknown-start',
    'capacity-after-calibration',
    'capacity-reserve',
    'split-delivery',
    'moving-threshold',
  ],
  build(rows, goal, a, b) {
    const V = (t) => sum(rows.map((r) => r.value(t))),
      W = (t) => sum(rows.map((r) => r.ref(t)))
    const t = 2 + (a % 3),
      v = V(t),
      threshold = Math.round((V(2) + V(6)) / 2),
      base = V(0)
    const stem =
      'Varios depósitos empiezan a llenarse a la vez. En cada modelo, t es el tiempo en horas desde el inicio. Los modelos son válidos de 0 a 10 horas.'
    const parts = `A las ${t} h, los volúmenes en litros son aproximadamente ${rows.map((r) => fmt(r.value(t))).join(', ')}.`
    let q
    switch (goal) {
      case 0:
        q = result(
          `¿Qué volumen total hay a las ${t} h, en litros?`,
          v,
          'L',
          [parts, 'Suma los volúmenes de todos los depósitos en ese instante.'],
          (x) => near(x, W(t)),
        )
        break
      case 1:
        q = result(
          `¿En cuántos litros aumenta el volumen conjunto durante las primeras ${t} horas?`,
          v - base,
          'L',
          [
            parts,
            `El volumen inicial conjunto es ${fmt(base)} L. Réstalo al volumen final.`,
          ],
          (x) => near(x + W(0), W(t)),
        )
        break
      case 2: {
        const x = invert(V, threshold, 2, 6)
        q = result(
          `¿A cuántas horas del inicio alcanza el conjunto los ${threshold} litros?`,
          x,
          'h',
          [
            'Construye el modelo total sumando las expresiones de la tabla para el mismo tiempo.',
            `Resuelve $V_{total}(t)=${threshold}$ entre 2 y 6 con la calculadora. El volumen crece en todo el intervalo y el cruce es único.`,
          ],
          (ans) => ans >= 2 && ans <= 6 && near(W(ans), threshold),
        )
        break
      }
      case 3:
        q = result(
          `¿Cuál es la tasa media de aumento del volumen conjunto entre la hora 1 y la hora ${t}, en litros por hora?`,
          (v - V(1)) / (t - 1),
          'L/h',
          [
            parts,
            `Resta el total inicial del intervalo, ${fmt(V(1))} L, al total final.`,
            `Divide el incremento entre ${t - 1} h para obtener la pendiente de la secante.`,
          ],
          (x) => near(W(1) + (t - 1) * x, W(t)),
        )
        break
      case 4: {
        const start = invert(V, threshold, 2, 6),
          value = V(start + 2)
        q = result(
          `Un observador llega cuando el conjunto contiene ${threshold} L. ¿Qué volumen total, en litros, habrá dos horas después de su llegada?`,
          value,
          'L',
          [
            `Suma los modelos y localiza el único instante en que el total llega a ${threshold} L. Se obtiene $t\\approx${fmt(start)}$ h.`,
            'Suma dos horas a ese instante y vuelve a evaluar cada modelo antes de sumar los resultados.',
          ],
          (x) => near(x, W(invert(W, threshold, 2, 6) + 2)),
        )
        break
      }
      case 5: {
        const meter = base + b,
          reading = meter + Math.round((v - base) * 1.3),
          factor = (reading - meter) / (v - base),
          end = V(t + 1)
        q = result(
          `Un medidor muestra una función afín del volumen conjunto. Marca ${fmt(meter)} al inicio y ${fmt(reading)} a las ${t} h. ¿Qué lectura dará a las ${t + 1} h?`,
          meter + factor * (end - base),
          '',
          [
            parts,
            `La pendiente del medidor es el cambio de lectura dividido por el cambio de volumen: $(${fmt(reading)}-${fmt(meter)})/(${fmt(v)}-${fmt(base)})$.`,
            `A la lectura inicial suma esa pendiente por el aumento de volumen hasta la hora ${t + 1}.`,
          ],
          (x) =>
            near(
              (x - meter) / (reading - meter),
              (W(t + 1) - W(0)) / (W(t) - W(0)),
            ),
        )
        break
      }

      case 6: {
        const capacity = Math.ceil(V(6)) + b
        q = result(
          `Una cisterna tiene capacidad para ${capacity} L. Si a las ${t} h se vierte en ella todo el contenido de los depósitos, ¿cuántos litros adicionales caben?`,
          capacity - v,
          'L',
          [parts, `Resta el volumen conjunto a la capacidad de ${capacity} L.`],
          (x) => near(x + W(t), capacity),
        )
        break
      }
      case 7: {
        const n = b,
          part = a,
          change = v - V(1)
        q = result(
          `Entre la hora 1 y la hora ${t} se aparta una fracción ${part}/${n} del volumen nuevo para un ensayo. ¿Cuántos litros nuevos quedan disponibles para otros usos?`,
          (1 - part / n) * change,
          'L',
          [
            parts,
            `Resta el volumen de la hora 1, aproximadamente ${fmt(V(1))} L, para aislar el aumento.`,
            `Solo queda la fracción $1-${part}/${n}$ del aumento.`,
          ],
          (x) => near((x * n) / (n - part), W(t) - W(1)),
        )
        break
      }
      case 8: {
        const initial = Math.round(V(4) + 4 * a),
          root = invert((t) => V(t) + a * t, initial, 0, 10)
        q = result(
          `Otra reserva comienza con ${initial} L y pierde ${a} L/h. ¿A qué hora iguala por primera vez el volumen conjunto de los depósitos?`,
          root,
          'h',
          [
            `La reserva decrece como $${initial}-${a}t$. Suma los modelos de los depósitos para construir el otro miembro de la igualdad.`,
            'Localiza el cruce de las dos curvas en [0, 10] con la calculadora. Una curva aumenta y la otra disminuye, así que el cruce es único.',
          ],
          (x) => x >= 0 && x <= 10 && near(W(x), initial - a * x),
        )
        break
      }
    }
    return { stem, ...q }
  },
}
