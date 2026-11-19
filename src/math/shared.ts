import { fmt, numberPart as n, review, type Family } from './model'

export const shared: Family[] = [
  {
    id: 'muestras',
    theme: 'Estadística y probabilidad',
    topic: 'Estadística descriptiva',
    courses: ['MAI', 'MAE'],
    make(r, v, level) {
      const m = r(8, 18),
        d = r(2, 5),
        a = r(2, 5),
        b = 2 * r(1, 4) + 1,
        total = 2 * a + b,
        extra = m + total,
        spread = 2 * a * d * d
      const hidden = v ? '?' : b
      return {
        stem: `Un grupo registra sus tiempos de espera en minutos. ${v ? 'El total de observaciones es ' + total + '.' : 'La tabla recoge todas las observaciones.'} Utiliza la varianza poblacional.`,
        figure: {
          type: 'table',
          headers: ['Tiempo (min)', 'Frecuencia'],
          rows: [
            [m - d, a],
            [m, hidden],
            [m + d, a],
          ],
        },
        tasks: [
          v
            ? n(
                'Recupera la frecuencia que falta.',
                b,
                [`Resta las dos frecuencias conocidas a ${total}.`],
                ['Usa la suma de frecuencias.'],
              )
            : level === 'Básico'
              ? n(
                  'Calcula el tamaño del grupo.',
                  total,
                  ['Suma las tres frecuencias.'],
                  ['Suma observaciones con su multiplicidad.'],
                )
              : n(
                  'Halla la probabilidad de que dos estudiantes distintos elegidos al azar hayan esperado el tiempo mínimo.',
                  (a * (a - 1)) / (total * (total - 1)),
                  [`Multiplica $${a}/${total}$ por $${a - 1}/${total - 1}$.`],
                  ['Ajusta ambas cantidades tras la primera elección.'],
                ),
          level === 'Avanzado'
            ? n(
                `Se incorpora un estudiante que esperó ${extra} minutos. Calcula la nueva media.`,
                (m * total + extra) / (total + 1),
                [
                  `La simetría da media original ${m}. Añade ${extra} a la suma y divide entre ${total + 1}.`,
                ],
                ['Actualiza suma y tamaño del grupo.'],
              )
            : n(
                'Calcula la media de la tabla original.',
                m,
                [`La suma ponderada es ${m * total}. Divide entre ${total}.`],
                ['Pondera por las frecuencias.'],
              ),
          n(
            'Calcula la varianza de la distribución original en minutos cuadrados.',
            spread / total,
            [
              `Las desviaciones son $-${d},0,${d}$. La suma ponderada de sus cuadrados es ${spread}. Divide por ${total}.`,
            ],
            [
              'Obtiene las desviaciones cuadráticas respecto a la media.',
              'Pondera y normaliza por el total.',
            ],
          ),
          n(
            'Dos mediciones independientes siguen la distribución original. Halla la probabilidad de que coincidan.',
            (2 * a * a + b * b) / total ** 2,
            [
              `Para cada tiempo eleva su frecuencia relativa al cuadrado. Suma los tres casos disjuntos: $(2·${a}^2+${b}^2)/${total}^2$.`,
            ],
            [
              'Enumera los valores posibles.',
              'Usa independencia para cada coincidencia.',
              'Suma sucesos disjuntos.',
            ],
          ),
          review(
            `A la tabla original se añade un tiempo de ${extra} minutos. Compara la sensibilidad de la media y de la mediana a este nuevo valor.`,
            [
              `La media aumenta a ${fmt((m * total + extra) / (total + 1))}. Las dos posiciones centrales siguen dentro del bloque de ${m} minutos. La mediana sigue siendo ${m}.`,
            ],
            [
              'Identifica las posiciones centrales tras ordenar la muestra ampliada.',
              'Determina el efecto sobre la mediana.',
              'Justifica el aumento de la media con la suma.',
            ],
          ),
        ],
      }
    },
  },
  {
    id: 'condicional',
    theme: 'Estadística y probabilidad',
    topic: 'Probabilidad condicionada',
    courses: ['MAI', 'MAE'],
    make(r, v, level) {
      const a = r(2, 7),
        b = r(2, 6),
        c = r(3, 8),
        d = r(3, 7),
        yes = a + c,
        T = a + b + c + d
      return {
        stem: `Una encuesta clasifica a los ${T} participantes por turno y por uso de bicicleta. Se selecciona una persona al azar.`,
        figure: {
          type: 'table',
          headers: ['Turno', 'Usa bicicleta', 'No usa'],
          rows: [
            ['Mañana', a, b],
            ['Tarde', v ? '?' : c, d],
          ],
        },
        tasks: [
          v
            ? n(
                'Completa la frecuencia que falta.',
                c,
                [`Del total resta ${a}, ${b} y ${d}.`],
                ['Usa el total de la tabla.'],
              )
            : n(
                level === 'Básico'
                  ? 'Halla la probabilidad de que la persona use bicicleta.'
                  : 'Si usa bicicleta, halla la probabilidad de que asista por la mañana.',
                level === 'Básico' ? yes / T : a / yes,
                [
                  `Hay ${yes} ciclistas, de los cuales ${a} van por la mañana. Divide los casos favorables por el tamaño del grupo indicado.`,
                ],
                ['Elige el espacio muestral adecuado.'],
              ),
          level === 'Avanzado'
            ? n(
                'Se eligen dos personas distintas. Sabiendo que ambas usan bicicleta, halla la probabilidad de que tengan turnos distintos.',
                (2 * a * c) / (yes * (yes - 1)),
                [
                  `Entre ciclistas hay dos órdenes posibles: usa $2·${a}·${c}/(${yes}·${yes - 1})$.`,
                ],
                ['Cuenta sin reemplazo en la población condicionada.'],
              )
            : n(
                v
                  ? 'Sabiendo que asiste por la mañana, halla la probabilidad de que use bicicleta.'
                  : 'Halla la probabilidad de que asista por la tarde o use bicicleta (o ambas).',
                v ? a / (a + b) : (c + d + a) / T,
                [
                  v
                    ? `Restringe el denominador a las ${a + b} personas de la mañana.`
                    : `Cuenta a todo el turno de tarde y añade los ${a} ciclistas de la mañana.`,
                ],
                ['Determina correctamente numerador y denominador.'],
              ),
          n(
            'De toda la encuesta se eligen dos personas al azar sin reemplazo. Halla la probabilidad de que al menos una use bicicleta.',
            1 - ((b + d) * (b + d - 1)) / (T * (T - 1)),
            [
              `Para ninguna bicicleta, multiplica $${b + d}/${T}$ por $${b + d - 1}/${T - 1}$. Resta el producto de 1.`,
            ],
            [
              'Utiliza el suceso complementario.',
              'Actualiza la segunda probabilidad.',
              'Multiplica y toma el complemento.',
            ],
          ),
          n(
            'Ahora se sortea primero el turno con una moneda equilibrada y luego una persona de ese turno, uniformemente. Halla la probabilidad de elegir a alguien que use bicicleta.',
            0.5 * (a / (a + b) + c / (c + d)),
            [
              `Las probabilidades por turno son $${a}/${a + b}$ y $${c}/${c + d}$. Pondera cada una por $1/2$ y suma.`,
            ],
            [
              'Calcula las dos probabilidades condicionadas.',
              'Pondera cada probabilidad por un medio.',
            ],
          ),
          review(
            'En la selección uniforme de una sola persona, decide si usar bicicleta y asistir por la mañana son sucesos independientes.',
            [
              `Compara $P(B|M)=${a}/${a + b}$ con $P(B)=${yes}/${T}$. Los productos cruzados son ${a * T} y ${yes * (a + b)}. ${a * T === yes * (a + b) ? 'Son independientes.' : 'Son dependientes.'}`,
            ],
            [
              'Calcula la probabilidad condicionada.',
              'Calcula la marginal.',
              'Aplica el criterio de independencia con una comparación exacta.',
            ],
          ),
        ],
      }
    },
  },
  {
    id: 'triangulos',
    theme: 'Geometría y trigonometría',
    topic: 'Triángulos rectángulos y semejanza',
    courses: ['MAI', 'MAE'],
    make(r, v, level) {
      const k = r(2, 7),
        [x, h, s] = r(0, 1) ? [3 * k, 4 * k, 5 * k] : [5 * k, 12 * k, 13 * k],
        area = (x * h) / 2
      return {
        stem: `Un cable recto une la cima de un mástil vertical con un punto del suelo horizontal. ${v ? `El cable mide ${s} m y su anclaje está a ${x} m de la base.` : `El mástil mide ${h} m y el anclaje está a ${x} m de la base.`} Se desprecia el grosor de los materiales.`,
        tasks: [
          n(
            v
              ? 'Calcula la altura del mástil, en metros.'
              : 'Calcula la longitud del cable, en metros.',
            v ? h : s,
            [
              v
                ? `Despeja $h=\\sqrt{${s}^2-${x}^2}$.`
                : `Aplica $L=\\sqrt{${h}^2+${x}^2}$.`,
            ],
            ['Identifica la hipotenusa y aplica Pitágoras.'],
          ),
          level === 'Avanzado'
            ? n(
                'Un segundo cable paralelo parte de un punto a mitad de altura. ¿Qué fracción del área del triángulo original ocupa el nuevo triángulo con la base del mástil?',
                1 / 4,
                [
                  'El factor lineal es $1/2$. El área cambia por el cuadrado del factor.',
                ],
                ['Reconoce la semejanza y escala el área.'],
              )
            : n(
                level === 'Básico'
                  ? 'Calcula el área triangular delimitada, en metros cuadrados.'
                  : 'Halla el seno del ángulo del cable con el suelo.',
                level === 'Básico' ? area : h / s,
                [
                  level === 'Básico'
                    ? `Usa base por altura entre dos: $${x}·${h}/2$.`
                    : `Divide el cateto vertical por la hipotenusa: $${h}/${s}$.`,
                ],
                ['Relaciona las medidas con la fórmula apropiada.'],
              ),
          n(
            'Se mueve el anclaje hasta el doble de su distancia inicial a la base. ¿Cuántos metros adicionales de cable se necesitan?',
            Math.hypot(2 * x, h) - s,
            [
              `La nueva base mide ${2 * x}. Calcula $\\sqrt{${2 * x}^2+${h}^2}$ y resta la longitud inicial ${s}.`,
            ],
            [
              'Usa la base duplicada en el teorema de Pitágoras.',
              'Compara la nueva hipotenusa con la inicial.',
            ],
          ),
          n(
            'En el triángulo original, halla la distancia perpendicular desde la base del mástil hasta el cable, en metros.',
            (2 * area) / s,
            [
              `El área vale ${area}. Toma el cable como base y usa $A=Ld/2$. Despeja $d=2A/L$.`,
            ],
            [
              'Obtiene el área original.',
              'Usa la hipotenusa como nueva base.',
              'Despeja su altura perpendicular.',
            ],
          ),
          review(
            'Un plano a escala conserva la inclinación original y reduce el cable al 75 % de su longitud. Deduce el porcentaje de área que conserva.',
            [
              'Los dos triángulos son semejantes por igualdad de ángulos. Base y altura se multiplican por 0,75. El área se multiplica por $0.75^2=0.5625$: conserva el 56,25 %.',
            ],
            [
              'Justifica la semejanza.',
              'Relaciona las longitudes por escala.',
              'Aplica la escala cuadrática.',
              'Expresa el resultado como porcentaje.',
            ],
          ),
        ],
      }
    },
  },
]
