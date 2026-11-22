import { entry as E, item, close, f, table, sum, range } from './model.mjs'
import { binomial, normalCdf } from '../practice/math.mjs'
export const statistics = [
  E(
    'Media ponderada',
    'Fácil',
    'min',
    ['mean', ['group-means', 'frequencies']],
    (a, b) =>
      item(
        `En un ensayo, ${a} participantes tardaron en promedio ${b} minutos. Otros ${2 * a} participantes tardaron en promedio ${b + 3} minutos.`,
        '¿Cuál fue el tiempo medio de los dos grupos juntos, en minutos?',
        b + 2,
        [
          `Los tiempos totales son $${a}\\cdot${b}$ y $${2 * a}\\cdot${b + 3}$ minutos.`,
          `Suma ambos totales y divide entre las ${3 * a} personas.`,
        ],
        (x) => close(3 * a * x, a * b + 2 * a * (b + 3)),
      ),
  ),
  E(
    'Probabilidad condicionada',
    'Fácil',
    '',
    ['conditional-frequency', 'contingency-table'],
    (a, b) =>
      item(
        'Una biblioteca clasifica las reservas según el turno y la forma de recogida. Se elige una reserva al azar.',
        'Si se sabe que se recogió en taquilla, ¿cuál es la probabilidad de que corresponda al turno de tarde?',
        b / (a + b),
        [
          `La condición restringe la muestra a las ${a + b} recogidas en taquilla.`,
          `Dentro de ese grupo hay ${b} reservas de tarde. Divide casos favorables entre casos posibles.`,
        ],
        (x) => close(x * (a + b), b),
        table(
          ['Turno', 'Taquilla', 'Mostrador'],
          [
            ['Mañana', a, b + 4],
            ['Tarde', b, a + 3],
          ],
        ),
      ),
  ),
  E(
    'Rango intercuartílico',
    'Fácil',
    '',
    ['lower-fence', 'boxplot-quartiles'],
    (a, b) =>
      item(
        `Una serie de mediciones tiene primer cuartil ${b} y tercer cuartil ${b + a}. Se usa la regla de 1,5 rangos intercuartílicos para detectar valores atípicos.`,
        '¿Cuál es el límite inferior para detectar valores atípicos?',
        b - 1.5 * a,
        [
          `El rango intercuartílico es $${b + a}-${b}=${a}$.`,
          `Resta $1.5\\cdot${a}$ al primer cuartil.`,
        ],
        (x) => close((b - x) / (b + a - b), 1.5),
      ),
  ),
  E(
    'Extracción sin reposición',
    'Medio',
    '',
    ['complement', ['hypergeometric', 'none']],
    (a, b) => {
      const n = a + b,
        prob = 1 - (b / n) * ((b - 1) / (n - 1))
      return item(
        `En una bandeja hay ${a} piezas con defecto y ${b} sin defecto. Se escogen dos al azar sin reposición.`,
        '¿Cuál es la probabilidad de encontrar al menos una pieza con defecto?',
        prob,
        [
          `El suceso complementario consiste en elegir dos piezas buenas. La primera es buena con probabilidad $${b}/${n}$.`,
          `Si la primera era buena, la segunda lo será con probabilidad $${b - 1}/${n - 1}$. Resta el producto a uno.`,
        ],
        (x) => close(x, (a * (a - 1) + 2 * a * b) / (n * (n - 1))),
      )
    },
  ),
  E(
    'Distribución normal',
    'Medio',
    'g',
    ['quantile', ['normal', 'upper-tail']],
    (a, b) => {
      const mu = b + 5 * a,
        value = mu + 1.2815515655446004 * a
      return item(
        `La masa de unos envases sigue una distribución normal de media ${mu} g y desviación típica ${a} g. La planta separa el 10 % más pesado.`,
        '¿Cuál es la masa de corte, en gramos?',
        value,
        [
          'El 90 % de las masas queda por debajo del corte. El cuantil estándar correspondiente es aproximadamente 1,28155.',
          `Convierte a la escala de masas mediante $x=${mu}+${a}z$.`,
        ],
        (x) => close(normalCdf((x - mu) / a), 0.9),
      )
    },
  ),
  E(
    'Juego justo',
    'Medio',
    'PEN',
    ['fair-prize', ['discrete-expectation', 'ticket', 'payoffs']],
    (a, b) => {
      const price = a + 2,
        p = a / (a + b),
        secondary = 1,
        v = (price - (1 - p) * secondary) / p
      return item(
        `Un sorteo tiene ${a} boletos premiados y ${b} de consolación. Cada boleto cuesta ${price} soles. Un boleto de consolación devuelve un sol. Todos los boletos son igualmente probables.`,
        '¿Qué importe debe devolver cada boleto premiado para que la ganancia neta esperada sea cero?',
        v,
        [
          `Para que el juego sea justo el cobro esperado por boleto debe igualar el precio de ${price} soles.`,
          `Si el premio es $P$, plantea $(${a}P+${b})/${a + b}=${price}$ y despeja $P$.`,
        ],
        (x) => close(a * (x - price) + b * (1 - price), 0),
      )
    },
  ),
  E(
    'Diagnóstico y probabilidad',
    'Difícil',
    '',
    ['posterior', ['prevalence', 'sensitivity', 'false-positive']],
    (a, b) => {
      const prevalence = a / 100,
        sensitivity = 0.9,
        falseRate = b / 100,
        yes = prevalence * sensitivity
      return item(
        `En una población, el ${a} % tiene una condición. Una prueba da positivo en el 90 % de quienes la tienen y en el ${b} % de quienes no la tienen. Se elige una persona al azar.`,
        'Tras un resultado positivo, ¿cuál es la probabilidad de que la persona tenga la condición?',
        yes / (yes + (1 - prevalence) * falseRate),
        [
          `La probabilidad conjunta de tener la condición y dar positivo es $${f(prevalence)}\\cdot0.90$.`,
          `A los positivos verdaderos se suman los falsos, cuya probabilidad es $(1-${f(prevalence)})\\cdot${f(falseRate)}$.`,
          'Divide los positivos verdaderos entre todos los positivos.',
        ],
        (x) => close(x, (a * 90) / (a * 90 + (100 - a) * b)),
      )
    },
  ),
  E(
    'Muestreo binomial',
    'Difícil',
    'semillas',
    ['first-size', ['threshold', ['complement', 'binomial-zero']]],
    (a, b) => {
      const p = a / 100,
        threshold = (100 - b) / 100,
        n = Math.ceil(Math.log1p(-threshold) / Math.log1p(-p))
      return item(
        `Cada semilla de un lote tiene probabilidad ${a} % de germinar en suelo salino. Se plantan semillas de manera independiente.`,
        `¿Cuántas semillas deben plantarse como mínimo para alcanzar una probabilidad de al menos ${100 - b} % de observar alguna germinación?`,
        n,
        [
          `Con $n$ semillas, la probabilidad de ninguna germinación es $(1-${f(p)})^n$.`,
          `La condición es $(1-${f(p)})^n\\leq${f(1 - threshold)}$. Al dividir por un logaritmo negativo se invierte la desigualdad.`,
          'Redondea hacia arriba al menor tamaño entero que cumple la condición.',
        ],
        (x) =>
          Number.isInteger(x) &&
          1 - (1 - p) ** x >= threshold &&
          1 - (1 - p) ** (x - 1) < threshold,
      )
    },
  ),
  E(
    'Coste condicionado',
    'Difícil',
    'PEN',
    ['expectation', ['binomial', 'positive-count', 'unit-cost']],
    (a, b) => {
      const n = a + 3,
        p = 0.2,
        positive = 1 - (1 - p) ** n
      return item(
        `Un lote incluye ${n} piezas independientes. Cada pieza necesita ajuste con probabilidad 0,20 y cada ajuste cuesta ${b} soles. Se consideran únicamente los lotes que necesitan algún ajuste.`,
        '¿Cuál es el coste esperado por lote dentro de ese grupo, en soles?',
        (b * n * p) / positive,
        [
          `Entre todos los lotes, el coste esperado es $${b}\\cdot${n}\\cdot0.20$.`,
          `La probabilidad de entrar en el grupo es $1-0.80^{${n}}$.`,
          'Los lotes excluidos aportan coste cero. Divide el coste esperado general por la probabilidad de entrar en el grupo.',
        ],
        (x) =>
          close(
            x * positive,
            sum(range(n + 1).map((k) => b * k * binomial(n, k, p))),
          ),
      )
    },
  ),

  E(
    'Mediana ponderada',
    'Fácil',
    'libros',
    ['median', 'frequency-table'],
    (a, b) =>
      item(
        'La tabla resume cuántos libros leyó cada participante de un club durante un trimestre.',
        '¿Cuál es la mediana del número de libros por participante?',
        3,
        [
          `Hay ${2 * a + b} participantes. Localiza la posición central o las dos centrales en la lista ordenada.`,
          `Las primeras ${a} posiciones corresponden a un libro y las ${b} siguientes a tres. El centro cae en este último grupo.`,
        ],
        (x) => {
          const xs = [
            ...Array(a).fill(1),
            ...Array(b).fill(3),
            ...Array(a).fill(7),
          ]
          return close(
            x,
            (xs[Math.floor((xs.length - 1) / 2)] +
              xs[Math.floor(xs.length / 2)]) /
              2,
          )
        },
        table(
          ['Libros', 'Frecuencia'],
          [
            [1, a],
            [3, b],
            [7, a],
          ],
        ),
      ),
  ),
  E(
    'Datos y dispersión',
    'Medio',
    '',
    ['missing-value', 'population-variance', 'symmetric-data'],
    (a, b) =>
      item(
        `Tres lecturas ordenadas de un sensor son $${b}-d$, $${b}$ y $${b}+d$, con $d>0$. Su varianza poblacional es $2\\cdot${a * a}/3$.`,
        '¿Cuál fue la lectura mayor?',
        b + a,
        [
          `Por simetría, la media es ${b}. Las desviaciones son $-d,0,d$.`,
          `La varianza es $2d^2/3$. Igualarla al dato permite obtener $d$ y sumarlo a ${b}.`,
        ],
        (x) => x > b && close((2 * (x - b) ** 2) / 3, (2 * a * a) / 3),
      ),
  ),
  E(
    'Tablas de contingencia',
    'Difícil',
    '',
    ['chi-square', 'observed-contingency'],
    (a, b) => {
      const n = b + a,
        exp = b + a / 2,
        stat = (a * a) / exp
      return item(
        'Una muestra aleatoria se clasifica por turno y medio de transporte. Se contrasta la independencia de las dos variables sin corrección de continuidad.',
        '¿Cuál es el estadístico de ji cuadrado de Pearson para estos datos?',
        stat,
        [
          `Cada total marginal es ${b + n} y el total general es ${2 * (b + n)}. Bajo independencia, el esperado en cada celda es ${exp}.`,
          `En cada celda, la diferencia observada tiene valor absoluto ${a / 2}.`,
          'Suma $(O-E)^2/E$ sobre las cuatro celdas.',
        ],
        (x) => close(x, sum([b, n, n, b].map((o) => (o - exp) ** 2 / exp))),
        table(
          ['Turno', 'Bicicleta', 'Autobús'],
          [
            ['Mañana', b, n],
            ['Tarde', n, b],
          ],
        ),
      )
    },
  ),
]
