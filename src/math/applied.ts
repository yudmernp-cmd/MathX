import { fmt, numberPart as n, review, type Family } from './model'

export const applied: Family[] = [
  {
    id: 'tarifas',
    theme: 'Funciones',
    topic: 'Modelos lineales',
    courses: ['MAI'],
    make(r, v, level) {
      const fixed = r(8, 20),
        slope = r(2, 7),
        k = r(3, 7),
        cross = r(9, 16),
        other = slope - 1,
        base = fixed + cross
      const cost = (x: number) => fixed + slope * x
      const easy = level === 'Básico',
        hard = level === 'Avanzado'
      return {
        stem: v
          ? `Un taller registra el coste total de alquilar una máquina. La tabla contiene dos presupuestos. El coste es una función afín de las horas de uso.`
          : `Un servicio de transporte cobra una cuota fija y un importe constante por hora. La gráfica representa el coste total en soles.`,
        figure: v
          ? {
              type: 'table',
              headers: ['Horas', 'Coste (S/)'],
              rows: [
                [k, cost(k)],
                [k + 2, cost(k + 2)],
              ],
            }
          : {
              type: 'graph',
              x: 'Horas',
              y: 'Coste (S/)',
              points: [
                [0, fixed],
                [k, cost(k)],
              ],
            },
        tasks: [
          easy
            ? n(
                'Calcula el incremento del coste por hora.',
                slope,
                ['Divide el cambio en coste entre el cambio en horas.'],
                ['Calcula la razón de cambio.'],
              )
            : n(
                `Calcula la cuota de un segundo proveedor que cobra S/ ${other} por hora e iguala al primero a las ${cross} horas.`,
                base,
                [
                  `El primer modelo es $C(t)=${fixed}+${slope}t$. Resta $ ${other}·${cross}$ del coste de coincidencia.`,
                ],
                ['Plantea la igualdad de costes.'],
              ),
          hard
            ? n(
                `¿A partir de cuántas horas enteras se ahorran al menos S/ ${k} con ese segundo proveedor?`,
                cross + k,
                [
                  `La diferencia a favor del segundo es $t-${cross}$. Resuelve la desigualdad.`,
                ],
                ['Compara ambos modelos mediante una desigualdad.'],
              )
            : v
              ? n(
                  'Determina la cuota fija del proveedor inicial.',
                  fixed,
                  [`Resta $ ${slope}·${k}$ al primer coste observado.`],
                  ['Sustituye una observación en el modelo.'],
                )
              : n(
                  `Halla las horas de uso si el primer proveedor factura S/ ${cost(k + 2)}.`,
                  k + 2,
                  [`Despeja $t$ en $ ${fixed}+${slope}t=${cost(k + 2)}$.`],
                  ['Despeja el tiempo.'],
                ),
          n(
            `Un cliente dispone de S/ ${3 * cost(k) + slope - 1} para tres alquileres de idéntica duración. Halla el máximo número entero de horas por alquiler con el primer proveedor.`,
            k,
            [
              `Plantea $3(${fixed}+${slope}t)≤${3 * cost(k) + slope - 1}$. Divide entre tres, aísla el tiempo y redondea hacia abajo.`,
            ],
            [
              'Cuenta tres cuotas fijas.',
              'Formula la restricción de presupuesto.',
              'Interpreta la cota entera.',
            ],
          ),
          n(
            `Otro plan elimina la cuota inicial y cobra S/ ${slope + 2} por hora. ¿A qué duración cuestan lo mismo este plan y el inicial?`,
            fixed / 2,
            [
              `Iguala $ ${fixed}+${slope}t=(${slope + 2})t$. Resta el coste variable común y divide entre 2.`,
            ],
            [
              'Modela el plan sin cuota.',
              'Iguala ambos modelos y despeja la duración.',
            ],
          ),
          review(
            'Compara los planes del inciso anterior para duraciones a ambos lados del punto de cruce. Justifica tu respuesta.',
            [
              `La diferencia (plan inicial menos plan sin cuota) es $ ${fixed}-2t$. Es positiva antes de ${fmt(fixed / 2)} horas y negativa después.`,
            ],
            [
              'Expresa la diferencia de costes.',
              'Identifica el plan más barato antes del cruce.',
              'Identifica el más barato después.',
              'Justifica con la pendiente o el signo de la diferencia.',
            ],
          ),
        ],
      }
    },
  },
  {
    id: 'capital',
    theme: 'Número y álgebra',
    topic: 'Matemática financiera',
    courses: ['MAI'],
    make(r, v, level) {
      const p = 100 * r(12, 45),
        rate = r(3, 8),
        g = 1 + rate / 100,
        t = r(3, 7),
        at = (k: number) => p * g ** k,
        target = Math.floor(at(t + 2))
      const stem = v
        ? `Un fondo crece un ${rate} % anual compuesto, con capitalización al final de cada año. Al cabo de un año contiene S/ ${fmt(at(1))}.`
        : `Una cooperativa deposita S/ ${p} al ${rate} % de interés compuesto anual. Los intereses se abonan al final de cada año.`
      return {
        stem: stem + ' No hay comisiones ni aportaciones posteriores.',
        tasks: [
          v
            ? n(
                'Reconstruye el depósito inicial.',
                p,
                [`Divide el saldo del primer año entre ${fmt(g)}.`],
                ['Invierte la capitalización.'],
              )
            : level === 'Básico'
              ? n(
                  'Halla el interés ganado durante el primer año.',
                  (p * rate) / 100,
                  [`Multiplica ${p} por ${rate}/100.`],
                  ['Convierte el porcentaje en un factor.'],
                )
              : n(
                  `Halla el interés que se gana únicamente durante el año ${t}.`,
                  at(t) - at(t - 1),
                  [
                    `Multiplica el saldo al comenzar ese año, $ ${p}(${fmt(g)})^{${t - 1}}$, por la tasa.`,
                  ],
                  ['Aplica la tasa al saldo correcto.'],
                ),
          level === 'Avanzado'
            ? n(
                `¿En qué año se supera por primera vez un saldo de S/ ${target - 1}?`,
                t + 2,
                [
                  `Compara los saldos anuales consecutivos con ${target - 1}. El primero que supera el umbral es el del año ${t + 2}.`,
                ],
                ['Resuelve la desigualdad con años enteros.'],
              )
            : n(
                `Calcula el saldo al terminar el año ${t}.`,
                at(t),
                [`Usa $A_t=${p}(${fmt(g)})^t$.`],
                ['Aplica crecimiento compuesto.'],
              ),
          n(
            `En una alternativa de interés simple a la misma tasa y con el mismo depósito inicial, ¿cuántos soles menos se obtendrían al cabo de ${t} años?`,
            at(t) - p * (1 + (t * rate) / 100),
            [
              `El saldo simple es $ ${p}(1+${t}·${rate}/100)$. Réstalo del saldo compuesto del mismo año.`,
            ],
            [
              'Calcula el saldo simple.',
              'Calcula el saldo compuesto del mismo periodo.',
            ],
          ),
          n(
            `Si los precios aumentan un 2 % anual, expresa el saldo compuesto del año ${t} en soles de poder adquisitivo inicial.`,
            at(t) / 1.02 ** t,
            [
              `El índice de precios al final vale $1.02^{${t}}$. Divide el saldo nominal entre el índice.`,
            ],
            [
              'Modela la inflación compuesta.',
              'Usa el saldo nominal correspondiente.',
              'Deflacta mediante división.',
            ],
          ),
          review(
            'Evalúa qué ocurriría con el poder adquisitivo del depósito si, desde el principio, la inflación anual hubiera superado la tasa del fondo.',
            [
              `El factor de crecimiento real es $ ${fmt(g)}/(1+i)$. Para una inflación $i>${fmt(g - 1)}$, este factor es menor que uno. El saldo nominal sube mientras el real disminuye.`,
            ],
            [
              'Distingue saldo nominal y real.',
              'Compara factores anuales.',
              'Determina el signo del crecimiento real.',
              'Interpreta el efecto acumulado.',
            ],
          ),
        ],
      }
    },
  },
]
