import { numberPart as n, review, type Family } from './model'
export const accumulation: Family = {
  id: 'caudal',
  theme: 'Análisis matemático',
  topic: 'Acumulación y regla del trapecio',
  courses: ['MAI'],
  make(r, v, level) {
    const h = r(2, 5),
      a = 2 * r(2, 5),
      b = a + 2 * r(2, 5),
      c = 2 * r(1, 3),
      initial = r(20, 40)
    const area1 = (h * (a + b)) / 2,
      area2 = (h * (b + c)) / 2,
      total = area1 + area2
    const inverse = v === 1 && level !== 'Fácil'
    return {
      stem: `Una cisterna contiene ${initial} litros al comenzar. Se mide el caudal de entrada en litros por minuto. Entre dos lecturas consecutivas se supone que el caudal varía linealmente. ${inverse ? 'Durante todo el intervalo entraron ' + total + ' litros.' : ''}`,
      figure: {
        type: 'table',
        headers: ['Tiempo (min)', 'Caudal (L/min)'],
        rows: [
          [0, a],
          [h, inverse ? '?' : b],
          [2 * h, c],
        ],
      },
      tasks: [
        inverse
          ? n(
              'Reconstruye el caudal de la lectura central.',
              b,
              [
                `Suma las áreas de los dos trapecios: $${total}=${h}(${a}+2b+${c})/2$. Despeja b.`,
              ],
              ['Relaciona las dos áreas con el volumen conocido.'],
            )
          : n(
              level === 'Fácil'
                ? 'Halla el caudal medio durante el primer intervalo.'
                : 'Calcula cuántos litros entran durante el primer intervalo.',
              level === 'Fácil' ? (a + b) / 2 : area1,
              [
                `La media de los caudales extremos es $(${a}+${b})/2$.`,
                level === 'Fácil'
                  ? 'La variación lineal justifica el promedio.'
                  : `Multiplica por los ${h} minutos del intervalo.`,
              ],
              ['Usa la variación lineal.'],
            ),
        level === 'Difícil'
          ? n(
              `Una bomba extrae a ritmo constante durante los ${2 * h} minutos. ¿Qué caudal de salida mantendría el volumen final igual al inicial?`,
              total / (2 * h),
              [
                `El volumen extraído debe igualar la entrada de ${total} litros. Divide por la duración completa.`,
              ],
              ['Impone el balance de volúmenes.'],
            )
          : n(
              'Sin extracción, calcula el volumen final en litros.',
              initial + total,
              [
                `Suma los aportes ${area1} y ${area2} al volumen inicial de ${initial} litros.`,
              ],
              ['Distingue volumen acumulado y volumen inicial.'],
            ),
        n(
          `Sin extracción, ¿cuántos litros contiene la cisterna a los ${1.5 * h} minutos?`,
          initial + area1 + (h * (3 * b + c)) / 8,
          [
            `A mitad del segundo tramo el caudal es $(${b}+${c})/2$.`,
            'Suma al volumen al final del primer tramo el área del trapecio parcial.',
          ],
          [
            'Interpola el caudal.',
            'Usa la duración del tramo parcial.',
            'Acumula desde el volumen inicial.',
          ],
        ),
        n(
          'Por un error de calibración, cada lectura era 1 L/min superior al caudal real. Calcula el volumen total que entró realmente.',
          total - 2 * h,
          [
            'Restar una constante al caudal reduce el área en un rectángulo.',
            `Descuenta $1 · ${2 * h}$ litros del aporte calculado.`,
          ],
          ['Relaciona el sesgo con un área.', 'Corrige la entrada acumulada.'],
        ),
        review(
          'Si únicamente se conocieran las tres lecturas y el caudal pudiera curvarse entre ellas, ¿sería exacto el total calculado? Justifica.',
          [
            'Distintas curvas pueden compartir tres lecturas y tener áreas distintas. La exactitud de los trapecios usados depende de la hipótesis lineal.',
          ],
          [
            'Identifica el supuesto.',
            'Compara áreas compatibles con los datos.',
            'Interpreta el resultado como estimación.',
          ],
        ),
      ],
    }
  },
}
