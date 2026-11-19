import { numberPart as n, review, type Family } from './model'

export const voronoi: Family = {
  id: 'voronoi',
  theme: 'Geometría y trigonometría',
  topic: 'Diagramas de Voronoi',
  courses: ['MAI'],
  make(r, v, level) {
    const x = r(1, 5),
      y = r(1, 5),
      d = r(2, 5),
      h = r(2, 5)
    const boundary = x + d,
      north = y + h
    // Three non-collinear sites. The vertex is the circumcentre of a right triangle.
    const sites = v
      ? `A está en $(${x},${y})$ y C en $(${x},${y + 2 * h})$. B está al este de A a la misma altura. La frontera de A y B está sobre $x=${boundary}$.`
      : `Los centros son $A=(${x},${y})$, $B=(${x + 2 * d},${y})$ y $C=(${x},${y + 2 * h})$.`
    const hard = level === 'Avanzado',
      easy = level === 'Básico'
    return {
      stem: `Tres centros de reparto atienden un plano sin obstáculos. Cada domicilio se asigna al centro más cercano en distancia recta. Una unidad representa un kilómetro. ${sites}`,
      tasks: [
        v
          ? n(
              'Recupera la coordenada horizontal de B.',
              x + 2 * d,
              [
                `La frontera es la mediatriz. Refleja la coordenada ${x} respecto a ${boundary}.`,
              ],
              ['Utiliza la simetría respecto de la mediatriz.'],
            )
          : n(
              easy
                ? 'Calcula la distancia entre A y B en kilómetros.'
                : 'Halla la coordenada horizontal de los puntos equidistantes de A y B.',
              easy ? 2 * d : boundary,
              [
                easy
                  ? 'Resta las abscisas, ya que las ordenadas coinciden.'
                  : `La mediatriz vertical pasa por la media de ${x} y ${x + 2 * d}.`,
              ],
              ['Utiliza las coordenadas de ambos centros.'],
            ),
        hard
          ? n(
              'Halla la distancia desde el vértice común de las tres regiones hasta A.',
              Math.hypot(d, h),
              [
                `Las mediatrices de AB y AC se cruzan en $(${boundary},${north})$.`,
                `Aplica Pitágoras con desplazamientos ${d} y ${h}.`,
              ],
              ['Localiza el punto equidistante y calcula su distancia.'],
            )
          : n(
              'Calcula la ordenada de los puntos equidistantes de A y C.',
              north,
              [
                `La mediatriz de AC es horizontal. Pasa por la media de las ordenadas ${y} y ${y + 2 * h}.`,
              ],
              ['Determina la altura del punto medio.'],
            ),
        n(
          `Un vehículo parte de A siguiendo la trayectoria $(${x}+t,${y}+t)$ con $t≥0$. ¿Para qué valor de t alcanza por primera vez el borde de la región de A?`,
          Math.min(d, h),
          [
            `La región de A satisface $x≤${boundary}$ e $y≤${north}$.`,
            `Sustituye la trayectoria. La primera frontera se alcanza en el menor de ${d} y ${h}.`,
          ],
          [
            'Construye las dos condiciones de cercanía.',
            'Compara sus tiempos de salida.',
          ],
        ),
        n(
          `C se desplaza 2 km al norte y A y B permanecen fijos. Halla la nueva ordenada del vértice común.`,
          north + 1,
          [
            `La frontera de AB conserva su abscisa. La nueva mediatriz de AC pasa a media altura entre ${y} y ${y + 2 * h + 2}.`,
          ],
          [
            'Identifica la frontera que se desplaza.',
            'Reconstruye la nueva mediatriz.',
          ],
        ),
        review(
          '¿Cuándo podría el centro asignado por este diagrama tardar más en llegar que otro centro?',
          [
            'Un río con un solo puente puede alargar el recorrido más corto en línea recta. Para asignar por tiempo de viaje se necesitarían rutas y velocidades.',
          ],
          [
            'Explica la métrica empleada.',
            'Describe un obstáculo concreto.',
            'Relaciona el obstáculo con el tiempo de viaje.',
          ],
        ),
      ],
    }
  },
}

export const sectors: Family = {
  id: 'sectores',
  theme: 'Geometría y trigonometría',
  topic: 'Radianes y sectores circulares',
  courses: ['MAE'],
  make(r, v, level) {
    const radius = r(3, 9),
      k = r(2, 4),
      theta = 2 / k,
      arc = radius * theta,
      area = (radius * arc) / 2
    const hard = level === 'Avanzado',
      easy = level === 'Básico'
    const data = v
      ? `Su arco mide $ ${2 * radius}/${k}$ cm y el área es $ ${radius ** 2}/${k}$ cm².`
      : `El radio mide ${radius} cm y el ángulo central es $2/${k}$ radianes.`
    return {
      stem: `Una lámina tiene forma de sector circular. ${data}`,
      tasks: [
        v
          ? n(
              'Recupera el radio del sector.',
              radius,
              ['Usa $s=rθ$ y $A=r^2θ/2$. Al dividir se obtiene $r=2A/s$.'],
              ['Relaciona el área con el arco.'],
            )
          : n(
              easy
                ? 'Halla la longitud del arco en centímetros.'
                : 'Halla el perímetro completo del sector, en centímetros.',
              easy ? arc : 2 * radius + arc,
              [
                `La longitud del arco es $${radius} · 2/${k}$.`,
                easy
                  ? 'El ángulo está en radianes.'
                  : 'Suma los dos radios al arco.',
              ],
              ['Distingue la longitud curva del borde completo.'],
            ),
        hard
          ? n(
              'Se fabrica otro sector con la misma área y el doble de radio. Determina su ángulo central en radianes.',
              theta / 4,
              [
                'Al duplicar el radio, su cuadrado se multiplica por cuatro. Para conservar el área, divide el ángulo original entre cuatro.',
              ],
              ['Relaciona la escala radial con la escala angular.'],
            )
          : n(
              'Calcula el área de un sector de igual radio y triple ángulo, en centímetros cuadrados.',
              3 * area,
              [
                `El área original es $${radius ** 2}/${k}$. Con radio fijo el área es proporcional al ángulo.`,
              ],
              ['Aplica la proporcionalidad angular.'],
            ),
        n(
          'Se recorta la parte situada a menos de la mitad del radio del centro. Halla el área restante en centímetros cuadrados.',
          (3 * area) / 4,
          [
            'El sector interior conserva el ángulo y tiene un cuarto del área inicial.',
            'Resta el área del sector interior a la del original.',
          ],
          [
            'Calcula la fracción recortada.',
            'Obtiene el área de la corona sectorial.',
          ],
        ),
        n(
          'Otra pieza tiene el mismo arco que la lámina original y el doble de área. ¿Cuál es su radio, en centímetros?',
          2 * radius,
          [
            'Con longitud de arco fija se cumple $A=rs/2$.',
            'El área es proporcional al radio bajo esa condición.',
          ],
          [
            'Elimina el ángulo de las ecuaciones.',
            'Aplica la condición de arco fijo.',
          ],
        ),
        review(
          'Si dos sectores tienen el mismo perímetro, ¿necesariamente tienen el mismo arco? Justifica tu respuesta.',
          [
            'El perímetro es $2r+s$. Por tanto dos radios distintos permiten dos arcos distintos para el mismo perímetro. Por ejemplo, con perímetro 12, los radios 3 y 4 dan arcos 6 y 4, ambos posibles.',
          ],
          [
            'Expresa el perímetro.',
            'Relaciona el arco con el radio.',
            'Justifica con dos sectores posibles.',
          ],
        ),
      ],
    }
  },
}
