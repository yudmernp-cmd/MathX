import { binomial, fmt, mean, fraction } from './math.mjs'

export const paper1 = {
  // P1 · noviembre de 2025 · pregunta 1 · Sucesiones y series geométricas
  '2a977e161857320ed764': (a, b) => {
    const r = 2 + (a % 4),
      k = 4 + (a % 5),
      m = k + 2
    return {
      edit: [
        { '2, 6 y 18': `${b}, ${b * r} y ${b * r * r}` },
        {},
        { 'número 8': 'número ' + k },
        { '10 términos': m + ' términos' },
      ],
      answers: [
        [
          r,
          'Divide el segundo término entre el primero y comprueba la otra razón.',
        ],
        [
          b * r ** (k - 1),
          `Multiplica el primer término por la razón elevada a ${k - 1}.`,
        ],
        [
          (b * (r ** m - 1)) / (r - 1),
          `Usa la suma geométrica de ${m} términos a partir de ${b}.`,
        ],
      ],
    }
  },

  // P1 · noviembre de 2025 · pregunta 9 · Derivadas y rectas tangentes
  ef0e9dd941dfff5838b7: (a, b) => {
    const u = 1 + (a % 4),
      y = u ** 3 - a * u * u + b * u - 7,
      slope = 3 * u * u - 2 * a * u + b
    return {
      edit: [
        { '-2x^2+5x': `-${a}x^2+${b}x` },
        { 'f(1)': `f(${u})` },
        {},
        { 'x=1': 'x=' + u },
      ],
      answers: [
        [y, 'Sustituye la abscisa en el polinomio.'],
        [null, `Deriva término a término: $f'(x)=3x^2-${2 * a}x+${b}$.`],
        [
          null,
          `Sustituye el punto y la derivada en $y-(${y})=${slope}(x-${u})$.`,
        ],
      ],
    }
  },

  // P1 · mayo de 2026 · pregunta 6 · Funciones inversas y asíntotas
  '7167c9fa415ce41440b1': (a, b) => ({
    edit: [
      { 'x+1': 'x+' + b, ')+3': ')+' + a, 'x>-1': 'x>-' + b },
      { '(3)': '(' + a + ')' },
    ],
    answers: [
      [
        1 - b,
        'Al igualar la función al desplazamiento vertical, el logaritmo vale cero y su argumento vale uno.',
      ],
      [
        -b,
        `Despeja la inversa: $g^{-1}(x)=10^{x-${a}}-${b}$. Cuando x tiende a menos infinito, la potencia tiende a cero.`,
      ],
    ],
  }),

  // P1 · mayo de 2026 · pregunta 11 · Sucesiones y series aritméticas
  c8db413d01fcb617b99c: (a, b) => {
    const k = 12 + a,
      m = 8 + a,
      sum = (m * (2 * b + (m - 1) * a)) / 2
    return {
      edit: [{ 18: b, '7.': a + '.' }, { 42: k }, { 9475: sum }],
      answers: [
        [
          b + (k - 1) * a,
          `Al término inicial suma ${k - 1} diferencias comunes.`,
        ],
        [
          null,
          `Multiplica la fórmula de la suma por dos y reordena: $${a}n^2+${2 * b - a}n-${2 * sum}=0$.`,
        ],
        [
          m,
          `La raíz positiva entera es ${m}; al sustituirla en la suma se obtiene ${sum}.`,
        ],
      ],
    }
  },

  // P1 · mayo de 2025 · pregunta 11 · Distancias y ángulos en el espacio
  '6c64e50fb3e60741caaa': (a, b) => {
    const ab = Math.hypot(a, 1),
      bc = Math.hypot(1, 1, a)
    return {
      edit: [
        { '(1,2,1)': `(0,0,${b})`, '(3,5,2)': `(${a},0,${b + 1})` },
        {},
        { '(2,8,k)': `(${a + 1},1,k)` },
      ],
      answers: [
        [ab, 'Calcula la distancia con las tres diferencias de coordenadas.'],
        [
          b + 1 - a,
          `Aplica $AC^2=AB^2+BC^2$ y simplifica. Queda $k=${b + 1}-${a}$.`,
        ],
        [
          (Math.atan2(bc, ab) * 180) / Math.PI,
          'En el triángulo rectángulo calcula la tangente inversa de BC/AB en grados.',
        ],
      ],
    }
  },

  // P1 · noviembre de 2025 · pregunta 1 · Estadística descriptiva
  '99156f5f790b94e22e34': (a, b) => {
    const v = [0, 3, 5, 3, 2, -2, 0, 5, 5, 8].map((x) => b + a * x),
      avg = mean(v),
      sorted = [...v].sort((x, y) => x - y)
    return {
      edit: [
        {
          [String.raw`16\quad19\quad21\quad19\quad18\quad12\quad16\quad21\quad21\quad32`]:
            v.join('\\quad '),
          '19,5': fmt(avg).replace('.', ','),
        },
      ],
      answers: [
        [b + 5 * a, 'Cuenta cuántas veces aparece cada valor.'],
        [
          (sorted[4] + sorted[5]) / 2,
          'Ordena los datos y promedia el quinto y el sexto.',
        ],
        [
          Math.sqrt(mean(v.map((x) => (x - avg) ** 2))),
          'Divide la suma de desviaciones cuadráticas entre diez y toma la raíz.',
        ],
        [10 * a, 'Resta el mínimo al máximo.'],
      ],
    }
  },

  // P1 · mayo de 2026 · pregunta 8 · Funciones exponenciales
  '166a1ee6ab19358b404b': (a, b) => {
    const start = 2 + a,
      pct = 8 + (b % 18),
      day = 5 + (a % 6),
      threshold = 1 + b / 100,
      factor = 1 + pct / 100
    return {
      edit: [
        { '14\\,': pct + '\\,', '3\\,': start + '\\,' },
        { 'día 10': 'día ' + day },
        { '1,9': fmt(threshold).replace('.', ',') },
      ],
      answers: [
        [
          start * factor ** (day - 1),
          `Se cuentan ${day - 1} incrementos desde el final del día uno.`,
        ],
        [
          Math.floor(Math.log((100 * threshold) / start) / Math.log(factor)) +
            2,
          'Convierte el umbral a centímetros. Busca el primer día entero en que la altura lo supera estrictamente.',
        ],
      ],
    }
  },

  // P1 · mayo de 2022 · pregunta 12 · Integración y condiciones iniciales
  '35766e4f37eb993f065e': (a, b) => {
    const c = b - 1 + a
    return {
      edit: [
        { '-8t': '-' + 2 * a + 't' },
        { 't=2': 't=1' },
        { '4 mil': b + ' mil' },
      ],
      answers: [
        [
          null,
          `Al sustituir t=1, la tasa es ${3 - 2 * a}. Es negativa, por lo que el beneficio disminuye.`,
        ],
        [
          null,
          `Integra y usa el beneficio del primer año: $P(t)=t^3-${a}t^2+${c}$.`,
        ],
      ],
    }
  },

  // P1 · mayo de 2025 · pregunta 9 · Área bajo una curva
  '99e0f24186377e0e1ba7': (a, b) => {
    const l = b,
      m = b + a,
      r = b + 2 * a
    return {
      edit: [
        {
          'x^3-9x^2+23x-15': `x^3-${l + m + r}x^2+${l * m + l * r + m * r}x-${l * m * r}`,
          'x\\le5': 'x\\le' + r,
          'x=1': 'x=' + l,
          'x=5': 'x=' + r,
        },
        {},
        { '1\\le': l + '\\le' },
      ],
      answers: [
        [m, `Factoriza el polinomio: $(x-${l})(x-${m})(x-${r})$.`],
        [
          a ** 4 / 4,
          `Integra entre ${l} y ${m}. Con $u=x-${l}$ el integrando es $u(u-${a})(u-${2 * a})$ y es positivo en el intervalo abierto.`,
        ],
      ],
    }
  },

  // P1 · mayo de 2026 · pregunta 4 · Distribución binomial
  '77480870cbb20c2ba59a': (a, b) => {
    const pct = 45 + (b % 40) + fraction(b),
      p = pct / 100,
      n = 4 + a,
      k = 2 + (a % 3)
    let sum = 0
    for (let i = k; i <= n; i++) sum += binomial(n, i, p)
    return {
      edit: [
        { '73\\,': pct + '\\,' },
        {},
        { '5 tiros': n + ' tiros', '3 de': k + ' de' },
      ],
      answers: [
        [
          p * p,
          'Multiplica las probabilidades de los dos tiros independientes.',
        ],
        [
          sum,
          `Suma las probabilidades binomiales desde ${k} hasta ${n} aciertos.`,
        ],
      ],
    }
  },

  // P1 · mayo de 2023 · pregunta 12 · Esperanza matemática y juegos justos
  '6ae7b331a9b15a776eb6': (a, b) => {
    const first = (10 + a) / 100,
      k = (1 - first - 0.2 - 0.16 - 0.25) / 3
    const gain = -4 * first - 3 * 0.2 - k + 2 * k + b * 0.25
    return {
      edit: [{ 0.15: fmt(first) }, {}, { '&1&4\\end': '&1&' + b + '\\end' }],
      answers: [
        [k, 'Suma todas las probabilidades, iguala a uno y despeja k.'],
        [
          null,
          `Pondera cada ganancia por su probabilidad. La esperanza es ${fmt(gain)} dólares; al ser positiva el juego favorece al jugador.`,
        ],
      ],
    }
  },

  // P1 · mayo de 2023 · pregunta 5 · Estadística descriptiva
  c395e07fa486f5d15414: (a, b) => {
    // Scale the frequency weights from a distribution whose exact mean is 9/2.
    const freqs = [a, 2 * a, 3 * a, b, 0, 2 * a, 3 * a]
    const known = freqs.reduce((s, f) => s + f, 0),
      weighted = freqs.reduce((s, f, i) => s + f * (i + 1), 0)
    const missing = 9 * known - 2 * weighted
    return {
      edit: [
        {
          '&1&4&7&9&p&9&4': `&${a}&${2 * a}&${3 * a}&${b}&p&${2 * a}&${3 * a}`,
        },
      ],
      answers: [
        [null, `La suma de las frecuencias es $${known}+p$.`],
        [missing, `Iguala $(${weighted}+5p)/(${known}+p)$ a 4,5 y despeja p.`],
      ],
    }
  },

  // P1 · noviembre de 2025 · pregunta 5 · Matemática financiera
  '865b0a3985a9e34ad18d': (a, b) => {
    const principal = 100 * b,
      payment = 100 + 10 * a,
      periods = 120
    const balance = (i) =>
      principal * (1 + i) ** periods +
      (payment * Math.expm1(periods * Math.log1p(i))) / i
    const target = Math.round(balance((a + 1) / 1200))
    let lo = 0,
      hi = 0.05
    for (let i = 0; i < 64; i++) {
      const mid = (lo + hi) / 2
      if (balance(mid) < target) lo = mid
      else hi = mid
    }
    return {
      percentages: [0],
      edit: [
        {
          '10 000 dólares': principal + ' dólares',
          '800 dólares': payment + ' dólares',
          '160 000 dólares': target + ' dólares',
        },
      ],
      answers: [
        [
          (lo + hi) * 600,
          `Resuelve la ecuación del valor futuro con 120 aportaciones a mes vencido. Multiplica la tasa mensual por 1200 para expresarla como tasa nominal anual porcentual.`,
        ],
        [
          target - principal - periods * payment,
          'Resta al saldo final el depósito inicial y las 120 aportaciones mensuales.',
        ],
      ],
    }
  },

  // P1 · mayo de 2022 · pregunta 3 · Modelos cuadráticos
  '369b78bf057cebf5a75b': (a, b) => {
    const v = 5 + a,
      h = b / 10,
      time = (v + Math.sqrt(v * v + 19.2 * h)) / 9.6
    return {
      edit: [{ '+21t+1.2': `+${v}t+${fmt(h)}` }],
      answers: [
        [h, 'Evalúa la función de altura en el instante cero.'],
        [
          time,
          'Resuelve la cuadrática de altura cero y descarta la raíz negativa.',
        ],
        [
          null,
          `Desde el instante del golpe hasta el primer contacto con el suelo: $0\\le t\\le ${fmt(time)}$ segundos, con extremo superior aproximado.`,
        ],
      ],
    }
  },

  // P1 · mayo de 2026 · pregunta 1 · Área y volumen de sólidos
  '33247d7bf399404d005a': (a, b) => {
    // Real terrestrial measurements must not become fictitious claims about Earth.
    const r = 1800 + 10 * b,
      area = 4 * Math.PI * r * r,
      land = (a + 1) * 100000
    return {
      percentages: [1],
      edit: [
        { 'El planeta Tierra': 'Un planeta hipotético', 6371: r },
        { terrestre: 'del planeta' },
        {
          '148,9': fmt(land / 1e6).replace('.', ','),
          terrestre: 'del planeta',
        },
      ],
      answers: [
        [area, 'Multiplica el cuadrado del radio por cuatro pi.'],
        [
          (100 * (area - land)) / area,
          'Expresa la superficie emergida en kilómetros cuadrados, réstala al área total y divide la diferencia por el área total antes de convertirla en porcentaje.',
        ],
      ],
    }
  },

  // P1 · mayo de 2021 · pregunta 3 · Área y volumen de sólidos
  e1d3ca837dcd1cef3b89: (a, b) => {
    const r = 7 + a,
      coverage = 150 + b,
      area = 3 * Math.PI * r * r
    return {
      figure: { type: 'solid', shape: 'hemisphere', radius: r, unit: 'mm' },
      edit: [{ '6\\,': r + '\\,' }, {}, { '240\\,': coverage + '\\,' }],
      answers: [
        [
          area,
          'Suma el área curva del hemisferio y el área de su base circular.',
        ],
        [
          area / coverage,
          'Divide el área total por el área que puede cubrir un gramo.',
        ],
      ],
    }
  },
}
