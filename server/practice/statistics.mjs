import { numeric as n, explain as e, mean, total, binomial } from './math.mjs'
export const statistics = {
  'Estadística descriptiva': (a, b) => {
    const values = [b, b + a, b + a, b + 2 * a, b + 3 * a],
      m = mean(values)
    return {
      stem: `Se registraron cinco tiempos de espera en segundos: ${values.join(', ')}. Trata estas cinco observaciones como la población estudiada.`,
      tasks: [
        n(
          'Halla la mediana.',
          b + a,
          'Ordena los cinco tiempos y toma el tercero.',
        ),
        n(
          'Calcula la media aritmética.',
          m,
          'Suma los tiempos y divide entre cinco.',
        ),
        n(
          'Calcula la desviación típica poblacional.',
          Math.sqrt(mean(values.map((x) => (x - m) ** 2))),
          'Divide por cinco la suma de los cuadrados de las desviaciones y toma la raíz.',
        ),
        n(
          `Se registra un sexto tiempo y la nueva media es ${b + 2 * a} s. Halla ese tiempo.`,
          6 * (b + 2 * a) - total(values),
          'Resta la suma original a seis veces la nueva media.',
        ),
        e(
          'Si a todos los tiempos iniciales se les restan dos segundos, explica qué ocurre con la desviación típica.',
          'Al desplazar todos los datos y su media por la misma cantidad, las diferencias respecto a la media se conservan.',
        ),
      ],
    }
  },
  'Esperanza matemática y juegos justos': (a, b) => ({
    stem: `En una bolsa hay ${a} fichas verdes y ${b} blancas. Se extrae una ficha al azar. Una verde paga ${a + b} soles y una blanca no paga nada. Participar cuesta ${a + 1} soles.`,
    tasks: [
      n(
        'Calcula la probabilidad de extraer una ficha verde.',
        a / (a + b),
        'Divide el número de fichas verdes entre el total.',
      ),
      n(
        'Halla la ganancia neta al extraer una verde.',
        b - 1,
        'Resta el precio de participación al premio.',
      ),
      n(
        'Calcula la esperanza de la ganancia neta.',
        -1,
        'Pondera el premio por su probabilidad y resta el precio de participación.',
      ),
      n(
        'Manteniendo el precio de participación, ¿qué premio haría justo el juego?',
        ((a + 1) * (a + b)) / a,
        'Iguala a cero la esperanza neta y despeja el premio.',
      ),
      e(
        'Explica si un jugador necesariamente pierde dinero en una sola partida con las condiciones iniciales.',
        'La esperanza es un promedio a largo plazo. Un jugador que saque una verde obtiene una ganancia neta positiva.',
      ),
    ],
  }),
  'Probabilidad condicionada': (a, b) => ({
    stem: `Un club registra a sus integrantes según el turno y el tipo de entrenamiento. Se elige una persona uniformemente al azar.`,
    figure: {
      type: 'table',
      headers: ['Turno', 'Individual', 'En equipo'],
      rows: [
        ['Mañana', a, b],
        ['Tarde', a + 2, 2 * b],
      ],
    },
    tasks: [
      n(
        'Calcula el número total de integrantes.',
        2 * a + 3 * b + 2,
        'Suma las cuatro frecuencias.',
      ),
      n(
        'Calcula la probabilidad de que la persona entrene por la mañana.',
        (a + b) / (2 * a + 3 * b + 2),
        'Divide el total de mañana entre el total del club.',
      ),
      n(
        'Sabiendo que entrena en equipo, halla la probabilidad de que sea del turno de mañana.',
        1 / 3,
        'Restringe el denominador a quienes entrenan en equipo.',
      ),
      n(
        'Se eligen dos personas distintas del turno de mañana. Halla la probabilidad de que ambas entrenen individualmente.',
        (a * (a - 1)) / ((a + b) * (a + b - 1)),
        'Multiplica las probabilidades de dos extracciones sin reposición.',
      ),
      e(
        'Explica por qué muestrear únicamente el turno de mañana puede sesgar una estimación para el club.',
        'La selección excluiría a todos los deportistas de la tarde y no garantizaría una composición representativa.',
      ),
    ],
  }),
  'Distribución binomial': (a, b) => {
    const p = a / 20,
      count = 5 + a,
      none = (1 - p) ** count,
      one = binomial(count, 1, p)
    return {
      stem: `Una máquina procesa lotes de ${count} piezas. Cada pieza requiere un ajuste adicional con probabilidad ${a * 5} %, independientemente de las demás. Ajustar una pieza cuesta ${b} soles.`,
      tasks: [
        n(
          'Calcula el coste esperado de los ajustes de un lote.',
          b * count * p,
          'Multiplica el tamaño del lote por la probabilidad de ajuste y por el coste de cada ajuste.',
        ),
        n(
          'Halla la probabilidad de que un lote no necesite ajustes.',
          none,
          'Multiplica las probabilidades de no necesitar ajuste en todas las piezas.',
        ),
        n(
          'Halla la probabilidad de que se requieran al menos dos ajustes.',
          1 - none - one,
          'Resta de uno las probabilidades de cero y exactamente un ajuste.',
        ),
        n(
          'Dado que el lote necesita algún ajuste, calcula el coste medio esperado de los ajustes.',
          (b * count * p) / (1 - none),
          'La contribución de los lotes sin ajustes al coste es cero. Divide el coste esperado por la probabilidad de algún ajuste.',
        ),
        e(
          'Si un mismo fallo mecánico afecta a varias piezas consecutivas, indica qué supuesto del modelo se pone en duda.',
          'El estado de una pieza aportaría información sobre las siguientes, de modo que la independencia sería cuestionable.',
        ),
      ],
    }
  },
  'Distribución normal': (a, b) => ({
    stem: `La masa de los paquetes de una línea se modeliza por una normal de media ${b + 5 * a} g y desviación típica ${a} g.`,
    tasks: [
      n(
        'Halla la varianza en gramos cuadrados.',
        a * a,
        'Eleva la desviación típica al cuadrado.',
      ),
      n(
        'Halla la masa que está dos desviaciones típicas por encima de la media.',
        b + 7 * a,
        'Suma dos desviaciones típicas a la media.',
      ),
      n(
        `Halla la probabilidad de que un paquete pese menos de ${b + 4 * a} g.`,
        0.15865525393145707,
        'Tipifica el umbral y calcula la probabilidad acumulada en z = −1.',
      ),
      n(
        'Halla la masa que supera solo el 10 % de los paquetes.',
        b + 5 * a + 1.2815515655446004 * a,
        'Utiliza el percentil 90 de la normal estándar y transforma a la escala original.',
      ),
      n(
        'Para dos paquetes independientes, halla la probabilidad de que exactamente uno supere ese percentil.',
        0.18,
        'Suma las dos ordenaciones posibles de un éxito con probabilidad 0,10 y un fracaso.',
      ),
    ],
  }),
  'Regresión e interpretación': (a, b) => {
    const ys = [b + 1, b + a - 1, b + 2 * a - 1, b + 3 * a + 1]
    return {
      stem: 'Un vivero registra el incremento de altura de varias plantas después de aplicar distintas dosis de un fertilizante.',
      figure: {
        type: 'table',
        headers: ['Dosis (mL)', 'Incremento (mm)'],
        rows: ys.map((y, i) => [i, y]),
      },
      tasks: [
        n(
          'Calcula el incremento medio de altura.',
          mean(ys),
          'Suma las cuatro alturas y divide entre cuatro.',
        ),
        n(
          'Calcula la pendiente de la recta de regresión del incremento sobre la dosis.',
          a,
          'Divide la suma de productos de las desviaciones por la suma de los cuadrados de las desviaciones de la dosis.',
        ),
        n(
          'Estima con la recta el incremento correspondiente a 2,5 mL.',
          b + 2.5 * a,
          'Obtén la ordenada en el origen mediante las medias y sustituye 2,5 en la recta.',
        ),
        n(
          'Halla el residuo de la observación de 3 mL.',
          1,
          'Resta al valor observado la predicción de la recta en 3 mL.',
        ),
        e(
          'Valora el uso de esta recta para una dosis de 30 mL.',
          'Es una extrapolación muy alejada de las dosis observadas. La relación podría cambiar.',
        ),
      ],
    }
  },
  'Contraste de independencia': (a, b) => {
    const k = a + b,
      observed = [
        [b, k],
        [k, b],
      ],
      expected = (b + k) / 2
    const chi = (4 * (a / 2) ** 2) / expected
    return {
      stem: 'Una muestra aleatoria se clasifica por turno y por medio de transporte. Se estudia su independencia mediante una prueba de ji cuadrado al 5 %. El valor crítico es 3,841.',
      figure: {
        type: 'table',
        headers: ['Turno', 'Autobús', 'Bicicleta'],
        rows: [
          ['Día', ...observed[0]],
          ['Noche', ...observed[1]],
        ],
      },
      tasks: [
        n(
          'Halla el tamaño de la muestra.',
          2 * (b + k),
          'Suma las frecuencias observadas.',
        ),
        n(
          'Halla los grados de libertad de la prueba.',
          1,
          'Multiplica el número de filas menos uno por el de columnas menos uno.',
        ),
        n(
          'Calcula la frecuencia esperada en la celda de día y autobús bajo independencia.',
          expected,
          'Multiplica el total de fila por el de columna y divide por el total muestral.',
        ),
        n(
          'Halla el estadístico de la prueba.',
          chi,
          'Suma en las cuatro celdas la diferencia observada menos esperada al cuadrado dividida por la esperada.',
        ),
        e(
          'Formula una conclusión en el contexto de la muestra.',
          chi > 3.841
            ? 'El estadístico supera el valor crítico. Se rechaza la independencia al 5 %.'
            : 'El estadístico es menor que el valor crítico. No hay evidencia suficiente al 5 % para rechazar la independencia.',
        ),
      ],
    }
  },
  'Distribución binomial y contraste de medias': (a, b) => {
    const xs = [b, b + 2, b + 4, b + 6],
      ys = [b + a, b + a + 2, 2 * b + a + 4, b + a + 6],
      diff = mean(xs) - mean(ys),
      ss = (vs) => total(vs.map((x) => (x - mean(vs)) ** 2)),
      t = diff / Math.sqrt(((ss(xs) + ss(ys)) / 6) * 0.5)
    return {
      stem: `En una prueba preliminar cada uno de ocho dispositivos supera el control con probabilidad ${a * 5} %, de forma independiente. En un estudio separado se toman muestras independientes de tiempos de dos procesos normales con igual varianza. Se contrasta si la media de A es menor que la de B.`,
      figure: {
        type: 'table',
        headers: ['Proceso', 'Tiempos (s)'],
        rows: [
          ['A', xs.join(', ')],
          ['B', ys.join(', ')],
        ],
      },
      tasks: [
        n(
          'Calcula el número esperado de dispositivos que superan el control.',
          (8 * a) / 20,
          'Aplica la esperanza de la distribución binomial.',
        ),
        n(
          'Halla el tiempo medio del proceso A en segundos.',
          mean(xs),
          'Suma las cuatro observaciones del grupo A y divide entre cuatro.',
        ),
        n(
          'Calcula la diferencia media muestral A menos B.',
          diff,
          'Calcula la media de cada grupo y resta en el orden indicado.',
        ),
        n(
          'Calcula el estadístico t de dos muestras con varianza combinada para A menos B.',
          t,
          'Utiliza la varianza muestral combinada y el error típico de la diferencia de medias.',
        ),
        e(
          'Con valor crítico unilateral −1,943, formula la conclusión al 5 %.',
          t < -1.943
            ? 'El estadístico cae en la cola de rechazo. Hay evidencia de que la media de A es menor.'
            : 'El estadístico no cae en la cola de rechazo. No hay evidencia suficiente para concluir que la media de A sea menor.',
        ),
      ],
    }
  },
}
