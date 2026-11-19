import { fmt, numberPart as n, review, type Family } from './model'
// The residual vector (e,-2e,e) is orthogonal to both 1 and x at three equally spaced x values.
export const regression: Family = {
  id: 'ajuste',
  theme: 'Estadística y probabilidad',
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
        n(
          'Calcula el coeficiente de correlación lineal de Pearson entre temperatura y ventas.',
          (8 * m) / Math.sqrt(8 * (8 * m * m + 6 * e * e)),
          [
            `Centra las observaciones en sus medias ${k + 2} y ${y(k + 2)}. La suma de productos de desviaciones es ${8 * m}.`,
            `Las sumas de cuadrados son 8 y ${8 * m * m + 6 * e * e}. Divide la suma de productos por la raíz del producto de esas sumas. También puedes obtener r mediante tecnología.`,
          ],
          [
            'Utiliza las observaciones emparejadas.',
            'Centra las variables en sus medias.',
            'Normaliza la covariación.',
          ],
        ),
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
  theme: 'Estadística y probabilidad',
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

export const independence: Family = {
  id: 'independencia',
  theme: 'Estadística y probabilidad',
  topic: 'Contraste de independencia',
  courses: ['MAI'],
  make(r, v, level) {
    const e = r(9, 18),
      shift = r(2, 6)
    const observed = [
      [e + shift, e - shift],
      [e - shift, e + shift],
    ]
    const chi = (4 * shift ** 2) / e
    const easy = level === 'Básico',
      hard = level === 'Avanzado'
    const rows = observed.map((row, i) => [i ? 'B' : 'A', ...row])
    if (v) rows[0][1] = '?'
    return {
      stem: `Se toma una muestra aleatoria de ${4 * e} entregas independientes. Se registra el turno y si cada entrega llega a tiempo. ${v ? `En el turno A se observaron ${2 * e} entregas. ` : ''}Se desea contrastar la independencia entre turno y puntualidad.`,
      figure: {
        type: 'table',
        headers: ['Turno', 'A tiempo', 'Con retraso'],
        rows,
      },
      tasks: [
        v
          ? n(
              'Recupera la frecuencia observada que falta.',
              e + shift,
              [
                `Del total de ${2 * e} entregas del turno A resta sus ${e - shift} retrasos.`,
              ],
              ['Usa la frecuencia marginal del turno.'],
            )
          : n(
              easy
                ? 'Calcula la proporción de entregas puntuales en el turno A.'
                : 'Halla la frecuencia esperada de entregas puntuales en A bajo la hipótesis nula.',
              easy ? (e + shift) / (2 * e) : e,
              [
                easy
                  ? `Divide las ${e + shift} puntuales entre las ${2 * e} entregas del turno.`
                  : `Multiplica el total de la fila (${2 * e}) por el de la columna (${2 * e}) y divide entre ${4 * e}.`,
              ],
              ['Utiliza los totales correspondientes al turno A.'],
            ),
        hard
          ? n(
              'Calcula el estadístico de Pearson para el contraste.',
              chi,
              [
                `Cada celda tiene frecuencia esperada ${e}. Las desviaciones son de magnitud ${shift}.`,
                `Suma las cuatro contribuciones $(O-E)^2/E$.`,
              ],
              ['Compara la tabla completa con la independencia.'],
            )
          : n(
              'Calcula la contribución de la primera celda al estadístico de Pearson.',
              shift ** 2 / e,
              [
                `Bajo independencia su frecuencia esperada es ${e}. Evalúa $(${e + shift}-${e})^2/${e}$.`,
              ],
              ['Usa frecuencia esperada en el denominador.'],
            ),
        n(
          'Con las mismas proporciones en las cuatro celdas, una segunda muestra tiene el doble de observaciones. Calcula el nuevo estadístico.',
          2 * chi,
          [
            'Al duplicar cada frecuencia observada también se duplica cada esperada.',
            'La diferencia al cuadrado se multiplica por cuatro y el denominador por dos. El estadístico se duplica.',
          ],
          [
            'Escala las frecuencias esperadas.',
            'Acumula las contribuciones modificadas.',
          ],
        ),
        n(
          'Volviendo a la muestra original, calcula la diferencia entre las proporciones de puntualidad de A y de B, en ese orden.',
          shift / e,
          [
            `Las proporciones son $${e + shift}/${2 * e}$ y $${e - shift}/${2 * e}$.`,
            'Resta ambas estimaciones.',
          ],
          [
            'Condiciona por el turno correcto.',
            'Compara proporciones en la misma escala.',
          ],
        ),
        review(
          'Para la muestra original, el valor crítico al 5 % con un grado de libertad es 3,841. Formula la conclusión y explica qué indica sobre causalidad.',
          [
            `El estadístico vale ${fmt(chi)}. ${chi > 3.841 ? 'Supera el valor crítico. Se rechaza la independencia y hay evidencia de asociación.' : 'Queda por debajo del valor crítico. La muestra aporta evidencia insuficiente para rechazar la independencia.'}`,
            'Una asociación observada no establece por sí misma que el turno cause los retrasos.',
          ],
          [
            'Formula la hipótesis de independencia.',
            'Compara con el umbral.',
            'Interpreta la decisión en contexto.',
            'Distingue asociación y causalidad.',
          ],
        ),
      ],
    }
  },
}

// Standard normal upper tails at the supported design points, checked by quadrature.
const normalTails = [
  0.15865525393145707, 0.06680720126885809, 0.02275013194817921,
]
export const normal: Family = {
  id: 'normal',
  theme: 'Estadística y probabilidad',
  topic: 'Distribución normal',
  courses: ['MAI', 'MAE'],
  make(r, v, level) {
    const mu = r(55, 85),
      sigma = 2 * r(2, 5),
      i = r(0, 2),
      z = 1 + i / 2,
      tail = normalTails[i]
    const lower = mu - z * sigma,
      upper = mu + z * sigma
    const easy = level === 'Básico',
      hard = level === 'Avanzado'
    const data = v
      ? `Dos lecturas, ${lower} y ${upper} segundos, tienen puntuaciones típicas $${-z}$ y $${z}$, respectivamente.`
      : `La media es ${mu} s y la desviación típica es ${sigma} s.`
    return {
      stem: `El tiempo de espera de un proceso se modela mediante una variable normal X. ${data}`,
      tasks: [
        v
          ? n(
              'Deduce la desviación típica en segundos.',
              sigma,
              [
                `Las lecturas distan ${upper - lower} s entre sí. Esa separación equivale a ${2 * z} desviaciones típicas.`,
              ],
              ['Relaciona las dos escalas.'],
            )
          : n(
              easy
                ? `Tipifica una espera de ${upper} s.`
                : `Calcula la probabilidad de que la espera supere ${upper} s.`,
              easy ? z : tail,
              [
                `Sustituye en $Z=(X-${mu})/${sigma}$ para obtener ${z}.`,
                easy
                  ? 'Expresa la distancia a la media en desviaciones típicas.'
                  : 'Usa la cola superior de la normal estándar.',
              ],
              ['Estandariza el umbral.'],
            ),
        hard
          ? n(
              `Solo se auditan esperas que superan la media. ¿Qué proporción de las auditadas supera ${upper} s?`,
              2 * tail,
              [
                `Superar ${upper} s implica superar la media. La probabilidad conjunta es ${fmt(tail)}.`,
                'Divide entre 0,5, la probabilidad de pertenecer al grupo auditado.',
              ],
              ['Condiciona por la selección de la muestra.'],
            )
          : n(
              `Calcula la probabilidad de que una espera esté entre ${lower} y ${upper} s.`,
              1 - 2 * tail,
              [
                `Los límites están a ${z} desviaciones típicas de la media. Resta ambas colas del área total.`,
              ],
              ['Determina el área entre dos límites.'],
            ),
        n(
          `En dos esperas independientes, ¿cuál es la probabilidad de que exactamente una supere ${upper} s?`,
          2 * tail * (1 - tail),
          [
            `La probabilidad de superar el umbral es $p=${fmt(tail)}$.`,
            'Suma las dos posibilidades disjuntas: $p(1-p)+(1-p)p$.',
          ],
          [
            'Identifica los dos órdenes posibles.',
            'Multiplica probabilidades independientes.',
          ],
        ),
        n(
          `Se desplaza la media 3 s hacia arriba y se reduce la desviación típica a la mitad. ¿Qué nuevo umbral en segundos conserva la misma probabilidad de excedencia que ${upper} s en el proceso original?`,
          mu + 3 + (z * sigma) / 2,
          [
            `El umbral debe conservar su puntuación típica ${z}.`,
            `Usa la nueva media ${mu + 3} y la nueva desviación ${sigma / 2} para volver a segundos.`,
          ],
          [
            'Conserva el cuantil estandarizado.',
            'Aplica ambos cambios de parámetros.',
          ],
        ),
        review(
          'En días con averías aparecen dos grupos de tiempos bien separados. Evalúa el uso de una sola distribución normal para esos días.',
          [
            'Una sola normal tiene un único máximo. Dos grupos separados podrían corresponder a distintos estados del proceso. Conviene contrastar su distribución en cada estado.',
          ],
          [
            'Describe la forma del modelo.',
            'Contrasta esa forma con los datos.',
            'Propone una comprobación pertinente.',
          ],
        ),
      ],
    }
  },
}
