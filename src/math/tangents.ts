import { numberPart as n, review, type Family } from './model'

export const tangents: Family = {
  id: 'tangentes',
  theme: 'Análisis matemático',
  topic: 'Derivadas y rectas tangentes',
  courses: ['MAI'],
  make(r, v, level) {
    const a = r(1, 4),
      t = r(2, 5),
      c = r(4, 10),
      m = 2 * a * t
    const at = (x: number) => a * x * x + c
    const easy = level === 'Fácil',
      hard = level === 'Difícil'
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
