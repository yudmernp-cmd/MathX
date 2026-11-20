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
    const hard = level === 'Difícil',
      easy = level === 'Fácil'
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
