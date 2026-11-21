import { numeric as n, explain as e } from './math.mjs'
export const geometry = {
  'Diagramas de Voronoi': (a, b) => ({
    stem: `Tres estaciones de reparto se sitúan en $A=(0,0)$, $B=(${2 * b},0)$ y $C=(0,${2 * a})$. La escala está en metros y se utiliza la distancia en línea recta.`,
    tasks: [
      n(
        'Halla la abscisa del punto medio de AB.',
        b,
        'Promedia las abscisas de A y B.',
      ),
      n(
        'Halla la ordenada de la mediatriz horizontal de AC.',
        a,
        'La mediatriz pasa por el punto medio de AC.',
      ),
      n(
        'Calcula la distancia desde el vértice de Voronoi común a la estación B.',
        Math.hypot(a, b),
        'Halla la intersección de las dos mediatrices y aplica Pitágoras.',
      ),
      n(
        `Una estación provisional se sitúa en $(${b + 1},${a})$. ¿En cuánto disminuye la distancia desde el vértice hasta la estación más cercana?`,
        Math.hypot(a, b) - 1,
        'Resta la distancia a la nueva estación a la distancia común anterior.',
      ),
      e(
        'Explica por qué la frontera entre B y C no contiene toda la mediatriz de BC.',
        'Solo cuentan los puntos equidistantes de B y C cuya distancia a A sea mayor o igual.',
      ),
    ],
  }),
  'Triángulos rectángulos y semejanza': (a, b) => ({
    stem: `Un mástil vertical se apoya sobre un terreno horizontal. Un cable va de su extremo superior al suelo a ${b} m del pie. El mástil mide ${a} m.`,
    tasks: [
      n(
        'Calcula la longitud del cable.',
        Math.hypot(a, b),
        'Usa la hipotenusa del triángulo con lados vertical y horizontal conocidos.',
      ),
      n(
        'Calcula en grados el ángulo del cable con el suelo.',
        (Math.atan2(a, b) * 180) / Math.PI,
        'Usa la tangente inversa de altura dividida entre distancia horizontal.',
      ),
      n(
        'Otro mástil de altura doble se sujeta con el mismo ángulo. ¿A qué distancia de su pie queda el anclaje?',
        2 * b,
        'La semejanza duplica también la distancia horizontal.',
      ),
      n(
        'Con el primer mástil, ¿cuánto cable adicional haría falta al alejar el anclaje tres metros del pie?',
        Math.hypot(a, b + 3) - Math.hypot(a, b),
        'Calcula la nueva hipotenusa y réstale la anterior.',
      ),
      e(
        'Explica por qué esta estimación puede quedarse corta para un cable real.',
        'El modelo usa un segmento recto y no contempla curvatura ni material para la sujeción.',
      ),
    ],
  }),
  'Distancias y ángulos en el espacio': (a, b) => ({
    stem: `Una estructura tiene vértices $A=(0,0,0)$, $B=(${b},0,0)$ y $C=(${b},${a},${a + 1})$. Las coordenadas están en centímetros.`,
    tasks: [
      n('Halla la longitud AB.', b, 'Los puntos difieren solo en la abscisa.'),
      n(
        'Calcula la longitud BC.',
        Math.hypot(a, a + 1),
        'Aplica Pitágoras a las diferencias en las otras dos coordenadas.',
      ),
      n(
        'Halla la longitud de la diagonal AC.',
        Math.hypot(b, a, a + 1),
        'Suma los cuadrados de las tres diferencias y toma la raíz cuadrada.',
      ),
      n(
        'Calcula el ángulo BAC en grados.',
        (Math.atan2(Math.hypot(a, a + 1), b) * 180) / Math.PI,
        'El triángulo es rectángulo en B. La tangente del ángulo en A es BC/AB.',
      ),
      e(
        'Justifica que el ángulo en B es recto sin recurrir a la apariencia de un dibujo.',
        'La distancia AC al cuadrado es igual a AB al cuadrado más BC al cuadrado. Aplica el recíproco de Pitágoras.',
      ),
    ],
  }),
  'Área y volumen de sólidos': (a, b) => ({
    stem: `Un cilindro cerrado tiene radio interior ${a} cm y altura interior ${b} cm. Desprecia el grosor de la pared.`,
    tasks: [
      n(
        'Calcula el área de una base.',
        Math.PI * a * a,
        'Aplica el área del círculo.',
      ),
      n(
        'Halla la capacidad en litros.',
        (Math.PI * a * a * b) / 1000,
        'Multiplica el área de la base por la altura y convierte centímetros cúbicos a litros.',
      ),
      n(
        'Calcula el área exterior total.',
        2 * Math.PI * a * (a + b),
        'Suma el área lateral y las dos bases.',
      ),
      n(
        'Manteniendo el volumen, se duplica el radio. Calcula la nueva altura.',
        b / 4,
        'El área de la base se cuadruplica, por lo que la altura se divide entre cuatro.',
      ),
      n(
        '¿Cuál sería el área total del cilindro modificado?',
        4 * Math.PI * a * (2 * a + b / 4),
        'Sustituye el radio y la altura modificados en la fórmula de área total.',
      ),
    ],
  }),
  'Sectores circulares y sólidos': (a, b) => {
    const R = a + b,
      deg = 30 + 5 * a,
      r = R * (1 - deg / 360),
      h = Math.sqrt(R * R - r * r)
    return {
      stem: `Se retira un sector de ${deg} grados de un disco de radio ${R} cm. Se unen los bordes rectos del sector restante para formar un cono.`,
      tasks: [
        n(
          'Halla la longitud del arco retirado.',
          (2 * Math.PI * R * deg) / 360,
          'Toma la fracción del perímetro correspondiente al ángulo.',
        ),
        n(
          'Halla la circunferencia de la base del cono.',
          2 * Math.PI * r,
          'Resta el arco retirado al perímetro del disco.',
        ),
        n(
          'Halla el radio de la base del cono.',
          r,
          'Iguala el arco restante a dos pi por el radio de la base.',
        ),
        n(
          'Calcula la altura perpendicular del cono.',
          h,
          'Usa la generatriz, que es el radio del disco original, y aplica Pitágoras.',
        ),
        n(
          'Calcula el volumen que cabe en este cono.',
          (Math.PI * r * r * h) / 3,
          'Multiplica el área de la base por un tercio de la altura perpendicular.',
        ),
      ],
    }
  },
}
