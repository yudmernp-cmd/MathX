import { entry as E, item, close, f } from './model.mjs'
const radians = (deg) => (deg * Math.PI) / 180
export const geometry = [
  E(
    'Escala y superficie',
    'Fácil',
    'm²',
    ['area-scale', 'map-area', 'length-scale'],
    (a, b) =>
      item(
        `Un plano a escala 1 : ${100 * a} muestra un terreno cuya superficie en el plano es ${b} cm².`,
        '¿Cuál es la superficie real en metros cuadrados?',
        b * a * a,
        [
          `Un centímetro del plano representa ${a} metros reales.`,
          `Cada centímetro cuadrado representa un cuadrado real de ${a} m de lado. Aplica ese factor al área del plano.`,
        ],
        (x) => close((x * 10000) / (100 * a) ** 2, b),
      ),
  ),
  E(
    'Inclinación',
    'Fácil',
    '°',
    ['angle', ['right-triangle', 'rise', 'run']],
    (a, b) =>
      item(
        `Una rampa recta salva ${a} m de desnivel en una distancia horizontal de ${b} m.`,
        '¿Qué ángulo forma con la horizontal, en grados?',
        (Math.atan(a / b) * 180) / Math.PI,
        [
          `Para el ángulo de la rampa, la tangente es la elevación dividida por el recorrido horizontal, $${a}/${b}$.`,
          'Aplica la tangente inversa en modo grados.',
        ],
        (x) => x > 0 && x < 90 && close(b * Math.tan(radians(x)), a),
      ),
  ),
  E(
    'Capacidad de sólidos',
    'Fácil',
    'L',
    ['capacity', ['cylinder', 'diameter', 'height']],
    (a, b) =>
      item(
        `El diámetro interior de un recipiente cilíndrico es de ${2 * a} cm y su profundidad útil es de ${b} cm.`,
        '¿Cuántos litros caben en el recipiente?',
        (Math.PI * a * a * b) / 1000,
        [
          `El radio es la mitad del diámetro, ${a} cm. La base tiene área $${a * a}\\pi$ cm².`,
          `Multiplica por la profundidad ${b} y divide por 1000 para pasar de cm³ a litros.`,
        ],
        (x) => close((x * 1000) / b, (Math.PI * (2 * a) ** 2) / 4),
      ),
  ),
  E(
    'Rumbos y distancias',
    'Medio',
    'km',
    ['third-side', ['cosine-rule', 'included-angle']],
    (a, b) => {
      const angle = 30 + 5 * a,
        u = b + 4,
        v = b,
        d = Math.sqrt(u * u + v * v - 2 * u * v * Math.cos(radians(angle)))
      return item(
        `Dos barcos parten del mismo puerto. Uno recorre ${u} km con rumbo 020° y el otro ${v} km con rumbo ${String(20 + angle).padStart(3, '0')}°. Ambos siguen trayectorias rectas.`,
        '¿Qué distancia en kilómetros separa sus posiciones finales?',
        d,
        [
          `La diferencia de rumbos da un ángulo comprendido de ${angle}°.`,
          `Aplica el teorema del coseno: $d^2=${u}^2+${v}^2-2(${u})(${v})\\cos(${angle}^\\circ)$.`,
        ],
        (x) =>
          close(
            x,
            Math.hypot(
              u - v * Math.cos(radians(angle)),
              v * Math.sin(radians(angle)),
            ),
          ),
      )
    },
  ),
  E(
    'Mediatrices y Voronoi',
    'Medio',
    '',
    ['line-intersection', ['perpendicular-bisector', 'sites'], 'axis'],
    (a, b) => {
      const x = (b * b + a * a) / (2 * b)
      return item(
        `En un mapa, dos centros de salud se ubican en $A=(0,0)$ y $B=(${b},${a})$. Una carretera coincide con el eje horizontal y la distancia se mide en línea recta.`,
        '¿Cuál es la abscisa del punto de la carretera equidistante de los centros?',
        x,
        [
          `Un punto de la carretera tiene coordenadas $(x,0)$. Sus distancias al cuadrado son $x^2$ y $(x-${b})^2+${a}^2$.`,
          'Iguala las expresiones. Los términos cuadráticos se cancelan y queda una ecuación lineal.',
        ],
        (v) => close(Math.abs(v), Math.hypot(v - b, a)),
      )
    },
  ),
  E(
    'Semejanza espacial',
    'Medio',
    'm²',
    ['area-ratio', ['volume-ratio', 'similar-solids']],
    (a, b) => {
      const V = b * 10,
        S = b * 20,
        k = (a + 1) / a
      return item(
        `Dos depósitos son geométricamente semejantes. El pequeño tiene volumen ${V} m³ y área exterior ${S} m². El volumen del grande es $(${a + 1}/${a})^3$ veces el del pequeño.`,
        '¿Cuál es el área exterior del depósito grande, en metros cuadrados?',
        S * k * k,
        [
          `La escala lineal es la raíz cúbica de la razón de volúmenes, $${a + 1}/${a}$.`,
          `Las áreas varían con el cuadrado de la escala. Multiplica ${S} por ese cuadrado.`,
        ],
        (x) => x > 0 && close((x / S) ** 1.5, k ** 3),
      )
    },
  ),
  E(
    'Medición indirecta',
    'Difícil',
    'm',
    ['height', ['triangulation', 'two-elevations', 'baseline']],
    (a, b) => {
      const first = 25 + a,
        second = first + 15,
        t = Math.tan(radians(first)),
        u = Math.tan(radians(second)),
        h = (b * t * u) / (u - t)
      return item(
        `Desde dos puntos de un terreno horizontal, situados en la misma recta y al mismo lado del pie de una torre, los ángulos de elevación son de ${second}° y ${first}°. Los puntos distan ${b} m y los ángulos se miden desde el suelo.`,
        '¿Qué altura tiene la torre, en metros?',
        h,
        [
          `Si $x$ es la distancia desde el punto cercano, $h=x\\tan(${second}^\\circ)$.`,
          `Desde el lejano, $h=(x+${b})\\tan(${first}^\\circ)$.`,
          'Expresa ambas distancias mediante la altura y utiliza su diferencia conocida para despejarla.',
        ],
        (x) => x > 0 && close(x / t - x / u, b),
      )
    },
  ),
  E(
    'Desarrollo de un cono',
    'Difícil',
    'cm³',
    ['volume', ['cone', ['sector-arc', 'slant-radius']]],
    (a, b) => {
      const angle = 90 + 5 * a,
        r = (b * angle) / 360,
        h = Math.sqrt(b * b - r * r)
      return item(
        `Un sector circular de radio ${b} cm y ángulo central ${angle}° se enrolla uniendo sus radios, sin solapamiento. El arco forma la circunferencia de la base de un cono.`,
        '¿Qué volumen encierra el cono, en centímetros cúbicos?',
        (Math.PI * r * r * h) / 3,
        [
          `Iguala la longitud del arco a la circunferencia de la base: $2\\pi r=2\\pi(${b})(${angle}/360)$.`,
          `La generatriz mide ${b} cm. La altura es $h=\\sqrt{${b}^2-r^2}$.`,
          'Sustituye radio y altura en $V=\\pi r^2h/3$.',
        ],
        (x) =>
          x > 0 && close(((3 * x) / (Math.PI * r * r)) ** 2 + r * r, b * b),
      )
    },
  ),
  E(
    'Cobertura de tres estaciones',
    'Difícil',
    'km',
    ['circumradius', ['three-sites', 'isosceles']],
    (a, b) => {
      const h = b + a,
        k = (h * h - a * a) / (2 * h)
      return item(
        `Tres estaciones están en $A=(-${a},0)$, $B=(${a},0)$ y $C=(0,${h})$, con distancias en kilómetros. Se busca el punto de encuentro equidistante de las tres.`,
        '¿A qué distancia en kilómetros está ese punto de cada estación?',
        h - k,
        [
          'Por simetría el punto tiene coordenadas $(0,y)$.',
          `Iguala las distancias al cuadrado a A y C: $${a}^2+y^2=(${h}-y)^2$.`,
          `Al simplificar se obtiene $y=${f(k)}$ aproximadamente. La distancia a C es $${h}-y$.`,
        ],
        (x) => x > 0 && close(x, Math.hypot(a, h - x)),
      )
    },
  ),

  E(
    'Longitud de un arco',
    'Fácil',
    'cm',
    ['arc', 'angular-fraction', 'radius'],
    (a, b) => {
      const angle = 15 * a
      return item(
        `La punta de un limpiaparabrisas está a ${b} cm de su eje y barre un ángulo de ${angle}° en una pasada.`,
        '¿Qué distancia recorre la punta en esa pasada, en centímetros?',
        (2 * Math.PI * b * angle) / 360,
        [
          `La punta describe la fracción $${angle}/360$ de una circunferencia.`,
          `Multiplica esa fracción por el perímetro $2\\pi\\cdot${b}$.`,
        ],
        (x) => close(x / b, radians(angle)),
      )
    },
  ),
  E(
    'Ángulo en el espacio',
    'Medio',
    '°',
    ['elevation', ['space-diagonal', 'base-diagonal']],
    (a, b) =>
      item(
        `Una caja ortogonal tiene una base de ${a} por ${b} cm y una altura de ${a + 2} cm. Un cordón recto une dos vértices opuestos de la caja.`,
        '¿Qué ángulo, en grados, forma el cordón con el plano de la base?',
        (Math.atan((a + 2) / Math.hypot(a, b)) * 180) / Math.PI,
        [
          `La proyección del cordón mide $\\sqrt{${a}^2+${b}^2}$ cm.`,
          `La tangente del ángulo es la altura ${a + 2} dividida por esa proyección. Aplica la inversa en grados.`,
        ],
        (x) =>
          x > 0 &&
          x < 90 &&
          close(Math.sin(radians(x)), (a + 2) / Math.hypot(a, b, a + 2)),
      ),
  ),
  E(
    'Secciones de un depósito',
    'Difícil',
    'm',
    ['depth', ['similar-cones', 'partial-volume']],
    (a, b) => {
      const r = a,
        h = b,
        v = (Math.PI * r * r * h) / 24
      return item(
        `Un depósito cónico se sostiene con el vértice hacia abajo. Su altura es ${h} m y el radio del borde superior es ${r} m. Contiene $${r * r * h}\\pi/24$ m³ de agua.`,
        '¿Qué profundidad alcanza el agua medida desde el vértice, en metros?',
        h / 2,
        [
          `A profundidad $d$, el radio del agua es $${r}d/${h}$ por semejanza.`,
          'Sustituye ese radio en el volumen del cono $V=\\pi r_d^2d/3$.',
          'Despeja la raíz cúbica positiva para hallar la profundidad.',
        ],
        (x) => x > 0 && close((Math.PI * ((r * x) / h) ** 2 * x) / 3, v),
      )
    },
  ),
]
