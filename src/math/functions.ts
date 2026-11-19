import { fmt, numberPart as n, review, type Family } from './model'

export const exponential: Family = {
  id: 'exponenciales',
  theme: 'Funciones',
  topic: 'Funciones exponenciales',
  courses: ['MAE', 'MAI'],
  make(r, v, level, config) {
    const a = 4 * r(2, 6)
    const base = r(2, 3)
    const b = v ? 1 / base : base
    const c = r(2, 10)
    const later = r(3, 4)
    const easy = level === 'Básico',
      hard = level === 'Avanzado'
    const applied = config?.course === 'MAI'
    const technology = config ? applied || config.paper === 2 : false
    // Exact integer observations even when the decay factor is 1/3.
    const unit = v ? base ** later : 1
    const A = a * unit
    const F = (x: number) => c + A * b ** x
    const target = technology
      ? v
        ? c + Math.floor(A / (base + 1))
        : c + A * (base + 1)
      : F(v && hard ? -1 : 3)
    const statedTarget = Number(target.toPrecision(8))
    const crossing = Math.log((statedTarget - c) / A) / Math.log(b)
    const model = '$F(x)=C+A b^x$'
    const stem = applied
      ? `Un laboratorio calibra un sensor. Su lectura, en milivoltios, después de $x$ minutos sigue el modelo ${model} durante los primeros cuatro minutos.`
      : `Una familia de curvas tiene ecuación ${model}, con $A>0$, $b>0$ y $b≠1$. La tabla muestra puntos de una curva.`
    const observations = (v ? [0, 2] : [0, 1, 2]).map((x) => [
      x,
      Math.round(F(x)),
    ])
    const offset =
      v && hard
        ? ` La asíntota es $y=${c}$. En un instante posterior la lectura es ${Math.round(F(later))}.`
        : easy
          ? ` Se conocen $C=${c}$ y $b=${v ? '1/' + base : base}$.`
          : hard
            ? ''
            : ` Su asíntota horizontal es $y=${c}$.`
    return {
      stem: stem + offset,
      figure: {
        type: 'table',
        headers: [
          applied ? 'Tiempo (min)' : 'x',
          applied ? 'Lectura (mV)' : 'F(x)',
        ],
        rows: observations,
      },
      tasks: [
        v && hard
          ? n(
              'Recupera la abscisa de esa lectura posterior.',
              later,
              [
                `Divide las distancias a la asíntota en los dos puntos de la tabla. El cociente es $b^2=1/${base ** 2}$.`,
                `Por tanto $b=1/${base}$. La distancia posterior equivale a $A/${base ** later}$ y se alcanza tras ${later} unidades.`,
              ],
              [
                'Recupera el factor e invierte el modelo para la tercera lectura.',
              ],
            )
          : easy
            ? n(
                'Determina A a partir de la primera observación.',
                A,
                [
                  `Al sustituir $x=0$ se obtiene $F(0)=C+A$. Resta ${c} de ${F(0)}.`,
                ],
                ['Usa el valor inicial.'],
              )
            : n(
                'Deduce el factor b a partir de los datos.',
                b,
                [
                  hard
                    ? 'Los incrementos sucesivos son $A(b-1)$ y $Ab(b-1)$. Su cociente elimina A y C.'
                    : v
                      ? `El cociente $(F(2)-${c})/(F(0)-${c})$ es $b^2$. Toma la raíz positiva.`
                      : `Resta la asíntota a las dos primeras ordenadas. Divide los valores ajustados: $(F(1)-${c})/(F(0)-${c})$.`,
                ],
                [
                  'Elimina el desplazamiento vertical antes de calcular el factor.',
                ],
              ),
        v && hard
          ? n(
              'Otro dispositivo sigue $G(x)=C+A b^{x/2}$. Calcula cuánto supera G(2) a F(2).',
              F(1) - F(2),
              [
                'En el nuevo modelo se cumple $G(2)=F(1)$.',
                `Utiliza $F(1)=${Math.round(F(1))}$ y descuenta $F(2)=${Math.round(F(2))}$.`,
              ],
              [
                'Aplica la nueva escala horizontal antes de comparar ordenadas.',
              ],
            )
          : hard
            ? n(
                'Determina el valor de la asíntota horizontal de la curva.',
                c,
                [
                  `Usa $F(1)-F(0)=A(b-1)$ para obtener $A=${A}$.`,
                  `Sustituye en $C=F(0)-A$.`,
                ],
                ['Recupera la amplitud y el desplazamiento.'],
              )
            : n(
                'Calcula F(4).',
                F(4),
                [
                  `La parte variable en cero vale ${A}. Multiplícala por $b^4$ y suma ${c}.`,
                ],
                ['Evalúa el modelo con su desplazamiento.'],
              ),
        n(
          `Encuentra el valor real de $x$ para el que $F(x)=${fmt(target)}$.`,
          crossing,
          [
            `Aísla la potencia: $b^x=(${fmt(target)}-${c})/${A}$.`,
            technology
              ? 'Toma logaritmos en ambos miembros y divide por el logaritmo de b.'
              : 'Expresa el cociente como una potencia de la misma base e iguala los exponentes.',
          ],
          [
            'Descuenta el desplazamiento.',
            'Invierte el crecimiento o decrecimiento.',
          ],
        ),
        n(
          'En un segundo modelo, la parte variable inicial se duplica y los otros parámetros se mantienen. Calcula la diferencia positiva entre los dos modelos en x = 2.',
          A * b * b,
          [
            `Las lecturas pasan de $C+A b^2$ a $C+2A b^2$.`,
            `Al restar queda $A b^2$ con $A=${A}$.`,
          ],
          [
            'Construye el segundo modelo.',
            'Compara ambos valores en el mismo instante.',
          ],
        ),
        review(
          applied
            ? 'Explica si las lecturas disponibles permiten asegurar que el modelo seguirá siendo válido una hora después.'
            : 'Justifica si la curva puede cortar su asíntota en un punto con abscisa finita.',
          applied
            ? [
                'Las mediciones solo describen el intervalo observado. Otras curvas podrían ajustarse a esos puntos y cambiar después. Harían falta observaciones próximas a una hora.',
              ]
            : [
                `Para toda abscisa real, $b^x>0$ y $A=${A}>0$. Por ello $F(x)-C$ es siempre positivo. La distancia a la asíntota puede tender a cero sin alcanzarla.`,
              ],
          applied
            ? [
                'Compara los intervalos de tiempo.',
                'Reconoce el límite de extrapolar.',
                'Propone cómo contrastar la previsión.',
              ]
            : [
                'Expresa la distancia vertical.',
                'Establece su signo.',
                'Deduce la imposibilidad de intersección.',
              ],
        ),
      ],
    }
  },
}
