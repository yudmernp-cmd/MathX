import {
  binomial,
  fmt,
  mean,
  fraction,
  normalCdf,
  studentCdf,
} from './math.mjs'

export const paper2 = {
  // P2 · mayo de 2022 · pregunta 5 · Distribución binomial
  '08a42e4eb85c480413d1': (a, b) => {
    const seats = 40 + a,
      tickets = seats + 2,
      p = 0.88,
      fare = 60 + b,
      comp = 2 * fare
    const all = p ** tickets,
      oneMissing = tickets * (1 - p) * p ** (tickets - 1)
    const edits = { 72: seats, 74: tickets }
    return {
      edit: [
        { ...{ 72: seats, '90\\,': '88\\,', '0,9': '0,88' } },
        edits,
        { 72: seats },
        { 72: seats },
        { ...edits, 150: fare, 300: comp },
      ],
      answers: [
        [
          all + oneMissing,
          'Hay exceso si se presentan todos o falta exactamente un pasajero. Suma esos dos casos.',
        ],
        [
          seats * p,
          'Multiplica el número de billetes por la probabilidad de presentarse.',
        ],
        [
          Math.floor((seats * 100) / 88),
          'Divide la capacidad por la probabilidad de presentarse y toma la parte entera.',
        ],
        [
          Math.round(2 * fare - comp * (2 * all + oneMissing)),
          'Resta de los ingresos adicionales la indemnización esperada. Hay dos pasajeros sin plaza si se presentan todos y uno si falta una persona.',
        ],
      ],
    }
  },

  // P2 · mayo de 2024 · pregunta 3 · Optimización y tasas de cambio
  bafabf6c75f36b0f68ff: (a, b) => {
    // A demand constant constructed from squares yields whole-number sales at all three prices.
    const cost = 5 + a,
      units = 4 + b,
      K = units * (6 * cost) ** 2,
      capacity = 36 * units,
      price = 3 * cost
    return {
      edit: [
        { 40000: K, '400 batidos': capacity + ' batidos' },
        { '400 en': capacity + ' en' },
        { '50 pesos': price + ' pesos' },
        { '20 pesos': cost + ' pesos', 40000: K, 800000: cost * K },
      ],
      answers: [
        [
          cost,
          'Iguala la demanda a la capacidad y toma la raíz positiva del precio al cuadrado.',
        ],
        [
          null,
          `(i) La demanda es ${4 * units} batidos. (ii) Multiplícala por el precio; el ingreso es ${4 * units * price} pesos.`,
        ],
        [
          null,
          `(i) Multiplica la demanda por el margen unitario. (ii) La derivada es $-${K}/x^2+${2 * cost * K}/x^3$. (iii) Para x positivo cambia de positiva a negativa en $x=${2 * cost}$. (iv) A ese precio se venden ${9 * units} batidos, dentro de la capacidad.`,
        ],
      ],
    }
  },

  // P2 · mayo de 2021 · pregunta 3 · Sucesiones aritméticas y geométricas
  '9bf4e2ba1b7391b72fe0': (a, b) => {
    const first = b,
      rows = 10 + a,
      seats = rows * (first + rows - 1),
      initial = seats - a - 2,
      rate = 1 + (a + 1) / 100,
      concerts = 25 + a
    const n = Math.floor(Math.log(seats / initial) / Math.log(rate)) + 1
    return {
      edit: [
        { '14 asientos': first + ' asientos', '20 filas': rows + ' filas' },
        {},
        { 584: initial, '1.2\\,': a + 1 + '\\,' },
        { '1.2\\,': a + 1 + '\\,' },
        { '50 conciertos': concerts + ' conciertos' },
      ],
      answers: [
        [
          null,
          `(i) Última fila: ${first + 2 * (rows - 1)} plazas. (ii) Multiplica la media de las filas primera y última por ${rows}, lo que da ${seats} plazas.`,
        ],
        [
          initial * rate,
          'Multiplica la asistencia inicial por el factor de crecimiento anual.',
        ],
        [
          2019 + n,
          `Busca el primer entero n con $${initial}\\times${fmt(rate)}^n>${seats}$ y suma n a 2019.`,
        ],
        [
          (concerts * initial * (rate ** 7 - 1)) / (rate - 1),
          'Suma siete medias anuales como progresión geométrica, de 2019 a 2025 inclusive, y multiplica por los conciertos anuales.',
        ],
      ],
    }
  },

  // P2 · mayo de 2022 · pregunta 2 · Sucesiones aritméticas y geométricas
  '868777e6b2bd600ba517': (a, b) => {
    const start = 12 * (b + 10),
      daily = a,
      initial = 350 + 7 * b,
      rate = 1 + (a + 1) / 100
    return {
      edit: [
        { '115,5': start - 3 * daily, 108: start - 8 * daily },
        {},
        {},
        { 625: initial, '6.4\\,': a + 1 + '\\,' },
        { 625: initial, 1.064: fmt(rate) },
      ],
      answers: [
        [
          null,
          `(i) Divide la diferencia entre los saldos por cinco días: consume ${daily} tazas al día. (ii) El saldo al final del primer día es ${start - daily} tazas.`,
        ],
        [
          Math.floor(start / daily),
          'Recupera el contenido inicial y divídelo entre la ración diaria. Cuenta solo días completos.',
        ],
        [
          Math.round(initial * rate ** 4),
          'Aplica cuatro años de crecimiento compuesto y redondea al dólar.',
        ],
        [
          null,
          `(i) La suma geométrica vale ${fmt((initial * (rate ** 10 - 1)) / (rate - 1))}. (ii) Representa el gasto acumulado previsto durante diez años a partir de 2021.`,
        ],
        [
          null,
          'El modelo supone un porcentaje de aumento constante. Los precios y la cantidad comprada pueden cambiar.',
        ],
      ],
    }
  },

  // P2 · mayo de 2025 · pregunta 2 · Préstamos y amortización
  dc7a939d36bf4a83c1cf: (a, b) => {
    const principal = 1000 * b,
      years = 4 + (a % 4),
      price = 12 * principal,
      annual = (a + 2) / 100,
      invested = principal * (1 + annual / 12) ** (years * 12),
      loan = price - invested,
      i = (1 + 0.064 / 2) ** (1 / 6) - 1,
      pmt = (loan * i) / (1 - (1 + i) ** -180),
      remaining = Math.round((pmt * (1 - (1 + i) ** -156)) / i),
      next = Math.ceil(1.2 * pmt),
      after = remaining * (1 + i) ** 36 - (next * ((1 + i) ** 36 - 1)) / i,
      decrease = remaining - after
    return {
      edit: [
        { '10 000': principal, '3.4\\,': a + 2 + '\\,' },
        { '6 años': years + ' años' },
        { '225 000': price },
        {},
        { 2200: next, '194 572': remaining },
      ],
      answers: [
        [
          Math.round(invested),
          'Aplica el factor mensual al capital durante todos los meses y redondea el resultado al dólar.',
        ],
        [Math.round(loan), 'Resta la inversión acumulada al precio de compra.'],
        [
          Math.round(pmt),
          'Convierte el tipo semestral en un tipo mensual equivalente. Usa la fórmula del valor actual de las 180 cuotas.',
        ],
        [
          null,
          `(i) Capitaliza el saldo pendiente y resta el valor final de 36 cuotas nuevas. La reducción de capital es ${Math.round(decrease)} CAD. (ii) De los 36 pagos, ${Math.round(36 * next - decrease)} CAD corresponden a intereses.`,
        ],
      ],
    }
  },

  // P2 · noviembre de 2025 · pregunta 2 · Integración y condiciones iniciales
  f31a4852c6149032fad7: (a, b) => {
    const rate = (55 + 5 * a) / 100,
      peak = 10 * rate,
      initial = 3 + b / 10,
      second = initial / 2,
      growth = 1.35,
      H = (t) => initial + rate * t - 0.05 * t * t
    let lo = 0,
      hi = 15
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      if (H(mid) > second * growth ** mid) lo = mid
      else hi = mid
    }
    return {
      percentages: [5],
      edit: [
        { '1.2-0.1t': fmt(rate) + '-0.1t' },
        {},
        {},
        { '6.5\\,': fmt(H(2)) + '\\,' },
        {},
        { '2(1.2)^t': fmt(second) + '(1.35)^t' },
      ],
      answers: [
        [
          null,
          `(i) En el tercer día la tasa es ${fmt(rate - 0.3)} cm/día. (ii) Es el crecimiento instantáneo en ese momento.`,
        ],
        [
          peak,
          'Iguala la tasa a cero. Cambia de positiva a negativa en ese punto.',
        ],
        [
          null,
          `Integra y aplica la altura conocida del segundo día: $h(t)=${fmt(initial)}+${fmt(rate)}t-0.05t^2$.`,
        ],
        [
          H(peak),
          'Evalúa la altura en el instante crítico y comprueba los extremos del intervalo.',
        ],
        [second, 'Sustituye t=0 en el modelo exponencial.'],
        [35, 'El factor diario 1,35 corresponde a un incremento del 35 %.'],
        [
          (lo + hi) / 2,
          'Iguala las dos alturas y localiza numéricamente su intersección en el dominio. La diferencia es estrictamente cóncava y cambia de signo.',
        ],
      ],
    }
  },

  // P2 · noviembre de 2025 · pregunta 4 · Modelos sinusoidales
  '99a8c829ebd15916c299': (a, b) => {
    const period = 8 + 2 * (a % 5),
      amplitude = (12 + a) / 10,
      mid = (4 + (b % 6) + fraction(b)) / 10,
      max = mid + amplitude,
      min = mid - amplitude
    const summit = period / 4,
      trough = (3 * period) / 4,
      observation = (60 + (b % 360)) / 60,
      omega = (2 * Math.PI) / period
    function clock(hours) {
      const m = Math.round(hours * 60)
      return (
        String(Math.floor(m / 60)).padStart(2, '0') +
        ':' +
        String(m % 60).padStart(2, '0')
      )
    }
    const f = (t) => mid + amplitude * Math.sin(omega * t),
      theta = Math.asin(mid / amplitude),
      start = (Math.PI + theta) / omega,
      end = (2 * Math.PI - theta) / omega
    let submergedBelowRoad = 0
    for (let i = 0; i * period < 24; i++)
      submergedBelowRoad += Math.max(
        0,
        Math.min(24, i * period + end) - (i * period + start),
      )
    const figure = {
      type: 'curve',
      x: 'Tiempo (h)',
      y: 'Altura (m)',
      points: Array.from({ length: 241 }, (_, i) => [i / 10, f(i / 10)]),
    }
    return {
      figure,
      edit: [
        {
          '03:36': clock(summit),
          '10:48': clock(trough),
          '1.26\\,': fmt(max) + '\\,',
          '-0.26\\,': fmt(min) + '\\,',
        },
        {},
        {},
        {},
        {},
        { '02:30': clock(observation) },
      ],
      answers: [
        [
          amplitude,
          'Toma la mitad de la diferencia entre el máximo y el mínimo.',
        ],
        [mid, 'Promedia las alturas máxima y mínima.'],
        [
          period,
          'El tiempo entre la primera pleamar y la primera bajamar equivale a medio período.',
        ],
        [
          null,
          `Con el argumento en radianes, $h(t)=${fmt(amplitude)}\\sin(2\\pi t/${period})+${fmt(mid)}$.`,
        ],
        [
          f(observation),
          'Expresa la hora como horas desde medianoche y evalúa el modelo.',
        ],
        [null, 'El nivel del agua está por debajo de la carretera.'],
        [
          submergedBelowRoad,
          `En cada período, h es negativa entre ${fmt(start)} y ${fmt(end)} horas después de empezar el ciclo. Interseca estos intervalos con las primeras 24 horas y suma sus longitudes.`,
        ],
      ],
    }
  },

  // P2 · mayo de 2025 · pregunta 3 · Distribución normal
  '56b44311d180c86c2af2': (a, b) => {
    const mu = 12 + a,
      sigma = Number(fmt(5 + (b % 15) + fraction(b))),
      early = mu - 4,
      late = mu + 7,
      limit = mu + sigma + 2,
      walk = 6 + (b % 27)
    const p = normalCdf(mu / sigma),
      start = 6 * 60 + Math.round(mu + walk + 2.3263478740408408 * sigma)
    let streak = 0
    for (let mask = 0; mask < 128; mask++) {
      const days = mask.toString(2).padStart(7, '0')
      if (days.includes('11111')) {
        const k = days.split('1').length - 1
        streak += p ** k * (1 - p) ** (7 - k)
      }
    }
    return {
      edit: [
        { '6:20': '6:' + mu, '10 minutos': sigma + ' minutos' },
        {},
        { '15 y 25': early + ' y ' + late },
        { '30 minutos': fmt(limit) + ' minutos' },
        { '10 minutos': walk + ' minutos' },
      ],
      answers: [
        [
          null,
          `(i) La media del retraso es ${mu} minutos. (ii) La varianza es ${fmt(sigma * sigma)} minutos cuadrados.`,
        ],
        [
          normalCdf((late - mu) / sigma) - normalCdf((early - mu) / sigma),
          'Tipifica ambos extremos y resta las probabilidades acumuladas.',
        ],
        [
          365 * (1 - normalCdf((limit - mu) / sigma)),
          'Multiplica 365 por la probabilidad de superar el umbral de multa.',
        ],
        [
          null,
          `Suma al horario el percentil 99 del retraso y los minutos de cambio. Al minuto más próximo resulta ${Math.floor(start / 60)}:${String(start % 60).padStart(2, '0')} de la tarde.`,
        ],
        [
          null,
          `(i) La probabilidad de retraso es p = ${fmt(p)}. (ii) Para cinco de siete días, la binomial da ${fmt(binomial(7, 5, p))}. (iii) Sumando las secuencias de siete días con una racha de cinco o más, sin contarlas dos veces, se obtiene ${fmt(streak)}.`,
        ],
      ],
    }
  },

  // P2 · mayo de 2023 · pregunta 4 · Distribución binomial y contraste de medias
  '514dc0bb83518e68c2d7': (a, b) => {
    const N = 35 + a,
      pct = 64 + a,
      k = Math.floor((N * pct) / 100),
      threshold = k + 1
    const pmf = Array.from({ length: N + 1 }, (_, j) =>
      binomial(N, j, pct / 100),
    )
    const tail = (j) => pmf.slice(j).reduce((s, y) => s + y, 0)
    const quant = pmf.findIndex((_, j) => tail(j) < 0.3)
    const x = [0, 2, -3, 1, 3, 4, 5].map((v) => v + b),
      y = [3, -3, -4, 4, 5, 7, 0, 1, 4].map((v) => v + b + a - 3)
    const mx = mean(x),
      my = mean(y),
      ss = (vs) => vs.reduce((tot, v) => tot + (v - mean(vs)) ** 2, 0)
    const df = x.length + y.length - 2,
      t =
        (mx - my) /
        Math.sqrt(((ss(x) + ss(y)) / df) * (1 / x.length + 1 / y.length)),
      p = studentCdf(t, df)
    return {
      edit: [
        { '82\\,': pct + '\\,', '115 pacientes': N + ' pacientes' },
        { '90 de': k + ' de' },
        { '95 de': threshold + ' de' },
        {},
        {},
        {
          '12&13&9&13&14&15&17': x.join('&'),
          '17&11&10&18&20&22&14&15&18': y.join('&'),
        },
      ],
      answers: [
        [
          pmf[k],
          'Usa la masa de probabilidad binomial con el número de ensayos y la probabilidad indicados.',
        ],
        [
          tail(threshold),
          'Suma las probabilidades desde el umbral hasta el total, incluyendo el umbral.',
        ],
        [
          ((N * pct) / 100) * (1 - pct / 100),
          'Aplica la varianza de una binomial, np(1−p).',
        ],
        [
          quant,
          'Busca el primer entero para el que la cola superior inclusiva es inferior a 0,30. Comprueba también el entero anterior.',
        ],
        [
          null,
          'Hipótesis nula: las medias poblacionales son iguales. Alternativa: la media poblacional del grupo N es menor que la del grupo O.',
        ],
        [
          p,
          `Usa la varianza combinada y calcula la cola izquierda del estadístico t = ${fmt(t)} con ${df} grados de libertad.`,
        ],
        [
          null,
          p < 0.1
            ? 'El valor p es inferior a 0,10. Hay evidencia de una media menor con el tratamiento nuevo.'
            : 'El valor p es mayor que 0,10. No hay evidencia suficiente de que la media del grupo nuevo sea menor.',
        ],
        [
          null,
          'Bajo la hipótesis nula, es la probabilidad de obtener un estadístico al menos tan extremo como el observado en la dirección de la alternativa.',
        ],
      ],
    }
  },

  // P2 · mayo de 2021 · pregunta 3 · Préstamos y amortización
  '3dc77f4c8482dbf278df': (a, b) => {
    const principal = 500 * b,
      qRate = (a + 2) / 400,
      months = 3 * (4 + a)
    const threshold = Math.round(
      (principal *
        ((1 + qRate) ** (months / 3) + (1 + qRate) ** ((months - 1) / 3))) /
        2,
    )
    const price = 8000 * b,
      P = price * 0.75,
      i = (a + 1) / 1200,
      monthly = Math.round((P * i) / (1 - (1 + i) ** -120))
    let lo = 0,
      hi = 0.05
    for (let j = 0; j < 65; j++) {
      const r = (lo + hi) / 2
      if ((monthly * -Math.expm1(-120 * Math.log1p(r))) / r > P) lo = r
      else hi = r
    }
    const eff = (lo + hi) / 2,
      saldo = (monthly * (1 - (1 + eff) ** -60)) / eff
    return {
      edit: [
        { '37 000': principal, '6.4\\,': a + 2 + '\\,' },
        {},
        { '50 000': threshold },
        { '200 000': price },
        { 1700: monthly },
      ],
      answers: [
        [
          Math.round(principal * (1 + qRate) ** 8),
          'Capitaliza ocho trimestres y redondea al dólar.',
        ],
        [
          months,
          'Calcula el primer mes que supera el umbral y comprueba que el saldo del mes anterior queda por debajo.',
        ],
        [P, 'Financia el 75 % del precio.'],
        [
          null,
          `(i) Los intereses son ${120 * monthly - P} AUD. (ii) Descuenta las 120 cuotas hasta igualar el préstamo. El tipo nominal anual es ${fmt(1200 * eff)} %.`,
        ],
        [
          Math.round(saldo),
          'Justo después de la cuota 60, calcula el valor actual de las 60 cuotas pendientes.',
        ],
        [
          Math.round(60 * monthly - saldo),
          'Resta el saldo liquidado al total de cuotas futuras evitadas y redondea al dólar.',
        ],
      ],
    }
  },

  // P2 · mayo de 2024 · pregunta 5 · Integración y condiciones iniciales
  '87c97a20040a1fdf08a3': (a, b) => {
    const c = 0.75 + a / 10 + fraction(b) / 10
    const poly = `h(x)=${fmt(0.2 * c)}x^3-${fmt(0.9 * c)}x^2+${fmt(3 * c)}`
    return {
      keepAssets: true,
      edit: [
        { '0.6x^2-1.8x': fmt(0.6 * c) + 'x^2-' + fmt(1.8 * c) + 'x' },
        {},
        { 'h=1.4': 'h=' + fmt(1.4 * c) },
        {},
        {},
        { 'h(4)=1': 'h(4)=' + fmt(c), '-1.2': '-' + fmt(1.2 * c) },
      ],
      answers: [
        [-1.2 * c, 'Sustituye x=2 en la derivada.'],
        [
          null,
          `Integra y determina la constante con el dato de salida. Resulta $${poly}$.`,
        ],
        [
          null,
          `(i) Integra h entre 0 y 4. (ii) Evalúa una primitiva en los extremos: el área es ${fmt(5.6 * c)} metros cuadrados.`,
        ],
        [
          1.2 * 5.6 * c,
          'Multiplica el área de la sección por la anchura de 1,2 m.',
        ],
        [
          null,
          `Las ecuaciones son $16a+4b+c=${fmt(c)}$, $4a+b=-${fmt(1.2 * c)}$ y $6a+b=0$.`,
        ],
        [
          null,
          `Resuelve el sistema y obtén $a=${fmt(0.6 * c)}$, $b=-${fmt(3.6 * c)}$, $c=${fmt(5.8 * c)}$.`,
        ],
        [
          null,
          `En la unión, ambas alturas son ${fmt(c)} y ambas pendientes son ${fmt(-1.2 * c)}. Las secciones enlazan con la misma tangente.`,
        ],
      ],
    }
  },

  // P2 · mayo de 2026 · pregunta 5 · Sectores circulares y sólidos
  '4f8bdbb5cb7ef9946d48': (a, b) => {
    const R = a + 10 + fraction(b),
      radius = R * Math.sqrt(2 / 3),
      height = R / Math.sqrt(3),
      V = (Math.PI * radius ** 2 * height) / 3
    const radiusTex = fmt(R) + String.raw`\left(1-\frac{\theta}{360}\right)`
    const shape = (kind) => ({
      type: 'solid',
      shape: kind,
      radius: R,
      unit: 'cm',
    })
    const litres = (V + (2 * Math.PI * radius ** 3) / 3) / 1000
    return {
      figure: shape('sector'),
      partFigures: { 1: shape('fold'), 4: shape('scoop') },
      edit: [
        { '9\\,': fmt(R) + '\\,' },
        {},
        { '9\\,': fmt(R) + '\\,', '9-\\frac{\\theta}{40}': radiusTex },
        { '9-\\frac{\\theta}{40}': radiusTex, '81-': fmt(R * R) + '-' },
      ],
      answers: [
        [
          null,
          `El arco retirado mide $2\\pi(${fmt(R)})\\theta/360$ cm. El arco restante es la circunferencia completa menos esa longitud.`,
        ],
        [
          null,
          'Iguala el arco restante a la circunferencia de la base del cono y divide entre dos pi.',
        ],
        [
          null,
          'Por Pitágoras, la altura es la raíz del cuadrado de la generatriz menos el radio al cuadrado. Sustituye en el volumen del cono.',
        ],
        [
          null,
          `Maximiza la función en el dominio físico de 0 a 360 grados. (i) El ángulo óptimo es ${fmt(360 * (1 - Math.sqrt(2 / 3)))} grados. (ii) El volumen es ${fmt(V)} centímetros cúbicos. (iii) El radio es ${fmt(radius)} cm.`,
        ],
        [
          null,
          `Suma al volumen del cono el del hemisferio del mismo radio y divide entre 1000. El resultado es ${fmt(litres)} litros. La afirmación es ${litres > 1 ? 'verdadera' : 'falsa'}.`,
        ],
      ],
    }
  },
}
