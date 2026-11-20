import { fmt, numberPart as n, review, type Family } from './model'
export const loans: Family = {
  id: 'prestamos',
  theme: 'Números y álgebra',
  topic: 'Préstamos y amortización',
  courses: ['MAI'],
  make(r, v, level) {
    const months = 2 * r(6, 15),
      rate = r(1, 3) / 200,
      principal = 500 * r(8, 25),
      givenPayment = 25 * r(8, 24)
    const half = months / 2,
      annuity = (n: number) => (1 - (1 + rate) ** -n) / rate
    const payment = v ? givenPayment : principal / annuity(months),
      capital = v ? payment * annuity(months) : principal
    const balance = payment * annuity(half),
      extra = payment * 2,
      revised = (balance - extra) / annuity(half)
    const easy = level === 'Fácil',
      hard = level === 'Difícil'
    return {
      stem: `Una cooperativa aplica un interés mensual del ${fmt(rate * 100)} % sobre el saldo pendiente. Las ${months} cuotas son iguales, vencen al final del mes y dejan el saldo en cero. No hay comisiones. Conserva la precisión durante los cálculos. ${v ? 'El contrato fija cada cuota en S/ ' + givenPayment + '.' : 'La cooperativa entrega S/ ' + principal + ' al inicio.'}`,
      tasks: [
        v
          ? n(
              'Determina el importe del préstamo en soles.',
              capital,
              [
                `Cada pago debe descontarse al inicio. Usa $P=C(1-(1+i)^{-n})/i$ con $i=${rate}$, $n=${months}$ y $C=${payment}$.`,
              ],
              [
                'Sitúa las cuotas al final de cada mes.',
                'Calcula su valor actual.',
              ],
            )
          : easy
            ? n(
                'Calcula el interés en soles correspondiente al primer mes.',
                capital * rate,
                [
                  `Multiplica el saldo inicial de ${principal} por el tipo mensual ${rate}.`,
                ],
                ['Aplica el tipo al saldo inicial.'],
              )
            : n(
                'Determina la cuota mensual en soles.',
                payment,
                [
                  `Iguala el importe recibido al valor actual de las cuotas. Despeja $C=Pi/(1-(1+i)^{-n})$ con $n=${months}$ e $i=${rate}$.`,
                ],
                [
                  'Formula la equivalencia de valores.',
                  'Despeja la cuota periódica.',
                ],
              ),
        hard
          ? n(
              `Inmediatamente después de la cuota ${half}, se quiere cancelar el préstamo. ¿Qué importe queda por pagar en ese momento?`,
              balance,
              [
                `Quedan ${half} cuotas. Descuéntalas hasta el momento de la cancelación, usando el mismo tipo mensual.`,
              ],
              [
                'Determina las cuotas restantes.',
                'Valora la renta en la fecha correcta.',
              ],
            )
          : n(
              'Calcula el total de intereses que se pagarían siguiendo el calendario inicial.',
              months * payment - capital,
              [
                `Halla primero la cuota o el capital que falta mediante la equivalencia financiera. Resta el principal de las ${months} cuotas acumuladas.`,
              ],
              [
                'Distingue los intereses de la devolución del principal.',
                'Usa el calendario completo.',
              ],
            ),
        n(
          `Inmediatamente después de la cuota ${half}, se abona un importe adicional igual a dos cuotas ordinarias. Se mantiene el plazo final. Calcula la nueva cuota mensual.`,
          revised,
          [
            `El saldo antes del abono es S/ ${fmt(balance)}. Resta dos cuotas y conserva los ${half} vencimientos restantes.`,
            `Divide el nuevo saldo entre el factor de valor actual $${fmt(annuity(half))}$, usando su valor sin redondear.`,
          ],
          [
            'Determina el saldo en la fecha del abono.',
            'Resta el abono extraordinario.',
            'Recalcula la cuota para el plazo restante.',
          ],
        ),
        n(
          '¿Cuántos soles de intereses se ahorran al realizar el abono extraordinario?',
          half * (payment - revised) - extra,
          [
            `Los pagos previos y el capital recibido coinciden. Compara las últimas ${half} cuotas originales con el abono más las nuevas cuotas.`,
            `El ahorro es $${half}(C-C_{nuevo})-2C$.`,
          ],
          [
            'Compara los mismos periodos.',
            'Contabiliza el pago extraordinario.',
            'Relaciona la diferencia de pagos con la de intereses.',
          ],
        ),
        review(
          'Evalúa si el abono extraordinario seguiría siendo ventajoso para una familia que tuviera que financiarlo con otro préstamo.',
          [
            'El ahorro calculado corresponde al primer préstamo. Para valorar la decisión hay que comparar también los intereses, las comisiones y las fechas de los pagos del segundo crédito.',
          ],
          [
            'Identifica el ahorro del contrato inicial.',
            'Incluye el coste de financiar el abono.',
            'Considera el calendario de pagos.',
            'Formula una conclusión condicionada a los costes.',
          ],
        ),
      ],
    }
  },
}
