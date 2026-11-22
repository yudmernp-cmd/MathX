import { fmt, sum, near, result } from './series.mjs'
const sources = [
  [
    'perimeter-width',
    (a, b) => [
      `Rectángulo de perímetro ${2 * (a + b)} m y ancho ${a} m.`,
      a * b,
      a * ((2 * (a + b)) / 2 - a),
    ],
  ],
  [
    'triangle-height',
    (a, b) => [
      `Triángulo de base ${b} m y altura perpendicular ${a} m.`,
      (a * b) / 2,
      b * (a / 2),
    ],
  ],
  [
    'trapezium',
    (a, b) => [
      `Trapecio de bases ${b} m y ${b + a} m separadas ${a} m.`,
      ((2 * b + a) * a) / 2,
      a * b + (a * a) / 2,
    ],
  ],
  [
    'disc',
    (a, b) => [
      `Círculo de diámetro ${2 * a + b} m.`,
      Math.PI * (a + b / 2) ** 2,
      (Math.PI * (2 * a + b) ** 2) / 4,
    ],
  ],
  [
    'annulus',
    (a, b) => [
      `Corona circular de radio interior ${a} m y radio exterior ${a + b} m.`,
      Math.PI * ((a + b) ** 2 - a ** 2),
      Math.PI * b * (2 * a + b),
    ],
  ],
  [
    'sector-arc',
    (a, b) => [
      `Sector circular de radio ${b} m y longitud de arco ${a} m.`,
      (b * a) / 2,
      Math.PI * b * b * (a / (2 * Math.PI * b)),
    ],
  ],
  [
    'kite',
    (a, b) => [
      `Cometa con diagonales perpendiculares de ${2 * a} m y ${b} m.`,
      a * b,
      (2 * a * b) / 2,
    ],
  ],
  [
    'two-sides-angle',
    (a, b) => [
      `Triángulo con lados ${a} m y ${b} m y ángulo comprendido de 60°.`,
      (a * b * Math.sqrt(3)) / 4,
      (a * b * Math.sin(Math.PI / 3)) / 2,
    ],
  ],
]
export const land = {
  title: 'Superficies y escalas',
  columns: ['Zona', 'Medidas'],
  sources,
  methods: [
    'Resta el ancho al semiperímetro para hallar el largo y multiplica ambas dimensiones.',
    'Multiplica la base por la altura perpendicular y divide entre dos.',
    'Multiplica la media de las dos bases por la altura del trapecio.',
    'Divide el diámetro entre dos y aplica $A=\\pi r^2$.',
    'Resta el área del círculo interior a la del exterior.',
    'Con longitud de arco $s$ y radio $r$, el área del sector es $rs/2$.',
    'Multiplica las diagonales perpendiculares y divide entre dos.',
    'Usa $A=ab\\sin(60^\\circ)/2$ con los dos lados dados.',
  ],
  goals: [
    'total-area',
    'paving-cost',
    'scaled-drawing',
    'cover-pack-ceiling',
    'inverse-area-gain',
    'fixed-border-and-scaling',
    'water-depth',
    'inverse-coverage-rate',
    'scale-except-first',
  ],
  build(rows, goal, a, b) {
    const area = sum(rows.map((r) => r.value)),
      ref = sum(rows.map((r) => r.ref))
    const stem =
      'Un parque se divide en zonas que no se solapan. La tabla describe por completo sus superficies.'
    const steps = [
      `Aplica la fórmula de área de cada figura. En el orden de la tabla, las áreas en m² son aproximadamente ${rows.map((r) => fmt(r.value)).join(', ')}.`,
      `La superficie conjunta es ${fmt(area)} m².`,
    ]
    let q
    switch (goal) {
      case 0:
        q = result(
          '¿Cuál es la superficie total del parque, en metros cuadrados?',
          area,
          'm²',
          steps,
          (x) => near(x, ref),
        )
        break
      case 1:
        q = result(
          `¿Cuántos soles cuesta cubrir el parque a ${a} soles por metro cuadrado?`,
          a * area,
          'PEN',
          [
            ...steps,
            `Multiplica la superficie conjunta por ${a} soles por m².`,
          ],
          (x) => near(x / a, ref),
        )
        break
      case 2:
        q = result(
          `¿Qué área en centímetros cuadrados ocupa el parque en un plano a escala 1 a ${100 * a}?`,
          area / a ** 2,
          'cm²',
          [
            ...steps,
            `Un cm de plano representa ${a} m reales. Divide la superficie real en m² por ${a * a}.`,
          ],
          (x) => near(x * a * a, ref),
        )
        break
      case 3: {
        const c = b + 4,
          n = Math.ceil(area / c)
        q = result(
          `Cada paquete de césped cubre ${c} m². Los recortes pueden reutilizarse entre zonas. ¿Cuántos paquetes completos deben comprarse como mínimo?`,
          n,
          '',
          [
            ...steps,
            `Divide el área por ${c}. Redondea al entero superior para cubrir toda la superficie.`,
          ],
          (x) =>
            Number.isInteger(x) && (x - 1) * c < ref && x * c >= ref - 1e-9,
        )
        break
      }
      case 4: {
        const gain = a * b,
          k = Math.sqrt(1 + gain / area)
        q = result(
          `Todas las longitudes del parque se ampliarán con el mismo factor. ¿Qué factor lineal hace falta para ganar exactamente ${gain} m² de superficie?`,
          k,
          '',
          [
            ...steps,
            `Con factor lineal $k$, el incremento de área es $(k^2-1)A=${gain}$.`,
            'Despeja la raíz positiva.',
          ],
          (x) => x > 1 && near((x * x - 1) * ref, gain),
        )
        break
      }
      case 5: {
        const price = a + 2,
          available = Math.ceil(area * price * 1.6) + b
        q = result(
          `Una obra cobra ${b} soles fijos más ${price} soles por m² de superficie final. Todas las longitudes se multiplicarán por el mismo factor. Con ${available} soles, ¿cuál es el mayor factor lineal posible?`,
          Math.sqrt((available - b) / (price * area)),
          '',
          [
            ...steps,
            `Descuenta el coste fijo y divide lo disponible entre ${price} para hallar el área máxima financiable.`,
            'La razón de áreas es el cuadrado de la escala lineal. Toma la raíz positiva de esa razón.',
          ],
          (x) => x > 0 && near(b + price * ref * x * x, available),
        )
        break
      }

      case 6:
        q = result(
          `Llueven ${a} mm de manera uniforme. Si se recoge toda el agua sobre el parque, ¿cuántos litros se obtienen?`,
          area * a,
          'L',
          [
            ...steps,
            'Un milímetro de agua sobre un metro cuadrado equivale a un litro.',
            `Multiplica el área en m² por la altura de lluvia en mm.`,
          ],
          (x) => near(x / 1000, (ref * a) / 1000),
        )
        break
      case 7: {
        const water = b * 100
        q = result(
          `Se reparten ${water} litros de agua uniformemente por todas las zonas. ¿Qué lámina de agua, en milímetros, recibe el parque?`,
          water / area,
          'mm',
          [
            ...steps,
            `Divide los ${water} litros por el área en m² para hallar litros por m².`,
            'Un litro sobre un metro cuadrado produce una lámina de un milímetro.',
          ],
          (x) => near(x * ref, water),
        )
        break
      }
      case 8: {
        const first = rows[0].value,
          rest = area - first
        q = result(
          `La primera zona conservará sus dimensiones. Las demás se redimensionarán con un mismo factor lineal hasta que juntas ocupen ${a} veces el área de la primera. ¿Qué factor se aplicará?`,
          Math.sqrt((a * first) / rest),
          '',
          [
            ...steps,
            `Resta la primera superficie del total. La superficie objetivo de las demás es ${a} veces la primera.`,
            'Divide el objetivo por el área actual de esas zonas y toma la raíz cuadrada.',
          ],
          (x) => x > 0 && near(x * x * (ref - rows[0].ref), a * rows[0].ref),
        )
        break
      }
    }
    return { stem, ...q }
  },
}
