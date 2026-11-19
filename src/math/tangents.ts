import { numberPart as n, review, type Family } from './model'

export const tangents: Family = {
  id: 'tangentes',
  theme: 'Cálculo',
  topic: 'Derivadas y rectas tangentes',
  courses: ['MAI', 'MAE'],
  make(r, v, level) {
    const a = r(1, 4),
      t = r(2, 5),
      c = r(4, 10),
      m = 2 * a * t
    const at = (x: number) => a * x * x + c
    const easy = level === 'Básico',
      hard = level === 'Avanzado'
    const data = v
      ? `La curva $f(x)=ax^2+${c}$ tiene en $x=${t}$ una tangente de pendiente ${m}.`
      : `La curva está dada por $f(x)=${a}x^2+${c}$.`
    return {
      stem:
        data +
        ' Una recta tangente se utiliza para aproximar valores de la función cerca del punto de contacto.',
      tasks: [
        v
          ? n(
              'Determina a.',
              a,
              [
                `Deriva para obtener $f'(x)=2ax$. Despeja a de $2a · ${t}=${m}$.`,
              ],
              ['Usa la pendiente como valor de la derivada.'],
            )
          : n(
              easy
                ? `Calcula la pendiente en $x=${t}$.`
                : `Encuentra la abscisa del punto donde la tangente es paralela a la recta $y=${m}x+1$.`,
              easy ? m : t,
              [
                `La derivada es $f'(x)=${2 * a}x$.`,
                easy
                  ? `Evalúa en ${t}.`
                  : `Iguala la derivada a la pendiente ${m} y despeja.`,
              ],
              ['Relaciona pendiente y derivada.'],
            ),
        hard
          ? n(
              `¿Dónde corta al eje horizontal la tangente trazada en $x=${t}$? Indica su abscisa.`,
              t - at(t) / m,
              [
                `La tangente pasa por $(${t},${at(t)})$ y tiene pendiente ${m}.`,
                `Resuelve $0=${at(t)}+${m}(x-${t})$.`,
              ],
              ['Construye y utiliza la ecuación de la tangente.'],
            )
          : n(
              `Aproxima $f(${t + 0.5})$ con la tangente en $x=${t}$.`,
              at(t) + m / 2,
              [
                `Parte de ${at(t)}. Aumentar x en 0,5 añade $0.5 · ${m}$ a la ordenada de la tangente.`,
              ],
              ['Aplica la pendiente al desplazamiento.'],
            ),
        n(
          `Para $x=${t + 1}$, calcula el error absoluto de la aproximación con esa tangente.`,
          a,
          [
            `La función vale ${at(t + 1)} y la tangente vale $${at(t)}+${m}$.`,
            'Resta ambos valores y toma el valor absoluto.',
          ],
          [
            'Evalúa las dos expresiones.',
            'Compara los valores en la misma abscisa.',
          ],
        ),
        n(
          `Halla la mayor distancia horizontal al punto de contacto para la cual el error absoluto es como máximo ${4 * a}.`,
          2,
          [
            `Para un incremento h, la expansión cuadrática da $f(${t}+h)=f(${t})+${m}h+${a}h^2$.`,
            `El error es $${a}h^2$. Resuelve $${a}h^2≤${4 * a}$.`,
          ],
          [
            'Expresa el error en función del desplazamiento.',
            'Resuelve la restricción.',
          ],
        ),
        review(
          'Explica si cambiar el término constante de la función modifica el error de esta aproximación tangente en la misma abscisa de contacto.',
          [
            'La curva y su recta tangente se trasladan verticalmente en la misma cantidad. Su diferencia se conserva para cada abscisa.',
          ],
          [
            'Describe la traslación de la curva.',
            'Relaciona ese cambio con la tangente.',
            'Justifica la invariancia del error.',
          ],
        ),
      ],
    }
  },
}

export const motion: Family = {
  id: 'movimiento',
  theme: 'Cálculo',
  topic: 'Integración y cinemática',
  courses: ['MAE'],
  make(r, v, level) {
    const a = r(2, 5),
      t = r(2, 5),
      initial = r(8, 20),
      end = 2 * t + 1
    const velocity = (x: number) => a * (x - t)
    const displacement = (x: number) => a * x * (x / 2 - t)
    const easy = level === 'Básico',
      hard = level === 'Avanzado'
    return {
      stem: `Un carro se mueve por una guía recta entre los instantes 0 y ${end} s. Parte de la posición ${initial} m. ${v ? `Su aceleración es constante e igual a ${a} m/s², y su velocidad inicial es ${-a * t} m/s.` : `Su velocidad en m/s es $v(t)=${a}(t-${t})$.`} El sentido positivo es hacia la derecha.`,
      tasks: [
        v
          ? n(
              'Encuentra el instante en que el carro invierte el sentido del movimiento.',
              t,
              [
                `La velocidad es $${-a * t}+${a}t$. Iguala a cero. La aceleración positiva garantiza que cambia de signo.`,
              ],
              ['Reconstruye la velocidad a partir de la aceleración.'],
            )
          : n(
              easy
                ? 'Calcula la velocidad inicial en m/s.'
                : 'Determina la posición en metros donde el carro cambia de sentido.',
              easy ? velocity(0) : initial + displacement(t),
              [
                easy
                  ? 'Evalúa la velocidad en cero.'
                  : `El cambio se produce en $t=${t}$. Integra la velocidad entre 0 y ${t} y suma la posición inicial.`,
              ],
              ['Distingue posición de velocidad.'],
            ),
        hard
          ? n(
              '¿En qué instante positivo pasa de nuevo por su posición de partida?',
              2 * t,
              [
                `El desplazamiento acumulado es $${a}t^2/2-${a * t}t$.`,
                'Iguala a cero, factoriza y selecciona la raíz positiva.',
              ],
              ['Aplica la condición de desplazamiento nulo.'],
            )
          : n(
              `Halla el desplazamiento entre el inicio y $t=${t + 1}$ s, en metros.`,
              displacement(t + 1),
              [
                `Evalúa la primitiva $${a}t^2/2-${a * t}t$ en los dos extremos. Conserva el signo.`,
              ],
              ['Integra la velocidad con límites adecuados.'],
            ),
        n(
          'Calcula la distancia total recorrida en metros durante todo el intervalo del modelo.',
          displacement(end) - 2 * displacement(t),
          [
            `Divide el intervalo en $[0,${t}]$ y $[${t},${end}]$. El primer desplazamiento es ${displacement(t)} m.`,
            `El segundo desplazamiento es ${displacement(end) - displacement(t)} m. Suma sus valores absolutos.`,
          ],
          [
            'Localiza el cambio de sentido.',
            'Acumula las distancias de ambos tramos.',
          ],
        ),
        n(
          'Halla la rapidez media en m/s durante todo el recorrido.',
          (displacement(end) - 2 * displacement(t)) / end,
          [
            'Toma la distancia total del apartado anterior.',
            `Divide por la duración completa de ${end} s.`,
          ],
          [
            'Utiliza distancia recorrida.',
            'Utiliza el intervalo temporal completo.',
          ],
        ),
        review(
          'Explica cómo cambiarían la distancia total y la velocidad media si se trasladara el origen de posiciones 10 m a la derecha.',
          [
            'Se resta 10 m a cada coordenada. Las diferencias de posición, la velocidad y los tiempos se conservan. Tanto la distancia total como la velocidad media mantienen su valor.',
          ],
          [
            'Describe el cambio en las coordenadas.',
            'Justifica la invariancia de las diferencias.',
            'Interpreta ambas magnitudes.',
          ],
        ),
      ],
    }
  },
}
