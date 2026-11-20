import { numberPart as n, review, type Family } from './model'

export const geometric: Family = {
  id: 'geometrica',
  theme: 'Números y álgebra',
  topic: 'Sucesiones y series geométricas',
  courses: ['MAI'],
  make(r, v, level) {
    const a = r(2, 9),
      b = r(2, 3),
      k = r(3, 5)
    const u = (i: number) => a * b ** (i - 1)
    const sum = (i: number) => (a * (b ** i - 1)) / (b - 1)
    const hard = level === 'Difícil',
      easy = level === 'Fácil'
    const givens = v
      ? `En la segunda fase se inspeccionan ${u(2)} y en la cuarta ${u(4)}.`
      : hard
        ? `Las dos primeras fases reúnen ${sum(2)} piezas y la segunda tiene ${u(2) - a} más que la primera.`
        : `En la primera fase se inspeccionan ${a} piezas y en cada fase se multiplica la cantidad anterior por ${b}.`
    return {
      stem: `Un control de calidad inspecciona grupos distintos de piezas por fases. Los tamaños forman una progresión geométrica de razón positiva. ${givens}`,
      tasks: [
        v
          ? n(
              'Determina la razón común.',
              b,
              [
                `Entre la segunda y la cuarta fase hay dos multiplicaciones. Divide sus tamaños y toma la raíz positiva de ${b * b}.`,
              ],
              ['Relaciona la razón con la separación de índices.'],
            )
          : hard
            ? n(
                'Reconstruye el número de piezas de la primera fase.',
                a,
                [
                  `Resta la diferencia ${u(2) - a} del total ${sum(2)}. El resultado es el doble del primer grupo.`,
                ],
                ['Relaciona suma y diferencia de los dos grupos.'],
              )
            : n(
                easy
                  ? '¿Cuántas piezas se inspeccionan en la segunda fase?'
                  : `¿En qué fase se inspeccionan exactamente ${u(k)} piezas?`,
                easy ? u(2) : k,
                [
                  easy
                    ? `Multiplica ${a} por ${b}.`
                    : `Resuelve $${a} · ${b}^{n-1}=${u(k)}$ igualando exponentes.`,
                ],
                ['Utiliza el término general.'],
              ),
        hard
          ? n(
              `Un envío contiene ${sum(k) + u(k + 1) - 1} piezas. ¿Cuántas fases completas pueden terminarse?`,
              k,
              [
                `La suma hasta la fase ${k} es ${sum(k)}. La siguiente requiere ${u(k + 1)} más, una pieza por encima del envío.`,
              ],
              ['Contrasta dos sumas consecutivas con el límite.'],
            )
          : n(
              `Halla el total inspeccionado en las primeras ${k} fases.`,
              sum(k),
              [
                `El primer grupo tiene ${a} piezas. Suma los primeros ${k} términos con $S_n=${a}(${b}^{n}-1)/(${b}-1)$.`,
              ],
              ['Acumula los términos de la progresión.'],
            ),
        n(
          `El informe pierde el registro de la primera fase. ¿Cuántas piezas se inspeccionaron desde la fase 2 hasta la fase ${k + 1}, ambas inclusive?`,
          sum(k + 1) - a,
          [
            `Calcula $S_{${k + 1}}=${sum(k + 1)}$.`,
            `Quita las ${a} piezas de la primera fase.`,
          ],
          [
            'Determina el último índice incluido.',
            'Descuenta el grupo omitido.',
          ],
        ),
        n(
          `Se reservan las fases impares para una segunda inspección. ¿Cuántas piezas se revisan en las tres primeras fases impares?`,
          a * (1 + b * b + b ** 4),
          [
            `Los índices son 1, 3 y 5. Sus tamaños forman otra progresión con razón $${b}^2$.`,
            `Suma los tamaños ${a}, ${u(3)} y ${u(5)}.`,
          ],
          ['Reindexa los términos.', 'Acumula las tres fases seleccionadas.'],
        ),
        review(
          'Si se duplicara el tamaño inicial manteniendo la razón, ¿se duplicaría el total después de cualquier número de fases? Justifica tu respuesta.',
          [
            'El término general es proporcional al tamaño inicial. Todos los sumandos se duplican y, por distributividad, también su suma.',
          ],
          [
            'Relaciona cada término con el primero.',
            'Considera toda la suma.',
            'Justifica el factor común.',
          ],
        ),
      ],
    }
  },
}
