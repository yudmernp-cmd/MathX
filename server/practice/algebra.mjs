import { numeric as n, explain as e, fmt } from './math.mjs'
function arithmetic(a, b, mixed) {
  const u = (i) => b + (i - 1) * a,
    sum = (i) => (i * (b + u(i))) / 2,
    k = 4 + a
  return {
    stem: `Un taller prepara ${b} pedidos en su primera jornada. Durante la primera etapa prepara ${a} pedidos más en cada jornada que en la anterior.`,
    tasks: [
      n(
        '¿Cuántos pedidos prepara en la tercera jornada?',
        u(3),
        `Suma dos incrementos de ${a} al primer término.`,
      ),
      n(
        'Calcula la producción acumulada de las primeras cinco jornadas.',
        sum(5),
        'Multiplica cinco por la media de los términos primero y quinto.',
      ),
      n(
        `¿En qué jornada la producción acumulada alcanza por primera vez ${sum(k) - 1} pedidos o más?`,
        k,
        `Resuelve la desigualdad con la suma aritmética y comprueba las jornadas ${k - 1} y ${k}.`,
      ),
      mixed
        ? n(
            'Al terminar la quinta jornada cambia el plan. A partir de ese momento la producción prevista aumenta un 10 % por jornada. Halla la previsión para la novena.',
            u(5) * 1.1 ** 4,
            'Aplica cuatro factores de 1,10 al quinto término.',
          )
        : n(
            `El taller quiere preparar exactamente ${sum(7) + 21} pedidos en siete jornadas cambiando únicamente el incremento diario. Halla el nuevo incremento.`,
            a + 1,
            'Plantea la suma de siete términos con la misma producción inicial y despeja la diferencia.',
          ),
      e(
        'Explica por qué no es adecuado extrapolar un crecimiento así durante años.',
        'El modelo exige una capacidad diaria que crece indefinidamente a pesar de que el taller dispone de recursos limitados.',
      ),
    ],
  }
}
export const algebra = {
  'Sucesiones y series aritméticas': (a, b) => arithmetic(a, b, false),
  'Sucesiones aritméticas y geométricas': (a, b) => arithmetic(a, b, true),
  'Sucesiones y series geométricas': (a, b) => {
    const r = 1 + a / 20,
      term = (k) => b * r ** (k - 1),
      sum = (k) => (b * (r ** k - 1)) / (r - 1)
    return {
      stem: `Un proyecto de riego prevé usar ${b} litros en la primera etapa. En cada etapa se utiliza ${5 * a} % más que en la anterior.`,
      tasks: [
        n(
          'Indica la razón geométrica.',
          r,
          'Convierte la tasa en decimal y súmale uno.',
        ),
        n(
          'Halla el volumen previsto para la cuarta etapa.',
          term(4),
          'Aplica la razón tres veces al volumen inicial.',
        ),
        n(
          'Halla el volumen total de las primeras seis etapas.',
          sum(6),
          'Suma los seis términos de la progresión geométrica.',
        ),
        n(
          `Halla la primera etapa cuyo consumo supera ${fmt((term(6) + term(7)) / 2)} litros.`,
          7,
          'Despeja el índice con logaritmos y verifica los dos enteros contiguos.',
        ),
        e(
          'Explica qué efecto tendría ignorar el crecimiento al presupuestar el consumo total.',
          'Usar el consumo inicial en todas las etapas subestima cada término posterior y por ello subestima la suma.',
        ),
      ],
    }
  },
  'Matemática financiera': (a, b) => {
    const p = 100 * b,
      i = (a + 1) / 100
    return {
      stem: `Se invierten ${p} soles a un tipo efectivo anual fijo del ${a + 1} %, con reinversión anual y sin aportaciones posteriores.`,
      tasks: [
        n(
          'Calcula los intereses del primer año.',
          p * i,
          'Multiplica el capital inicial por la tasa anual.',
        ),
        n(
          'Calcula el saldo al cabo de tres años.',
          p * (1 + i) ** 3,
          'Aplica tres factores anuales de capitalización.',
        ),
        n(
          '¿En cuánto supera el saldo del quinto año al que se obtendría con interés simple al mismo tipo?',
          p * ((1 + i) ** 5 - 1 - 5 * i),
          'Resta el capital con interés simple al capital compuesto.',
        ),
        n(
          '¿Cuántos años completos se necesitan como mínimo para duplicar el capital?',
          Math.ceil(Math.log(2) / Math.log1p(i)),
          'Resuelve la desigualdad exponencial y toma el primer entero admisible.',
        ),
        n(
          'Con inflación constante del 2 % anual, calcula el valor del saldo del quinto año en soles del momento inicial.',
          p * ((1 + i) / 1.02) ** 5,
          'Descuenta los cinco años de inflación del saldo nominal.',
        ),
      ],
    }
  },
  'Préstamos y amortización': (a, b) => {
    const p = 1000 * b,
      i = (a + 1) / 1200,
      months = 36,
      pmt = (p * i) / (1 - (1 + i) ** -months)
    return {
      stem: `Se presta un capital de ${p} soles a un tipo nominal anual del ${a + 1} % capitalizable mensualmente. Se amortiza en 36 cuotas iguales a mes vencido. Trabaja sin redondear las cuotas intermedias.`,
      tasks: [
        n(
          'Halla el interés devengado durante el primer mes.',
          p * i,
          'Divide la tasa nominal entre doce y aplícala al saldo inicial.',
        ),
        n(
          'Calcula el saldo tras el primer mes antes de pagar la cuota.',
          p * (1 + i),
          'Suma al capital el interés del primer mes.',
        ),
        n(
          'Determina la cuota mensual.',
          pmt,
          'Iguala el capital al valor actual de una renta de 36 pagos al final de cada mes.',
        ),
        n(
          'Halla el capital pendiente justo después de la cuota número doce.',
          (pmt * (1 - (1 + i) ** -24)) / i,
          'Descuenta las 24 cuotas restantes a la fecha del duodécimo pago.',
        ),
        n(
          '¿Cuánto interés futuro se ahorraría al liquidar ese capital en ese instante sin penalización?',
          24 * pmt - (pmt * (1 - (1 + i) ** -24)) / i,
          'Resta el capital pendiente al total de las 24 cuotas evitadas.',
        ),
      ],
    }
  },
}
