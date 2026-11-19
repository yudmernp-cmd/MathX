import { fmt, numberPart as n, review, type Family } from './model'
// The residual vector (e,-2e,e) is orthogonal to both 1 and x at three equally spaced x values.
export const regression: Family = {
  id: 'ajuste',
  topic: 'Regresión e interpretación',
  courses: ['MAI'],
  make(r, v, level) {
    const m = r(3, 8),
      b = r(10, 18),
      e = r(1, 3),
      k = r(2, 5),
      y = (t: number) => m * t + b
    const rows = [
      [k, y(k) + e],
      [k + 2, y(k + 2) - 2 * e],
      [k + 4, y(k + 4) + e],
    ]
    return {
      stem: `Se relacionan la temperatura $x$ (°C) y las ventas diarias $y$ (unidades). ${v ? `Un analista propone la recta de mínimos cuadrados $ŷ=${m}x+${b}$. Contrasta sus predicciones con la tabla.` : 'Ajusta con tecnología la recta de mínimos cuadrados de las ventas en función de la temperatura.'}`,
      figure: { type: 'table', headers: ['Temperatura (°C)', 'Ventas'], rows },
      tasks: [
        v
          ? n(
              `Calcula el residuo (observado menos predicho) a ${k} °C.`,
              e,
              [
                `La predicción es ${y(k)}. Réstala del valor observado ${y(k) + e}.`,
              ],
              ['Compara la observación con la predicción.'],
            )
          : n(
              'Determina la pendiente de la recta de ajuste.',
              m,
              [
                `Las medias son ${k + 2} y ${y(k + 2)}. Divide la suma de productos de desviaciones, ${8 * m}, entre la suma de cuadrados de las desviaciones en x, 8.`,
              ],
              ['Ajusta y sobre x por mínimos cuadrados.'],
            ),
        level === 'Avanzado'
          ? n(
              `¿Qué temperatura corresponde a una predicción de ${y(k + 3)} unidades según esta recta?`,
              k + 3,
              [`Resuelve $ ${m}x+${b}=${y(k + 3)}$.`],
              ['Invierte la predicción del modelo dado.'],
            )
          : n(
              `Predice las ventas a ${k + 1} °C.`,
              y(k + 1),
              [`Sustituye $x=${k + 1}$ en $ŷ=${m}x+${b}$.`],
              ['Evalúa la recta ajustada.'],
            ),
        n(
          'Calcula la suma de los cuadrados de los tres residuos.',
          6 * e * e,
          [
            `Los residuos son ${e}, ${-2 * e} y ${e}. Eleva cada uno al cuadrado y suma.`,
          ],
          [
            'Calcula los residuos con las observaciones correspondientes.',
            'Suma sus cuadrados.',
          ],
        ),
        {
          ...n(
            'Calcula el porcentaje de la variación de ventas explicado por el ajuste.',
            (100 * 8 * m * m) / (8 * m * m + 6 * e * e),
            [
              `La suma total de cuadrados respecto a la media es ${8 * m * m + 6 * e * e}. Calcula $100(1-\\mathrm{SSE}/\\mathrm{SST})$ con SSE = ${6 * e * e}.`,
            ],
            [
              'Centra las ventas respecto a su media.',
              'Obtiene la suma total de cuadrados.',
              'Calcula el coeficiente de determinación en porcentaje.',
            ],
          ),
          percentage: true,
        },
        review(
          `Valora una previsión a ${k + 30} °C basada solo en esta muestra.`,
          [
            `La muestra cubre de ${k} a ${k + 4} °C y contiene tres días. La recta puede perder validez fuera de este rango. Harían falta observaciones cercanas a ${k + 30} °C.`,
          ],
          [
            'Identifica la extrapolación respecto al rango observado.',
            'Explica por qué puede cambiar la relación.',
            'Propone datos pertinentes para comprobarla.',
          ],
        ),
      ],
    }
  },
}
// A finite binomial model supports technology-based cumulative and inverse probability questions.
export const binomial: Family = {
  id: 'lotes',
  topic: 'Distribución binomial',
  courses: ['MAI', 'MAE'],
  make(r, v, level) {
    const size = r(6, 12),
      p = r(2, 6) / 10,
      one = (1 - p) ** size,
      exact1 = size * p * (1 - p) ** (size - 1),
      hit = 1 - one
    return {
      stem: `Un sensor detecta cada señal independientemente de las demás con la misma probabilidad. ${v ? `En grupos de ${size} señales detecta una media teórica de ${fmt(size * p)}.` : `La probabilidad de detección es ${fmt(p)} y cada grupo contiene ${size} señales.`}`,
      tasks: [
        v
          ? n(
              'Deduce la probabilidad de detectar una señal.',
              p,
              [`Usa $E(X)=np$. Divide ${fmt(size * p)} entre ${size}.`],
              ['Relaciona media, tamaño y probabilidad.'],
            )
          : n(
              level === 'Básico'
                ? 'Calcula el número esperado de detecciones por grupo.'
                : 'Halla la probabilidad de cero detecciones en un grupo.',
              level === 'Básico' ? size * p : one,
              [
                level === 'Básico'
                  ? `Multiplica ${size} por ${fmt(p)}.`
                  : `Multiplica la probabilidad de fallo en las ${size} ocasiones independientes.`,
              ],
              ['Utiliza los parámetros de la binomial.'],
            ),
        level === 'Avanzado'
          ? n(
              'Dado que hubo al menos una detección, calcula la probabilidad de que hubiera exactamente una.',
              exact1 / hit,
              [
                `Usa $P(X=1)/P(X≥1)$. El numerador es $np(1-p)^{n-1}$ y el denominador es $1-(1-p)^n$.`,
              ],
              ['Condiciona por al menos un éxito.'],
            )
          : n(
              'Halla la probabilidad de al menos una detección en un grupo.',
              hit,
              [
                `Calcula el complemento de cero éxitos: $1-(1-${fmt(p)})^{${size}}$.`,
              ],
              ['Usa el suceso complementario.'],
            ),
        n(
          'Se considera satisfactorio un grupo si hay dos o más detecciones. Calcula la probabilidad de que sea satisfactorio.',
          1 - one - exact1,
          [
            `Suma las probabilidades de cero y un éxito: ${fmt(one)} y ${fmt(exact1)}. Resta su suma de 1.`,
          ],
          [
            'Identifica el complemento.',
            'Calcula ambos términos binomiales.',
            'Combina las probabilidades.',
          ],
        ),
        n(
          'Halla el menor número de señales independientes necesario para que la probabilidad de alguna detección alcance al menos el 95 %.',
          Math.ceil(Math.log(0.05) / Math.log(1 - p)),
          [
            `Exige $(1-${fmt(p)})^n≤0.05$. Divide logaritmos invirtiendo la desigualdad y toma el techo.`,
          ],
          [
            'Expresa la restricción en términos de fallos.',
            'Resuelve y justifica el redondeo al entero superior.',
          ],
        ),
        review(
          'Una interferencia común puede bloquear todas las señales de un grupo. Evalúa el uso del modelo binomial inicial.',
          [
            'Un bloqueo compartido hace dependientes los fallos. Un solo estado oculto afecta a todo el grupo. Se podría condicionar por presencia de interferencia y combinar los dos escenarios.',
          ],
          [
            'Identifica la independencia supuesta.',
            'Explica cómo se rompe.',
            'Relaciona el bloqueo con fallos conjuntos.',
            'Sugiere condicionar por el estado de interferencia.',
          ],
        ),
      ],
    }
  },
}
