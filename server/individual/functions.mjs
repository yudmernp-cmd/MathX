import { entry as E, item, close, f, table } from './model.mjs'
export const functions = [
  E(
    'Modelos lineales',
    'Fácil',
    'PEN',
    ['intercept', ['line', 'two-points']],
    (a, b) =>
      item(
        'Una copistería cobra una cuota de preparación y un importe constante por cada ejemplar. La tabla recoge dos facturas.',
        '¿Cuál es la cuota de preparación en soles?',
        b,
        [
          `Veinte ejemplares adicionales cuestan ${20 * a} soles: el precio por ejemplar es ${a} soles.`,
          `Resta el coste de diez ejemplares al total de la primera factura: $${b + 10 * a}-10\\cdot${a}$.`,
        ],
        (x) => close((b + 10 * a - x) / 10, (b + 30 * a - x) / 30),
        table(
          ['Ejemplares', 'Factura (S/)'],
          [
            [10, b + 10 * a],
            [30, b + 30 * a],
          ],
        ),
      ),
  ),
  E(
    'Modelos periódicos',
    'Fácil',
    'm',
    ['midline', ['periodic-range', 'extremes']],
    (a, b) =>
      item(
        `El nivel de la marea sigue un modelo sinusoidal. La profundidad máxima observada es ${b + a} m y la mínima es ${b - a} m.`,
        '¿A qué profundidad se encuentra la línea media del modelo?',
        b,
        [
          `La oscilación vertical total es $${b + a}-${b - a}=${2 * a}$ m.`,
          `La línea media está una amplitud por encima del mínimo, a $${b - a}+${a}$ m.`,
        ],
        (x) => close(b + a - x, x - (b - a)),
      ),
  ),
  E(
    'Dominio de un modelo',
    'Fácil',
    'muestras',
    ['integer-upper-bound', ['affine', 'budget']],
    (a, b) => {
      const budget = b + 8 * a + Math.floor(a / 2)
      return item(
        `Un laboratorio dispone de ${budget} soles. El transporte cuesta ${b} soles por pedido y cada muestra cuesta ${a} soles. Las muestras se venden por unidades completas.`,
        '¿Cuántas muestras puede comprar como máximo en un solo pedido?',
        8,
        [
          `Después del transporte quedan ${budget - b} soles para las muestras.`,
          `Divide esa cantidad por ${a} y toma la parte entera que cabe en el presupuesto.`,
        ],
        (x) =>
          Number.isInteger(x) &&
          b + x * a <= budget &&
          b + (x + 1) * a > budget,
      )
    },
  ),
  E(
    'Funciones exponenciales',
    'Medio',
    'h',
    ['inverse', ['exponential', 'half-life'], 'fraction'],
    (a, b) => {
      const t = (a * Math.log(100 / b)) / Math.LN2
      return item(
        `Una sustancia se descompone de forma exponencial. Su semivida es de ${a} horas.`,
        `¿Cuántas horas transcurren hasta que queda el ${b} % de la cantidad inicial?`,
        t,
        [
          `La fracción restante tras $t$ horas es $(1/2)^{t/${a}}$.`,
          `Iguala esa expresión a $${b}/100$ y despeja $t=${a}\\ln(${b}/100)/\\ln(1/2)$.`,
        ],
        (x) => close(0.5 ** (x / a), b / 100),
      )
    },
  ),
  E(
    'Intersección de modelos',
    'Medio',
    'km',
    ['intersection', ['affine', 'two-tariffs']],
    (a, b) =>
      item(
        `Para un mismo trayecto, el plan A cobra ${b} soles de base y ${a + 2} por kilómetro. El plan B cobra ${b + 3 * a} de base y ${a} por kilómetro. Se facturan fracciones de kilómetro.`,
        '¿A qué distancia, en kilómetros, coinciden los dos precios?',
        1.5 * a,
        [
          `Modela el coste con $${b}+${a + 2}x$ y $${b + 3 * a}+${a}x$.`,
          `Al igualarlos, la diferencia inicial de ${3 * a} soles se compensa a razón de 2 soles por kilómetro.`,
        ],
        (x) => close(b + (a + 2) * x, b + 3 * a + a * x),
      ),
  ),
  E(
    'Transformaciones cuadráticas',
    'Medio',
    '',
    ['curvature', ['quadratic', 'vertex', 'point']],
    (a, b) =>
      item(
        `El arco de una entrada tiene perfil parabólico. Su punto más alto es $(0,${b})$ y a dos metros del centro su altura es ${b - a} m. Ambas coordenadas están en metros.`,
        '¿Cuál es el coeficiente de $x^2$ en el modelo de la altura?',
        -a / 4,
        [
          `La forma de vértice es $h(x)=cx^2+${b}$ por la simetría respecto de $x=0$.`,
          `Al pasar por el segundo punto se cumple $4c+${b}=${b - a}$. Despeja $c$.`,
        ],
        (x) => close(4 * x + b, b - a),
      ),
  ),
  E(
    'Modelos sinusoidales',
    'Difícil',
    'h',
    ['duration-above', ['sine', 'threshold', 'period']],
    (a, b) => {
      const period = 2 * b,
        ratio = 0.5,
        ans = period / 3
      return item(
        `La profundidad de un canal en metros es $h(t)=${b}+${2 * a}\\sin(2\\pi t/${period})$, con $t$ en horas. Un barco necesita una profundidad mayor que ${b + a} m.`,
        'Durante el primer ciclo completo, ¿cuántas horas puede pasar el barco?',
        ans,
        [
          `La condición se reduce a $\\sin(2\\pi t/${period})>1/2$.`,
          'En un ciclo el ángulo está entre $\\pi/6$ y $5\\pi/6$ mientras se cumple la condición.',
          `El intervalo ocupa un tercio del ciclo de ${period} horas.`,
        ],
        (x) =>
          close(x, (period * (Math.PI - 2 * Math.asin(ratio))) / (2 * Math.PI)),
      )
    },
  ),
  E(
    'Duración sobre un umbral',
    'Difícil',
    's',
    ['duration-above', ['quadratic', 'threshold', 'two-crossings']],
    (a, b) => {
      const threshold = b + (a * a) / 2,
        ans = Math.sqrt(2) * a
      return item(
        `La altura de una pelota en metros se modeliza por $h(t)=${b}+${2 * a}t-t^2$ desde $t=0$ hasta su caída al suelo. El tiempo se mide en segundos.`,
        `¿Durante cuántos segundos supera los ${f(threshold)} metros?`,
        ans,
        [
          `Completa el cuadrado: $h(t)=${b + a * a}-(t-${a})^2$.`,
          `Los cruces ocurren a la misma distancia del vértice, cuando $(t-${a})^2=${f((a * a) / 2)}$.`,
          'La duración es la diferencia entre los dos instantes de cruce.',
        ],
        (x) =>
          x > 0 && close(b + 2 * a * (a + x / 2) - (a + x / 2) ** 2, threshold),
      )
    },
  ),
  E(
    'Calibración de modelos',
    'Difícil',
    'min',
    ['inverse', ['exponential-offset', 'asymptote', 'two-readings']],
    (a, b) => {
      const room = b,
        initial = b + 8 * a,
        at = b + 4 * a,
        t = (3 * Math.log(8 / 3)) / Math.LN2
      return item(
        `Un líquido a ${initial} °C se enfría hacia una temperatura ambiente constante de ${room} °C. El exceso de temperatura sobre el ambiente decrece exponencialmente. A los tres minutos el líquido está a ${at} °C.`,
        `¿A los cuántos minutos desde el inicio estará a ${b + 3 * a} °C?`,
        t,
        [
          `El exceso baja de ${8 * a} a ${4 * a} grados en tres minutos, así que se reduce a la mitad cada tres minutos.`,
          `Para la temperatura buscada, el exceso es ${3 * a}. Plantea $${8 * a}(1/2)^{t/3}=${3 * a}$.`,
          'Aplica logaritmos al cociente de excesos y despeja el tiempo.',
        ],
        (x) =>
          close(
            room +
              (initial - room) * ((at - room) / (initial - room)) ** (x / 3),
            b + 3 * a,
          ),
      )
    },
  ),

  E(
    'Funciones por tramos',
    'Fácil',
    'PEN',
    ['piecewise-cost', 'marginal-blocks'],
    (a, b) =>
      item(
        `Un aparcamiento cobra ${a} soles por cada una de las primeras dos horas y ${a + 2} soles por cada hora adicional. Un vehículo permanece ${b} horas completas.`,
        '¿Cuánto cuesta esta estancia, en soles?',
        2 * a + (b - 2) * (a + 2),
        [
          `Las dos primeras horas cuestan ${2 * a} soles en total.`,
          `Las ${b - 2} horas restantes se facturan a ${a + 2} soles. Agrega ese segundo bloque al primero.`,
        ],
        (x) => close(x, b * (a + 2) - 4),
      ),
  ),
  E(
    'Proporcionalidad inversa',
    'Medio',
    'm',
    [
      'inverse-square',
      ['calibrate', 'reference-intensity'],
      'desired-intensity',
    ],
    (a, b) =>
      item(
        `Una lámpara produce ${4 * b} lux a ${a} m. En este modelo la iluminación es inversamente proporcional al cuadrado de la distancia.`,
        `¿A qué distancia de la lámpara se obtienen ${b} lux?`,
        2 * a,
        [
          `Si $I=k/d^2$, el dato de referencia da $k=${4 * b}\\cdot${a}^2$.`,
          `Sustituye $I=${b}$ y toma la raíz positiva al despejar la distancia.`,
        ],
        (x) => x > 0 && close(b * x * x, 4 * b * a * a),
      ),
  ),
  E(
    'Beneficio y demanda',
    'Difícil',
    '',
    ['admissible-integer-count', ['quadratic-profit', 'threshold']],
    (a, b) => {
      const l = a,
        h = a + 6,
        price = l + h + b
      return item(
        `Una cooperativa vende $x$ cajas por semana a $${price}-x$ soles cada una. Tiene un coste de ${b} soles por caja y un coste fijo semanal de ${l * h} soles. Las cajas son indivisibles.`,
        '¿Cuántas cantidades enteras distintas de cajas dan un beneficio estrictamente positivo?',
        h - l - 1,
        [
          `Los ingresos son $x(${price}-x)$ y los costes son $${b}x+${l * h}$.`,
          `Factoriza la diferencia como $(x-${l})(${h}-x)$. Es positiva estrictamente entre sus raíces.`,
          'Cuenta los enteros situados en ese intervalo abierto.',
        ],
        (x) =>
          close(
            x,
            Array.from({ length: price + 1 }, (_, i) => i).filter(
              (n) => n * (price - n) > b * n + l * h,
            ).length,
          ),
      )
    },
  ),
]
