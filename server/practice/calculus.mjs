import { numeric as n, explain as e } from './math.mjs'
export const calculus = {
  'Acumulación y regla del trapecio': (a, b) => {
    const flows = [b, b + 2 * a, b + 3 * a, b + a],
      accumulated =
        (a * (flows[0] + 2 * flows[1] + 2 * flows[2] + flows[3])) / 2
    return {
      stem: `Se registra el caudal de entrada en un depósito durante ${3 * a} minutos. Entre mediciones se aproxima el caudal por segmentos rectos.`,
      figure: {
        type: 'table',
        headers: ['Tiempo (min)', 'Caudal (L/min)'],
        rows: flows.map((v, i) => [a * i, v]),
      },
      tasks: [
        n(
          'Halla el intervalo de tiempo entre dos mediciones consecutivas.',
          a,
          'Resta dos tiempos consecutivos.',
        ),
        n(
          'Estima los litros que entran en el primer intervalo.',
          a * (b + a),
          'Multiplica la anchura del intervalo por la media de los dos caudales extremos.',
        ),
        n(
          'Estima el volumen total que entra durante el período observado.',
          accumulated,
          'Suma las áreas de los tres trapecios.',
        ),
        n(
          `Si hay una salida constante de ${a} L/min, halla el aumento de volumen en el período observado.`,
          accumulated - 3 * a * a,
          'Resta al volumen de entrada el caudal de salida por el tiempo total.',
        ),
        e(
          'Si el caudal real permanece por encima de los segmentos interpolados entre las mediciones, explica el sentido del error.',
          'La aproximación omite el área comprendida entre el caudal real y los segmentos, por lo que subestima la entrada.',
        ),
      ],
    }
  },
  'Derivadas y rectas tangentes': (a, b) => ({
    stem: `Una trayectoria se modeliza por $f(x)=x^2+${a}x+${b}$. Se estudia su tangente en $x=${a}$.`,
    tasks: [
      n(
        'Halla la ordenada del punto de tangencia.',
        2 * a * a + b,
        'Evalúa el polinomio en la abscisa indicada.',
      ),
      n(
        'Halla la pendiente de la tangente.',
        3 * a,
        'Deriva el polinomio y sustituye la abscisa indicada.',
      ),
      n(
        'Halla la ordenada en el origen de la recta tangente.',
        b - a * a,
        'En la ecuación punto-pendiente, evalúa la recta en x=0.',
      ),
      n(
        `Halla la diferencia entre la ordenada de la curva y la predicción de esta tangente en $x=${2 * a}$.`,
        a * a,
        'Sustituye la misma abscisa en el polinomio y en la tangente y resta.',
      ),
      e(
        'Justifica si la tangente sobreestima o subestima la curva fuera del punto de contacto.',
        'La diferencia entre la curva y la tangente es el cuadrado de la distancia horizontal al punto de contacto. Es positiva fuera de dicho punto.',
      ),
    ],
  }),
  'Integración y condiciones iniciales': (a, b) => ({
    stem: `A partir de $t=0$ un tanque contiene ${b} litros. El caudal neto, en litros por minuto, es $V\'(t)=${2 * a}t+3$ durante los primeros diez minutos.`,
    tasks: [
      n(
        'Halla el caudal neto en el primer minuto, cuando t=1.',
        2 * a + 3,
        'Sustituye t=1 en la tasa dada.',
      ),
      n(
        'Halla el aumento de volumen durante los dos primeros minutos.',
        4 * a + 6,
        'Integra la tasa entre cero y dos.',
      ),
      n(
        'Calcula el volumen total al cabo de cuatro minutos.',
        b + 16 * a + 12,
        'Suma la integral del caudal al volumen inicial.',
      ),
      n(
        `¿En qué instante se alcanza un volumen de ${b + 25 * a + 15} litros?`,
        5,
        'Iguala el volumen inicial más la integral al volumen buscado y elige la solución del dominio.',
      ),
      e(
        'Explica por qué la tasa dada por sí sola no determina el volumen total.',
        'La integral indefinida contiene una constante que se fija mediante el volumen inicial.',
      ),
    ],
  }),
  'Área bajo una curva': (a, b) => ({
    stem: `La curva $y=${a}x(${b}-x)$ corta el eje horizontal en los extremos del intervalo $[0,${b}]$.`,
    tasks: [
      n(
        'Indica la raíz positiva de la función.',
        b,
        'Iguala a cero el segundo factor.',
      ),
      n(
        'Calcula la altura de la curva en el punto medio del intervalo.',
        (a * b * b) / 4,
        'Sustituye la mitad de la raíz positiva.',
      ),
      n(
        'Halla el área encerrada entre la curva y el eje horizontal.',
        (a * b ** 3) / 6,
        'Integra el polinomio expandido entre las raíces.',
      ),
      n(
        'Halla la altura media de la curva en ese intervalo.',
        (a * b * b) / 6,
        'Divide la integral definida entre la longitud del intervalo.',
      ),
      e(
        'Explica por qué el área geométrica coincide aquí con la integral definida.',
        'En el intervalo ambos factores son no negativos y la gráfica queda sobre el eje horizontal.',
      ),
    ],
  }),
  'Optimización y tasas de cambio': (a, b) => {
    const w = a + b
    return {
      stem: `Se dispone de ${2 * w} metros de valla para cerrar tres lados de un rectángulo apoyado en un muro. Los dos lados perpendiculares al muro miden cada uno x metros.`,
      tasks: [
        n(
          `Si x vale ${a} m, halla el lado paralelo al muro.`,
          2 * b,
          'Resta las dos anchuras de la longitud disponible.',
        ),
        n(
          `Calcula el área si x vale ${a} m.`,
          2 * a * b,
          'Multiplica la anchura por el lado paralelo.',
        ),
        n(
          'Halla la anchura que maximiza el área.',
          w / 2,
          'Expresa el área como x por la valla restante e iguala su derivada a cero.',
        ),
        n(
          'Calcula el área máxima.',
          (w * w) / 2,
          'Sustituye la anchura crítica en la expresión del área.',
        ),
        n(
          `El plano inicial fijaba la anchura en ${a} m. ¿Cuántos metros cuadrados adicionales se consiguen con el diseño óptimo?`,
          (w * w) / 2 - 2 * a * b,
          'Resta el área del diseño inicial al área del vértice de la parábola cóncava.',
        ),
      ],
    }
  },
}
