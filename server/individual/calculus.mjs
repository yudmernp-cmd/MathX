import { entry as E, item, close, f, table, range, sum } from './model.mjs'
export const calculus = [
  E(
    'Tasa instantánea',
    'Fácil',
    'm/s',
    ['evaluate', ['derivative', ['quadratic', 'time']], 'instant'],
    (a, b) => {
      const pos = (t) => a * t * t + b * t
      return item(
        `La posición de un vehículo de ensayo en metros se modeliza por $s(t)=${a}t^2+${b}t$ durante los primeros diez segundos.`,
        '¿Cuál es su velocidad instantánea a los tres segundos, en m/s?',
        6 * a + b,
        [
          `La velocidad es la derivada de la posición. La regla de la potencia da $s'(t)=${2 * a}t+${b}$.`,
          'Evalúa la derivada en $t=3$.',
        ],
        (x) => close(x, (pos(3 + 0.1) - pos(3 - 0.1)) / 0.2),
      )
    },
  ),
  E(
    'Acumulación a partir de una tabla',
    'Fácil',
    'L',
    ['trapezoid', 'single-linear-rate-interval'],
    (a, b) =>
      item(
        'Un sensor registra el caudal de una tubería. Entre las dos mediciones se supone que el caudal varía linealmente.',
        '¿Qué volumen en litros pasa por la tubería entre las dos mediciones?',
        a * (b + a),
        [
          `El intervalo dura ${a} minutos. Como el caudal es lineal, su promedio es la media de los dos extremos, ${b + a} L/min.`,
          `Multiplica el caudal promedio por los ${a} minutos para obtener el volumen.`,
        ],
        (x) => close(x, a * b + (a * (2 * a)) / 2),
        table(
          ['Tiempo (min)', 'Caudal (L/min)'],
          [
            [2, b],
            [2 + a, b + 2 * a],
          ],
        ),
      ),
  ),
  E(
    'Lectura de una tangente',
    'Fácil',
    'g',
    ['predict', ['local-linearization', 'point', 'given-slope']],
    (a, b) =>
      item(
        `A las 10 horas, un cultivo tiene una masa de ${b} g. En ese instante la pendiente de la curva masa-tiempo es ${a} g por hora.`,
        'Según la aproximación tangente en ese instante, ¿qué masa tendrá el cultivo quince minutos después, en gramos?',
        b + a / 4,
        [
          'Quince minutos corresponden a un cuarto de hora.',
          `La tangente predice un cambio de masa de $${a}\\cdot0.25$ g. Súmalo a los ${b} g iniciales.`,
        ],
        (x) => close((x - b) / 0.25, a),
      ),
  ),
  E(
    'Pendiente prescrita',
    'Medio',
    '',
    ['solve', ['equal', ['derivative', 'cubic'], 'given-slope'], 'positive'],
    (a, b) => {
      const slope = 3 * a * a + b
      return item(
        `Una trayectoria sigue $y=x^3+${b}x$ para $x>0$. Un tramo recto de referencia tiene pendiente ${slope}.`,
        '¿En qué abscisa es la tangente a la trayectoria paralela al tramo recto?',
        a,
        [
          `Las rectas paralelas tienen igual pendiente. La pendiente local de la curva es $3x^2+${b}$.`,
          `Resuelve $3x^2+${b}=${slope}$ y conserva la raíz compatible con $x>0$.`,
        ],
        (x) => x > 0 && close(3 * x * x + b, slope),
      )
    },
  ),
  E(
    'Recuperar una cantidad inicial',
    'Medio',
    'L',
    ['subtract', 'terminal-amount', ['integral', 'linear-rate']],
    (a, b) => {
      const terminal = b + 9 * a + 6
      return item(
        `Un tanque recibe un caudal neto de $q(t)=${2 * a}t+2$ L/min durante los primeros tres minutos. Al finalizar ese intervalo contiene ${terminal} L.`,
        '¿Cuántos litros contenía al comenzar el intervalo?',
        b,
        [
          `Integra el caudal: una primitiva es $${a}t^2+2t$. Entre 0 y 3 minutos entran ${9 * a + 6} L.`,
          'El contenido final incluye el volumen que entró. Resta esa aportación para recuperar el inicial.',
        ],
        (x) => close(x + (3 * (2 + (6 * a + 2))) / 2, terminal),
      )
    },
  ),
  E(
    'Ordenada de la tangente',
    'Medio',
    '',
    ['intercept', ['tangent', 'quadratic', 'point']],
    (a, b) => {
      const y = (x) => x * x + b,
        slope = 2 * a,
        intercept = b - a * a
      return item(
        `La sección de un reflector tiene perfil $y=x^2+${b}$. Se prolonga la tangente trazada en $x=${a}$.`,
        '¿En qué ordenada corta esa recta el eje vertical?',
        intercept,
        [
          `En el contacto, la ordenada es ${y(a)} y la pendiente dada por $2x$ vale ${slope}.`,
          `Escribe $y-${y(a)}=${slope}(x-${a})$ y sustituye $x=0$.`,
        ],
        (x) => close((y(a) - x) / a, slope),
      )
    },
  ),
  E(
    'Optimización con restricciones',
    'Difícil',
    'cm',
    ['argmax', ['volume', 'open-box', 'square-cut']],
    (a, b) => {
      const side = 6 * a
      return item(
        `Una lámina cuadrada de ${side} cm de lado se convierte en una caja sin tapa recortando en cada esquina un cuadrado de lado $x$ y plegando los bordes.`,
        '¿Qué longitud de corte, en centímetros, maximiza la capacidad de la caja?',
        a,
        [
          `El volumen es $V(x)=x(${side}-2x)^2$, con $0<x<${side / 2}$.`,
          `Al desarrollar y derivar se obtiene $V'(x)=(${side}-2x)(${side}-6x)$.`,
          'El único punto crítico interior cambia de crecimiento a decrecimiento y los extremos dan volumen cero.',
        ],
        (x) =>
          x > 0 &&
          x < side / 2 &&
          close(12 * x * x - 8 * side * x + side * side, 0),
      )
    },
  ),
  E(
    'Distancia recorrida',
    'Difícil',
    'm',
    ['integral', ['absolute', 'sign-changing-linear-velocity']],
    (a, b) => {
      const end = a + 4,
        distance = (b * (a * a + 16)) / 2
      return item(
        `En una guía recta, la velocidad con signo de una partícula es $v(t)=${b}(t-${a})$ m/s durante el intervalo $0\\le t\\le ${end}$.`,
        '¿Qué distancia total recorre la partícula en ese intervalo, en metros?',
        distance,
        [
          `La velocidad se anula en $t=${a}$ y cambia de signo. Para la distancia integra la rapidez $|v(t)|$.`,
          `La primera región triangular tiene área $${a}\\cdot${b * a}/2$ y la segunda, $4\\cdot${4 * b}/2$.`,
          'Suma las dos áreas positivas.',
        ],
        (x) =>
          close(x, sum(range(end).map((i) => Math.abs(b * (i + 0.5 - a))))),
      )
    },
  ),
  E(
    'Nivel máximo de un depósito',
    'Difícil',
    'L',
    ['maximum', ['integrated-state', 'rate-sign-change', 'initial-volume']],
    (a, b) => {
      const initial = 10 * b,
        end = 2 * a
      return item(
        `Un depósito contiene inicialmente ${initial} litros. Durante los siguientes ${end} minutos su caudal neto es $q(t)=${2 * a}-2t$ L/min. Los valores negativos representan salida de líquido.`,
        '¿Cuál es el volumen máximo que llega a contener, en litros?',
        initial + a * a,
        [
          `El caudal cambia de positivo a negativo en $t=${a}$. Allí el volumen deja de aumentar.`,
          `Desde el inicio hasta ese instante, la integral del caudal es $[${2 * a}t-t^2]_0^{${a}}=${a * a}$ L.`,
          'Suma el volumen acumulado a la cantidad inicial.',
        ],
        (x) =>
          close(
            x,
            Math.max(...range(end + 1).map((t) => initial + 2 * a * t - t * t)),
          ),
      )
    },
  ),

  E(
    'Cambio medio',
    'Fácil',
    'L/h',
    ['secant-slope', ['quadratic', 'interval']],
    (a, b) => {
      const g = (t) => b + a * t * t
      return item(
        `El volumen en litros de un cultivo líquido evoluciona según $V(t)=${b}+${a}t^2$ durante las primeras cinco horas.`,
        '¿Cuál es la tasa media de cambio del volumen entre la primera y la cuarta hora, en L/h?',
        5 * a,
        [
          `El volumen cambia de ${g(1)} a ${g(4)} litros en tres horas.`,
          'Divide el cambio de volumen entre la duración del intervalo.',
        ],
        (x) => close(g(1) + 3 * x, g(4)),
      )
    },
  ),
  E(
    'Integración de una curva',
    'Medio',
    'm²',
    ['area', ['integral', 'positive-quadratic-between-roots']],
    (a, b) =>
      item(
        `Una parcela está limitada por la curva $y=${a}x(${b}-x)$ y el eje horizontal entre $x=0$ y $x=${b}$. Las coordenadas se miden en metros.`,
        '¿Cuál es el área de la parcela, en metros cuadrados?',
        (a * b ** 3) / 6,
        [
          `En el intervalo la altura es no negativa. Integra $${a * b}x-${a}x^2$ entre los dos ceros.`,
          `Evalúa la primitiva $${a * b}x^2/2-${a}x^3/3$ en $x=${b}$ y resta su valor en cero.`,
        ],
        (x) => close(x, (b / 6) * 4 * ((a * b * b) / 4)),
      ),
  ),
  E(
    'Dimensionamiento de un envase',
    'Difícil',
    'cm',
    ['argmin', ['surface', 'closed-cylinder', 'fixed-volume']],
    (a, b) => {
      const volume = 2 * a ** 3
      return item(
        `Un envase cilíndrico cerrado debe contener $${volume}\\pi$ cm³. El espesor y las pérdidas de material en las uniones son despreciables.`,
        '¿Qué radio interior, en centímetros, minimiza la superficie de material?',
        a,
        [
          `La restricción de volumen da $h=${volume}/r^2$. Sustituye en $S=2\\pi r^2+2\\pi rh$.`,
          `La derivada es $S'(r)=4\\pi r-${2 * volume}\\pi/r^2$. Iguala a cero para obtener el único radio positivo.`,
          'La derivada pasa de negativa a positiva en ese radio, que da el mínimo.',
        ],
        (x) => x > 0 && close(2 * x, volume / x ** 2),
      )
    },
  ),
]
