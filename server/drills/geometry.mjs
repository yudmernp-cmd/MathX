import { form, sub, root, frac, row, fmt, line } from './math.mjs'
const deg = (n) => fmt((n * 180) / Math.PI) + '^\\circ'
export const geometry = [
  sub('Geometría 3D', {
    distancia_3d: ({ a, b, k, n }) =>
      form(
        'Calcula la distancia AB.',
        `A=${row(a, -b, k)},\\ B=${row(a + k, b, n + k)}`,
        root(k * k + 4 * b * b + n * n),
        `B-A=${row(k, 2 * b, n)}`,
        `AB=\\sqrt{${k}^2+${2 * b}^2+${n}^2}`,
      ),
    punto_medio_3d: ({ a, b, k, n }) =>
      form(
        'Halla el punto medio de AB.',
        `A=${row(-a, b, n)},\\ B=${row(k, n, -b)}`,
        row(frac(k - a, 2), frac(n + b, 2), frac(n - b, 2)),
        'M=(A+B)/2',
        `A+B=${row(k - a, n + b, n - b)}`,
      ),
    angulo_recta_plano: ({ a, b, k }) =>
      form(
        'Calcula en grados el ángulo de la diagonal espacial con la base.',
        `[Prisma rectangular de base ${a} por ${b} y altura ${k}.]`,
        deg(Math.atan(k / Math.hypot(a, b))),
        `d=\\sqrt{${a}^2+${b}^2}`,
        `\\theta=\\arctan(${k}/d)`,
      ),
  }),
  sub('Trigonometría de triángulos', {
    sohcahtoa_lado: ({ a, b, level }) =>
      level < 3
        ? form(
            'Calcula el cateto opuesto al ángulo indicado.',
            '[Triángulo rectángulo con ángulo de 30° e hipotenusa ' +
              (a + b) +
              '.]',
            frac(a + b, 2),
            'u/h=\\sin30^\\circ',
            'u=h/2',
          )
        : form(
            'Halla el cateto mayor.',
            '[Triángulo rectángulo con ángulo de 30° y suma de hipotenusa y cateto menor igual a ' +
              3 * a +
              '.]',
            a + '\\sqrt{3}',
            'u=h\\sin30^\\circ=h/2,\\quad 3h/2=' + 3 * a,
            'v=h\\cos30^\\circ=' + 2 * a + '\\sqrt{3}/2',
          ),
    ley_senos_angulo: ({ a, b }) =>
      form(
        'Calcula el ángulo agudo B en grados.',
        '[Triángulo ABC con A = 30°, BC = ' + (a + b) + ' y AC = ' + a + '.]',
        deg(Math.asin(a / (2 * (a + b)))),
        '\\sin B=AC\\sin A/BC',
        'B=\\arcsin(' + frac(a, 2 * (a + b)) + ')',
      ),
    ley_cosenos_angulo: ({ a, b, k }) => {
      const c = Math.max(a, b) + Math.min(k, a - 1, b - 1)
      const cosine = frac(a * a + b * b - c * c, 2 * a * b)
      return form(
        'Calcula el ángulo C en grados.',
        '[Triángulo ABC con AC = ' + a + ', BC = ' + b + ' y AB = ' + c + '.]',
        deg(Math.acos((a * a + b * b - c * c) / (2 * a * b))),
        '\\cos C=(AC^2+BC^2-AB^2)/(2AC\\cdot BC)',
        'C=\\arccos(' + cosine + ')',
      )
    },
    pitagoras: ({ a, b }) =>
      form(
        'Halla el segundo cateto.',
        `[Triángulo rectángulo de hipotenusa ${a + b} y cateto ${a}.]`,
        root((a + b) ** 2 - a * a),
        `v^2=${a + b}^2-${a}^2`,
        `v=\\sqrt{${(a + b) ** 2 - a * a}}`,
      ),
    sohcahtoa_angulo: ({ a, b }) =>
      form(
        'Calcula el ángulo en grados.',
        `[Triángulo rectángulo con cateto opuesto ${a} y cateto adyacente ${b} respecto al ángulo buscado.]`,
        deg(Math.atan(a / b)),
        `\\tan\\theta=${frac(a, b)}`,
        '\\theta=\\arctan(\\tan\\theta),\\quad 0<\\theta<90^\\circ',
      ),
    ley_cosenos_lado: ({ a, b }) =>
      form(
        'Halla el lado opuesto al ángulo indicado.',
        `[Triángulo con lados ${a} y ${b} que forman un ángulo de 60°.]`,
        root(a * a + b * b - a * b),
        'c^2=a^2+b^2-2ab\\cos60^\\circ',
        `c^2=${a * a + b * b - a * b}`,
      ),
    ley_senos_lado: ({ a, b }) =>
      form(
        'Calcula AC.',
        `[Triángulo ABC con A = 30°, B = 45° y BC = ${a + b}.]`,
        `${a + b}\\sqrt{2}`,
        `AC/\\sin45^\\circ=${a + b}/\\sin30^\\circ`,
        '\\sin45^\\circ/\\sin30^\\circ=\\sqrt2',
      ),
    area_triangulo: ({ a, b }) =>
      form(
        'Calcula el área exacta.',
        `[Triángulo con lados ${a} y ${b} que forman un ángulo de 30°.]`,
        frac(a * b, 4),
        'K=ab\\sin(30^\\circ)/2',
        `K=${a}\\cdot${b}/4`,
      ),
  }),
  sub('Trigonometría aplicada', {
    bearing_a_rumbo: ({ a, b, flip }) => {
      const v = 1 + ((a + b) % 89)
      return form(
        'Convierte el azimut a rumbo cuadrantal.',
        `\\alpha=${flip ? 180 + v : 360 - v}^\\circ`,
        flip ? `S\\,${v}^\\circ\\,O` : `N\\,${v}^\\circ\\,O`,
        flip
          ? '180^\\circ<\\alpha<270^\\circ'
          : '270^\\circ<\\alpha<360^\\circ',
        flip
          ? `\\alpha-180^\\circ=${v}^\\circ`
          : `360^\\circ-\\alpha=${v}^\\circ`,
      )
    },
    angulo_elevacion: ({ a, b, k }) =>
      form(
        'Calcula el ángulo de elevación en grados.',
        `[Visual entre cotas ${k} y ${a + k}, separadas horizontalmente por ${b}.]`,
        deg(Math.atan(a / b)),
        `\\Delta z=${a + k}-${k}=${a}`,
        `\\theta=\\arctan(${a}/${b})`,
      ),
    angulo_depresion: ({ a, b, k }) =>
      form(
        'Calcula el ángulo de depresión en grados.',
        `[Visual descendente de longitud ${a + b} y desnivel vertical ${b}.]`,
        deg(Math.asin(b / (a + b))),
        `\\sin\\theta=${frac(b, a + b)}`,
        '\\theta=\\arcsin(\\sin\\theta),\\quad 0<\\theta<90^\\circ',
      ),
    desplazamiento_bearing: ({ a, b }) =>
      form(
        'Halla la componente este total, con el este positivo.',
        `(d_1,\\alpha_1)=(${a},030^\\circ),\\quad(d_2,\\alpha_2)=(${b},270^\\circ)`,
        frac(a - 2 * b, 2),
        `E_1=${a}\\sin30^\\circ,\\ E_2=${b}\\sin270^\\circ`,
        `E=${a}/2-${b}`,
      ),
  }),
  sub('Arco y sector', {
    longitud_arco: ({ a, k }) =>
      form(
        'Calcula la longitud del arco.',
        `r=${a},\\quad\\theta=\\pi/${k}\\;\\mathrm{rad}`,
        `${frac(a, k)}\\pi`,
        's=r\\theta',
        `s=${a}\\pi/${k}`,
      ),
    area_sector: ({ a, k }) =>
      form(
        'Calcula el área del sector.',
        `r=${a},\\quad\\theta=\\pi/${k}\\;\\mathrm{rad}`,
        `${frac(a * a, 2 * k)}\\pi`,
        'A=r^2\\theta/2',
        `A=${a}^2\\pi/${2 * k}`,
      ),
    radio_desde_arco: ({ a, k }) =>
      form(
        'Halla el radio.',
        `s=${a}\\pi,\\quad\\theta=\\pi/${k}\\;\\mathrm{rad}`,
        a * k,
        'r=s/\\theta',
        `r=${a}\\pi/(\\pi/${k})`,
      ),
    angulo_desde_area_sector: ({ a, k }) =>
      form(
        'Calcula el ángulo central en radianes.',
        `A=${a * k}\\pi,\\quad r=${a}`,
        `${frac(2 * k, a)}\\pi`,
        '\\theta=2A/r^2',
        `\\theta=2\\cdot${a * k}\\pi/${a}^2`,
      ),
  }),
  sub('Mediatriz', {
    ecuacion_bisectriz: ({ a, b, k }) =>
      form(
        'Halla la ecuación de la mediatriz de AB.',
        `A=${row(a - k, b - 1)},\\ B=${row(a + k, b + 1)}`,
        line(-k, b + k * a),
        `M=${row(a, b)},\\ m_{\\perp}=-${k}`,
        `y-${b}=-${k}(x-${a})`,
      ),
    punto_medio_y_pendiente: ({ a, b, k, n }) =>
      form(
        'Calcula la pendiente de la mediatriz de AB.',
        `A=${row(a, b)},\\ B=${row(a + k, b + n)}`,
        frac(-k, n),
        `m_{AB}=${frac(n, k)}`,
        'm_{\\perp}=-1/m_{AB}',
      ),
    interseccion_bisectriz: ({ a, b, k }) =>
      form(
        'Halla la abscisa donde la mediatriz corta el eje horizontal.',
        `A=${row(a - 1, b - k)},\\ B=${row(a + 1, b + k)}`,
        a + k * b,
        `y-${b}=-(x-${a})/${k}`,
        'y=0',
      ),
  }),
  sub('Diagramas de Voronoi', {
    vecino_mas_cercano: ({ a, b, k, flip }) => {
      const pts = flip
        ? [
            [a + k, b],
            [a, b + 1],
            [a - 2 * k, b],
          ]
        : [
            [a, b + 1],
            [a + k, b],
            [a - 2 * k, b],
          ]
      return form(
        'Identifica el sitio más cercano a P.',
        `P=${row(a, b)},\\ A=${row(...pts[0])},\\ B=${row(...pts[1])},\\ C=${row(...pts[2])}`,
        flip ? 'B' : 'A',
        `(PA^2,PB^2,PC^2)=${row(flip ? k * k : 1, flip ? 1 : k * k, 4 * k * k)}`,
        '\\min d^2=1',
      )
    },
    distancia_a_sitio: ({ a, b, k, n }) =>
      form(
        'Calcula la distancia del vértice de Voronoi al sitio A.',
        `A=${row(a, b)},\\ B=${row(a + 2 * k, b)},\\ C=${row(a, b + 2 * n)}`,
        root(k * k + n * n),
        `V=${row(a + k, b + n)}`,
        `VA=\\sqrt{${k}^2+${n}^2}`,
      ),
    interpretar_regiones: ({ a, b, k }) =>
      form(
        'Calcula la abscisa de la frontera entre las dos celdas.',
        `A=${row(a, b)},\\ B=${row(a + 2 * k, b)}`,
        a + k,
        'PA^2=PB^2',
        `x=(${a}+${a + 2 * k})/2`,
      ),
  }),
]
