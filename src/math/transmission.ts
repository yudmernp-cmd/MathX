import { fmt, numberPart, review, type Family } from './model'

export const transmission: Family = {
  id: 'transmision',
  courses: ['MAI'],
  theme: 'Funciones',
  topic: 'Funciones exponenciales',
  make(r, variant, level) {
    const factor = r(5, 8) / 10
    const input = 100 * r(4, 8)
    const length = r(2, 5)
    const easy = level === 'Fácil'
    const hard = level === 'Difícil'
    if (variant === 0) {
      const end = input * factor ** 2
      const halfDistance = (length * Math.log(0.5)) / Math.log(factor)
      return {
        stem: `Una señal pierde la misma fracción de potencia por cada tramo de cable de ${length} km. Su potencia en el punto de emisión es de ${input} mW y a ${2 * length} km es de ${fmt(end)} mW. El modelo es exponencial también entre los puntos de medida.`,
        tasks: [
          easy
            ? numberPart(
                '¿Qué porcentaje de la potencia inicial llega al segundo punto de medida?',
                100 * factor ** 2,
                [
                  'Divide la potencia recibida entre la emitida y multiplica por 100.',
                ],
                ['Compara ambas mediciones.'],
              )
            : numberPart(
                'Halla el factor de transmisión de un solo tramo.',
                factor,
                [
                  `Dos tramos transmiten el factor $b^2=${fmt(end)}/${input}$. Toma la raíz positiva.`,
                ],
                ['Relaciona los dos tramos mediante una potencia.'],
              ),
          hard
            ? numberPart(
                '¿A qué distancia del emisor se reduce por primera vez a la mitad la potencia?',
                halfDistance,
                [`Resuelve $b^{x/${length}}=1/2$ usando logaritmos.`],
                [
                  'Relaciona distancia y número de tramos.',
                  'Invierte la exponencial.',
                ],
              )
            : numberPart(
                'Determina la potencia en el punto medio entre las dos mediciones, en mW.',
                input * factor,
                [
                  'La potencia intermedia es la media geométrica de las dos observaciones.',
                ],
                ['Usa una razón constante entre tramos.'],
              ),
          numberPart(
            'Un técnico sustituye la segunda mitad del cable por otra que transmite el 90 % de lo que recibe. Calcula la potencia final en mW.',
            input * factor * 0.9,
            [
              'Aplica el factor de un tramo original y luego el factor 0,9 del tramo nuevo.',
            ],
            ['Determina la entrada al tramo nuevo.', 'Compone los factores.'],
          ),
          numberPart(
            'Con el cable original completo, ¿qué potencia mínima debe emitir la fuente para recibir 200 mW al final?',
            200 / factor ** 2,
            ['Divide el objetivo entre la fracción que llega al extremo.'],
            [
              'Plantea el objetivo de recepción.',
              'Recupera la potencia inicial.',
            ],
          ),
          review(
            'Propón una medición que permita comprobar el supuesto de pérdida exponencial entre los dos puntos.',
            [
              'Mide en el punto medio y contrasta la potencia observada con la media geométrica de las dos mediciones iniciales.',
            ],
            [
              'Elige un punto interior.',
              'Predice la potencia según el modelo.',
              'Describe cómo contrastar la predicción.',
            ],
          ),
        ],
      }
    }
    const cost = 3 * length
    // A threshold strictly between two attainable transmissions avoids rounding ties.
    const limit = (100 * (factor ** length + factor ** (length + 1))) / 2
    const layers = length + 1
    return {
      stem: `Una cámara recibe ${input} lux. Cada lámina de un filtro deja pasar el ${fmt(100 * factor)} % de la luz que recibe. Se pueden apilar láminas enteras. El fabricante exige que al sensor llegue como máximo el ${fmt(limit)} % de la luz inicial.`,
      tasks: [
        easy
          ? numberPart(
              'Calcula la iluminación que llega al sensor con dos láminas, en lux.',
              input * factor ** 2,
              [
                'Multiplica la iluminación inicial dos veces por el factor de transmisión.',
              ],
              ['Compone dos transmisiones sucesivas.'],
            )
          : numberPart(
              'Determina el menor número de láminas que cumple la especificación.',
              layers,
              [
                `Compara $100b^n$ con el límite. Con ${length} láminas aún llega demasiado y con ${layers} se cumple la condición.`,
              ],
              [
                'Plantea la desigualdad.',
                'Comprueba los dos enteros contiguos.',
              ],
            ),
        hard
          ? numberPart(
              'Si una lámina pierde todo su efecto, ¿cuál es el mínimo de láminas que se deben instalar para garantizar el límite?',
              layers + 1,
              [
                `En el peor caso transmiten normalmente todas salvo una. Se necesitan al menos ${layers} láminas eficaces.`,
              ],
              [
                'Modela la pérdida de una lámina.',
                'Determina el mínimo seguro.',
              ],
            )
          : numberPart(
              '¿Qué porcentaje de la luz incidente bloquea una sola lámina?',
              100 * (1 - factor),
              ['Resta del 100 % el porcentaje transmitido.'],
              ['Distingue luz bloqueada y transmitida.'],
            ),
        numberPart(
          `Cada lámina cuesta S/ ${cost}. Calcula el coste mínimo del filtro si todas funcionan.`,
          layers * cost,
          [
            `La primera cantidad que cumple el límite es ${layers}. Multiplica por el coste de cada lámina.`,
          ],
          ['Determina el número mínimo.', 'Calcula el coste total.'],
        ),
        numberPart(
          'Para sustituir el filtro por dos láminas iguales, ¿cuál es el máximo porcentaje de transmisión permitido por lámina?',
          100 * Math.sqrt(limit / 100),
          [
            'Escribe el porcentaje como fracción. El producto de dos factores iguales debe ser como máximo la fracción límite. Toma la raíz positiva.',
          ],
          ['Compone los factores.', 'Despeja el máximo por lámina.'],
        ),
        review(
          'Se duplica la iluminación inicial. Explica qué ocurre con la iluminación final y con el mínimo de láminas exigido.',
          [
            'Con el mismo filtro la lectura final se duplica. El requisito se expresa como porcentaje de la entrada, por lo que el número mínimo se conserva.',
          ],
          [
            'Relaciona entrada y salida.',
            'Interpreta el requisito porcentual.',
            'Justifica el número de láminas.',
          ],
        ),
      ],
    }
  },
}
