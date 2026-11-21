import { numberPart, review, type Family } from './model'

export const survey: Family = {
  id: 'levantamiento',
  courses: ['MAI'],
  theme: 'Geometría y trigonometría',
  topic: 'Triángulos rectángulos y semejanza',
  make(r, v, level) {
    const near = 5 * r(3, 8)
    const gap = 5 * r(2, 5)
    const rise = 3 * r(4, 10)
    const easy = level === 'Fácil',
      hard = level === 'Difícil'
    const far = near + gap
    if (v === 0) {
      return {
        stem: `Dos instrumentos nivelados a 1,5 m del suelo apuntan a la cima de una torre vertical desde el mismo lado. Los pies de la torre y de los instrumentos están alineados en terreno horizontal. Los instrumentos distan ${gap} m entre sí. Las tangentes de los ángulos de elevación cercano y lejano valen exactamente $${rise}/${near}$ y $${rise}/${far}$. ${easy ? 'El instrumento cercano está a ' + near + ' m de la torre.' : ''}`,
        tasks: [
          easy
            ? numberPart(
                'Halla el desnivel en metros entre el instrumento cercano y la cima.',
                rise,
                [
                  'Multiplica la distancia horizontal cercana por la tangente del ángulo de elevación.',
                ],
                ['Relaciona el cateto vertical con el horizontal.'],
              )
            : numberPart(
                'Reconstruye la distancia horizontal desde el instrumento cercano hasta la torre.',
                near,
                [
                  `Si la distancia es $x$, ambos instrumentos dan el mismo desnivel: $x(${rise}/${near})=(x+${gap})(${rise}/${far})$. Resuelve la ecuación.`,
                ],
                [
                  'Iguala las dos estimaciones del desnivel.',
                  'Despeja la distancia.',
                ],
              ),
          hard
            ? numberPart(
                'Un tercer instrumento, a la misma altura, ve la cima bajo un ángulo de 45°. ¿A qué distancia horizontal de la torre se encuentra?',
                rise,
                [
                  'Recupera el desnivel desde la estación cercana. A 45° los dos catetos tienen la misma longitud.',
                ],
                [
                  'Calcula el desnivel común.',
                  'Utiliza la nueva línea de visión.',
                ],
              )
            : numberPart(
                'Calcula la altura de la torre medida desde el suelo, en metros.',
                rise + 1.5,
                [
                  'Suma la altura de observación al desnivel calculado con la tangente.',
                ],
                ['Distingue altura total y desnivel.'],
              ),
          numberPart(
            'Calcula la distancia en línea recta desde el instrumento lejano hasta la cima.',
            Math.hypot(far, rise),
            [
              'Suma la separación entre estaciones a la distancia horizontal cercana. Aplica Pitágoras a esa base y al desnivel.',
            ],
            ['Reconstruye el triángulo lejano.', 'Determina la hipotenusa.'],
          ),
          numberPart(
            '¿Cuánto mide en grados el ángulo entre las dos líneas de visión?',
            ((Math.atan(rise / near) - Math.atan(rise / far)) * 180) / Math.PI,
            [
              'Obtén los dos ángulos de elevación con la tangente inversa. Resta el menor del mayor porque las horizontales son paralelas.',
            ],
            ['Obtiene ambos ángulos.', 'Interpreta su diferencia.'],
          ),
          review(
            'Explica qué ecuación del método tendría que cambiar si el segundo instrumento se levantara un metro adicional.',
            [
              'El desnivel desde el instrumento lejano sería un metro menor. Al igualar las estimaciones de altura habría que añadir ese metro al desnivel lejano.',
            ],
            [
              'Identifica qué desnivel cambia.',
              'Indica cómo compensar la diferencia.',
            ],
          ),
        ],
      }
    }
    const pilot = gap / 5
    // Both measurements are made at the same moment on horizontal ground.
    const shadow = (pilot * near) / rise
    return {
      stem: `A la misma hora, en un patio horizontal, una antena vertical proyecta una sombra de ${near} m. Una vara vertical de ${pilot} m proyecta una sombra que mide exactamente $${pilot * near}/${rise}$ m. Los rayos solares se consideran paralelos.`,
      tasks: [
        easy
          ? numberPart(
              'Halla el factor que amplía el triángulo de la vara hasta el de la antena.',
              near / shadow,
              [
                'Divide la longitud de la sombra de la antena entre la de la vara.',
              ],
              ['Utiliza lados homólogos.'],
            )
          : numberPart(
              'Determina el ángulo de elevación del Sol en grados a partir de la vara.',
              (Math.atan(rise / near) * 180) / Math.PI,
              [
                'Divide la altura de la vara entre su sombra y aplica la tangente inversa en grados.',
              ],
              ['Plantea la razón trigonométrica.'],
            ),
        hard
          ? numberPart(
              'Una funda cubre el tercio superior de la antena. ¿Cuántos metros mide la proyección horizontal de ese tramo sobre el patio, en la dirección de la sombra?',
              near / 3,
              [
                'A un ángulo solar fijo la proyección es proporcional a la longitud vertical. Usa un tercio de la sombra completa.',
              ],
              ['Establece la proporcionalidad.', 'Escala la sombra total.'],
            )
          : numberPart(
              'Calcula la altura de la antena en metros.',
              rise,
              [
                'Iguala las razones altura/sombra de los dos triángulos. Multiplica la razón de la vara por la sombra de la antena.',
              ],
              ['Aplica la semejanza de triángulos.'],
            ),
        numberPart(
          'Más tarde el Sol alcanza una elevación de 60°. Calcula la nueva longitud de la sombra de la antena.',
          rise / Math.sqrt(3),
          [
            'Recupera la altura mediante semejanza. Divide esa altura por la tangente de 60°.',
          ],
          ['Conserva la altura.', 'Recalcula el cateto horizontal.'],
        ),
        numberPart(
          `En ese segundo instante, ¿qué altura mínima debe tener otra vara vertical para que su sombra alcance una marca situada a ${far} m de su base en la dirección de la sombra?`,
          far * Math.sqrt(3),
          [
            `Para alcanzar justo la marca, el cateto vertical es $${far}\\tan(60^\\circ)$. Una vara más baja proyectaría una sombra más corta.`,
          ],
          ['Identifica el caso límite.', 'Reconstruye la altura.'],
        ),
        review(
          'Un estudiante mide la sombra de la vara una hora después que la de la antena. Explica si su estimación de la altura seguiría estando justificada.',
          [
            'La elevación solar puede cambiar entre las observaciones. La semejanza que permitió igualar las razones requería el mismo ángulo de elevación.',
          ],
          [
            'Identifica el supuesto temporal.',
            'Relaciona el ángulo con la semejanza.',
          ],
        ),
      ],
    }
  },
}
