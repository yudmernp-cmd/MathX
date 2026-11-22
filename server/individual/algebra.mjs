import { entry as E, item, close, f, sum, range } from './model.mjs'
export const algebra = [
  E(
    'Porcentajes sucesivos',
    'Fácil',
    'PEN',
    ['divide', 'net-price', ['multiply', 'discount-factor', 'tax-factor']],
    (a, b) => {
      const start = 100 * b,
        discount = a / 100,
        tax = 0.18,
        paid = start * (1 - discount) * (1 + tax)
      return item(
        `Un instrumento costó ${f(paid)} soles después de un descuento del ${a} % y un impuesto del 18 % aplicado sobre el precio rebajado.`,
        '¿Cuál era el precio en soles antes de los dos ajustes?',
        start,
        [
          `Antes del impuesto se pagaban $${f(paid)}/1.18=${f(start * (1 - discount))}$ soles.`,
          `Tras el descuento queda el factor $${f(1 - discount)}$. Divide el precio rebajado por ese factor.`,
        ],
        (x) => close(x * (1 - discount) * (1 + tax), paid),
      )
    },
  ),
  E(
    'Sucesiones aritméticas',
    'Fácil',
    'asientos',
    ['extrapolate', ['arithmetic', 'two-indexed-terms'], 'index'],
    (a, b) => {
      const term = (n) => b + a * (n - 1)
      return item(
        `En las filas de un teatro el número de asientos aumenta una cantidad fija por fila. La fila 3 tiene ${term(3)} asientos y la fila 7 tiene ${term(7)}.`,
        '¿Cuántos asientos hay en la fila 12?',
        term(12),
        [
          `Entre las filas 3 y 7 hay cuatro incrementos. Cada uno vale $(${term(7)}-${term(3)})/4=${a}$.`,
          `De la fila 7 a la 12 se añaden cinco incrementos a los ${term(7)} asientos.`,
        ],
        (x) => close((x - term(7)) / 5, (term(7) - term(3)) / 4),
      )
    },
  ),
  E(
    'Cotas de error',
    'Fácil',
    'm²',
    ['upper-bound', ['multiply', 'rounded-length', 'rounded-width']],
    (a, b) =>
      item(
        `Una sala rectangular mide ${b} m por ${a} m según dos mediciones redondeadas al metro más próximo.`,
        '¿Cuál es la cota superior del área en metros cuadrados?',
        (b + 0.5) * (a + 0.5),
        [
          `Los extremos superiores de las dimensiones son ${b + 0.5} m y ${a + 0.5} m.`,
          'Como ambas dimensiones son positivas, el producto crece con cada una de ellas. Multiplica los extremos superiores.',
        ],
        (x) => close(x, a * b + (a + b) / 2 + 0.25),
      ),
  ),
  E(
    'Ahorro periódico',
    'Medio',
    'PEN',
    ['future-value', 'annuity-due'],
    (a, b) => {
      const p = 10 * b,
        r = 1 + a / 100,
        n = 5
      return item(
        `Durante cinco años se depositan ${p} soles al principio de cada año en una cuenta que abona un ${a} % efectivo anual al final de cada año.`,
        '¿Qué saldo hay justo después del quinto abono de intereses?',
        (p * r * (r ** n - 1)) / (r - 1),
        [
          `El primer depósito crece cinco años y el último, uno. Sus valores finales forman una progresión de razón $${f(r)}$.`,
          `Suma $${p}(${f(r)}+${f(r)}^2+\\cdots+${f(r)}^5)$.`,
        ],
        (x) =>
          close(
            x,
            range(n).reduce((v) => (v + p) * r, 0),
          ),
      )
    },
  ),
  E(
    'Sucesiones geométricas',
    'Medio',
    '',
    ['ratio', ['geometric', 'two-nonconsecutive-terms']],
    (a, b) => {
      const r = 1 + a / 10,
        v = b * 1000,
        end = v * r ** 3
      return item(
        `La población de un cultivo sigue una progresión geométrica de razón positiva. En la segunda medición hay ${v} unidades y en la quinta hay ${f(end)}.`,
        '¿Cuál es el factor de crecimiento por intervalo?',
        r,
        [
          `Entre las dos mediciones transcurren tres intervalos, por lo que $${v}r^3=${f(end)}$.`,
          'Divide por la población de la segunda medición y toma la raíz cúbica positiva.',
        ],
        (x) => x > 0 && close(v * x ** 3, end),
      )
    },
  ),
  E(
    'Interés efectivo',
    'Medio',
    '%',
    ['annual-effective', 'nominal-monthly'],
    (a, b) => {
      const nominal = a + b / 10,
        r = 1 + nominal / 1200
      return item(
        `Un banco anuncia un tipo nominal anual del ${f(nominal)} %, capitalizable mensualmente. Se mantiene una inversión durante un año completo.`,
        '¿Cuál es el tipo efectivo anual, expresado en porcentaje?',
        100 * (r ** 12 - 1),
        [
          `La tasa mensual es $${f(nominal)}/1200$ en forma decimal.`,
          `Una unidad monetaria se convierte en $${f(r)}^{12}$. Resta la unidad inicial y multiplica por 100.`,
        ],
        (x) =>
          close(
            1 + x / 100,
            range(12).reduce((v) => v * r, 1),
          ),
      )
    },
  ),
  E(
    'Capital pendiente',
    'Difícil',
    'PEN',
    ['balance', ['annuity-payment', 'principal', 'rate', 'term'], 'elapsed'],
    (a, b) => {
      const P = b * 1000,
        i = a / 1200,
        p = (P * i) / (1 - (1 + i) ** -36),
        remaining = (p * (1 - (1 + i) ** -24)) / i
      return item(
        `Un préstamo de ${P} soles se amortiza en 36 cuotas mensuales iguales a mes vencido. El tipo nominal anual es del ${a} %, capitalizable mensualmente. Se conserva toda la precisión de las cuotas.`,
        '¿Qué capital queda pendiente inmediatamente después de la duodécima cuota?',
        remaining,
        [
          `La tasa mensual es $i=${a}/1200$. El valor actual de las 36 cuotas debe igualar el préstamo.`,
          `La cuota es $C=${P}i/(1-(1+i)^{-36})\\approx${f(p)}$.`,
          'Justo después del pago quedan 24 cuotas. Su valor en ese instante es $C(1-(1+i)^{-24})/i$.',
        ],
        (x) =>
          close(
            x,
            range(12).reduce((v) => v * (1 + i) - p, P),
          ),
      )
    },
  ),
  E(
    'Producción acumulada',
    'Difícil',
    'días',
    ['first-index', ['threshold', ['sum', 'arithmetic']]],
    (a, b) => {
      const target = 25 * b,
        s = (n) => (n * (2 * b + (n - 1) * a)) / 2
      const n = Math.ceil(
        (-(2 * b - a) + Math.sqrt((2 * b - a) ** 2 + 8 * a * target)) / (2 * a),
      )
      return item(
        `Un taller termina ${b} piezas el primer día y aumenta la producción diaria en ${a} piezas cada día. Debe reunir ${target} piezas.`,
        '¿En qué día alcanza el pedido completo por primera vez?',
        n,
        [
          `Tras $n$ días lleva $S_n=n(2\\cdot${b}+(n-1)${a})/2$ piezas.`,
          `Resuelve $S_n\\geq${target}$ con $n$ entero positivo.`,
          `Al final del día anterior hay ${s(n - 1)} piezas y al terminar el día ${n} hay ${s(n)}.`,
        ],
        (x) => Number.isInteger(x) && s(x - 1) < target && s(x) >= target,
      )
    },
  ),
  E(
    'Poder adquisitivo',
    'Difícil',
    'años',
    [
      'first-index',
      ['threshold', ['divide', 'compound-fund', 'inflated-price']],
    ],
    (a, b) => {
      const P = 100 * b,
        price = 1.5 * P,
        r = 1 + (a + 4) / 100,
        inflation = 1.02,
        n = Math.ceil(Math.log(price / P) / Math.log(r / inflation))
      return item(
        `Una beca de ${P} soles se invierte al ${a + 4} % efectivo anual. Un equipo cuesta hoy ${price} soles y su precio sube un 2 % cada año. Ambos importes se actualizan al final del año.`,
        '¿Al final de qué año se podrá comprar el equipo por primera vez?',
        n,
        [
          `Compara el saldo $${P}(${f(r)})^n$ con el precio $${price}(1.02)^n$.`,
          `El cociente de factores es $${f(r)}/1.02$. Resuelve $(${f(r)}/1.02)^n\\geq1.5$ con logaritmos.`,
          'Toma el primer entero que cumple la desigualdad.',
        ],
        (x) =>
          Number.isInteger(x) &&
          P * r ** (x - 1) < price * inflation ** (x - 1) &&
          P * r ** x >= price * inflation ** x,
      )
    },
  ),

  E(
    'Notación científica',
    'Fácil',
    'mediciones',
    ['count', ['divide', 'capacity', 'scientific-unit-size']],
    (a, b) =>
      item(
        `Un archivo científico reserva $${b}\\times10^9$ bytes para mediciones. Cada medición ocupa $${a}\\times10^6$ bytes y se almacena completa.`,
        '¿Cuántas mediciones caben como máximo?',
        Math.floor((1000 * b) / a),
        [
          `Al dividir las potencias de diez queda $10^{9-6}=1000$. La capacidad equivale a $${b}\\cdot1000/${a}$ mediciones.`,
          'Toma la parte entera para que la última medición también quepa.',
        ],
        (x) =>
          Number.isInteger(x) &&
          x * a * 1e6 <= b * 1e9 &&
          (x + 1) * a * 1e6 > b * 1e9,
      ),
  ),
  E(
    'Cambio de divisas',
    'Medio',
    'USD',
    ['invert', ['commission', 'exchange', 'fixed-fee']],
    (a, b) => {
      const initial = b * 100,
        rate = 4,
        net = initial * rate * (1 - a / 100) - 8
      return item(
        `Una agencia cambia dólares a 4 soles por dólar, descuenta una comisión del ${a} % del importe convertido y luego cobra 8 soles fijos. Una viajera recibió ${f(net)} soles.`,
        '¿Cuántos dólares entregó?',
        initial,
        [
          `Antes del cargo fijo le correspondían ${f(net + 8)} soles.`,
          `Deshaz la comisión dividiendo por $${f(1 - a / 100)}$ y divide el importe bruto entre 4 para recuperar los dólares.`,
        ],
        (x) => close(4 * x - (4 * x * a) / 100 - 8, net),
      )
    },
  ),
  E(
    'Amortización anticipada',
    'Difícil',
    'PEN',
    ['payment', ['annuity', 'extra-payment', 'unchanged-term']],
    (a, b) => {
      const principal = b * 1000,
        extra = 100 * b,
        r = a / 100,
        n = 5,
        old = (principal * r) / (1 - (1 + r) ** -n),
        after = principal * (1 + r) - old - extra,
        c = (after * r) / (1 - (1 + r) ** -4)
      return item(
        `Un préstamo de ${principal} soles se pacta a cinco cuotas anuales iguales a año vencido, al ${a} % efectivo anual. Justo después de pagar la primera cuota, se amortizan ${extra} soles adicionales. Se mantienen el tipo y los cuatro vencimientos restantes.`,
        '¿Cuál será la nueva cuota anual en soles?',
        c,
        [
          `Calcula la primera cuota por valor actual: $C=${principal}(${f(r)})/(1-(1+${f(r)})^{-5})$.`,
          `Descuenta ambos pagos del saldo capitalizado del primer año. Quedan aproximadamente ${f(after)} soles.`,
          'Ese saldo debe igualar el valor actual de las nuevas cuatro cuotas. Divide por el factor de anualidad de cuatro años.',
        ],
        (x) =>
          close(
            range(4).reduce((v) => v * (1 + r) - x, after),
            0,
          ),
      )
    },
  ),
]
