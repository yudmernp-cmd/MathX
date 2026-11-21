import { numeric as n, explain as e, fmt } from './math.mjs'
export const functions = {
  'Modelos lineales': (a, b) => ({
    stem: `Alquilar una bicicleta cuesta ${b} soles de cuota fija y ${a} soles por hora. La empresa factura horas completas.`,
    tasks: [
      n(
        'Calcula la factura por tres horas.',
        b + 3 * a,
        'Suma a la cuota fija el coste de tres horas.',
      ),
      n(
        '¿Cuánto aumenta la factura al pasar de dos a cinco horas?',
        3 * a,
        'La cuota fija se cancela. Multiplica tres por la tarifa horaria.',
      ),
      n(
        `Con ${b + 7 * a + 1} soles, ¿cuántas horas completas se pueden contratar como máximo?`,
        7,
        'Resta la cuota fija, divide entre la tarifa y toma la parte entera.',
      ),
      n(
        `Otro negocio cobra ${b + 4 * a} soles de cuota fija y ${a - 1} soles por hora. ¿Para cuántas horas son iguales ambas facturas?`,
        4 * a,
        'Iguala ambos costes. Cada hora compensa un sol de la diferencia entre las cuotas fijas.',
      ),
      e(
        'Interpreta cuándo conviene el segundo negocio.',
        'A partir de la primera hora entera posterior al punto de igualdad, la tarifa horaria inferior compensa la cuota inicial mayor.',
      ),
    ],
  }),
  'Funciones exponenciales': (a, b) => {
    const rate = 1 + a / 100
    return {
      stem: `Una película protectora tiene ${b} micrómetros de espesor inicial. En cada ciclo su espesor se multiplica por ${fmt(rate)}. Solo se miden ciclos completos.`,
      tasks: [
        n(
          'Calcula el espesor después del primer ciclo.',
          b * rate,
          'Multiplica el espesor inicial por el factor de crecimiento.',
        ),
        n(
          'Calcula el espesor después del cuarto ciclo.',
          b * rate ** 4,
          'Aplica el factor de crecimiento cuatro veces.',
        ),
        n(
          '¿Tras cuántos ciclos supera por primera vez el doble del espesor inicial?',
          Math.floor(Math.log(2) / Math.log(rate)) + 1,
          'Resuelve la desigualdad estricta mediante logaritmos y comprueba el entero obtenido.',
        ),
        n(
          `Un segundo proceso parte también de ${b} micrómetros y alcanza el espesor del sexto ciclo del primer proceso en solo cuatro ciclos. ¿Cuál es su factor de crecimiento?`,
          rate ** 1.5,
          'Iguala ambos espesores finales y toma la raíz cuarta.',
        ),
        e(
          'Explica por qué aumentar el espesor una cantidad fija por ciclo generaría otro tipo de modelo.',
          'Una diferencia constante genera una sucesión aritmética. En este modelo es constante el cociente entre dos espesores consecutivos.',
        ),
      ],
    }
  },
  'Funciones inversas y asíntotas': (a, b) => ({
    stem: `Un instrumento da la lectura $L(x)=\\log_{10}(x+${b})+${a}$ para $x>-${b}$.`,
    tasks: [
      n(
        'Calcula la lectura si el argumento del logaritmo es 1.',
        a,
        'El logaritmo decimal de uno es cero.',
      ),
      n(
        `Halla la entrada cuando la lectura vale ${a + 1}.`,
        10 - b,
        'Eleva diez a la diferencia entre la lectura y el desplazamiento vertical.',
      ),
      n(
        'Halla la ordenada de la asíntota horizontal de la función inversa.',
        -b,
        'Al despejar la entrada se obtiene una exponencial desplazada verticalmente.',
      ),
      n(
        `Dos lecturas difieren en una unidad. Si la menor corresponde a la entrada ${b}, calcula la entrada mayor.`,
        19 * b,
        'El argumento del logaritmo se multiplica por diez cuando la lectura aumenta una unidad.',
      ),
      e(
        'Justifica por qué cada lectura real determina una única entrada admisible.',
        'El logaritmo es estrictamente creciente y recorre todos los valores reales en su dominio.',
      ),
    ],
  }),
  'Modelos cuadráticos': (a, b) => ({
    stem: `La altura de un objeto, en metros, se modeliza por $h(t)=${b}+${2 * a}t-t^2$, desde su lanzamiento en $t=0$ hasta que vuelve al suelo. El tiempo se mide en segundos.`,
    tasks: [
      n('Indica la altura inicial.', b, 'Evalúa la función en cero.'),
      n(
        'Calcula el instante de altura máxima.',
        a,
        'El vértice está en el punto medio entre las raíces de la parábola, o bien resuelve h′(t)=0.',
      ),
      n(
        'Halla la altura máxima.',
        b + a * a,
        'Sustituye el instante del vértice en la ecuación.',
      ),
      n(
        'Calcula la duración del vuelo.',
        a + Math.sqrt(a * a + b),
        'Resuelve la ecuación cuadrática de altura cero y selecciona la raíz positiva.',
      ),
      n(
        `¿Durante cuánto tiempo supera la altura de ${b} metros?`,
        2 * a,
        'Resuelve la desigualdad entre los dos instantes en los que se alcanza la altura inicial.',
      ),
    ],
  }),
  'Modelos sinusoidales': (a, b) => ({
    stem: `Un depósito comienza el ciclo en su altura media. La altura en centímetros se modeliza por $h(t)=${b + a}+${a}\\sin(\\pi t/6)$, con el tiempo en horas y el argumento en radianes.`,
    tasks: [
      n('Indica la altura mínima.', b, 'Resta la amplitud al nivel medio.'),
      n(
        'Calcula el período en horas.',
        12,
        'Divide dos pi entre el coeficiente angular de t.',
      ),
      n(
        'Halla el primer instante de altura máxima después de empezar.',
        3,
        'El primer máximo corresponde a un argumento de pi/2.',
      ),
      n(
        `En las primeras 12 horas, ¿durante cuántas horas supera la altura de ${b + 1.5 * a} cm?`,
        4,
        'Resuelve seno mayor que un medio entre los dos cruces del primer ciclo.',
      ),
      n(
        'Calcula la tasa media de cambio en las primeras tres horas, en cm por hora.',
        a / 3,
        'Resta a la altura máxima la altura inicial y divide el aumento entre tres horas.',
      ),
    ],
  }),
}
