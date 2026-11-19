# Familias de problemas

| Familia | Conceptos y datos que varían | Variantes y condiciones de validez |
|---|---|---|
| Tarifas | Pendiente, cuota fija, punto de cruce, presupuesto | Deducir una tarifa de una gráfica o reconstruirla con dos facturas. Tiempos distintos, pendientes positivas y ecuaciones de cruce con solución única. |
| Capital | Interés compuesto y simple, inflación, años enteros | Proyectar desde el depósito o recuperar el capital a partir de un saldo posterior. Capital positivo, tasas constantes y umbral entre saldos consecutivos. |
| Muestras | Frecuencias, posición central, varianza y muestreo | Tabla completa o frecuencia desconocida con tamaño conocido. Dos extremos equidistantes con igual frecuencia y bloque central impar. |
| Probabilidad condicionada | Cuatro frecuencias, condicionamiento, independencia | Unión de sucesos desde una tabla completa o reconstrucción de una celda para invertir el condicionamiento. Cada subgrupo tiene al menos dos personas. |
| Triángulos | Semejanza, razones trigonométricas y alturas | Calcular la hipotenusa desde los catetos o recuperar la altura con cable y base. Ternas pitagóricas escaladas por enteros positivos. |
| Depósito | Derivada, acumulación, máximo, tasa media | Obtener la tasa desde el volumen o acumular el cambio por el área bajo una tasa lineal conocida. Máximo interior y volumen positivo en todo el intervalo indicado. |
| Sucesión | Término general, suma, reindexación | Progresión directa o reconstrucción a partir de términos no consecutivos. Índices distintos, diferencia positiva y suma estrictamente creciente. |
| Parábola | Raíces, vértice, desigualdad y traslación | Forma de vértice o forma factorizada con un punto adicional. Raíces distintas y simétricas, concavidad negativa y simetría conservada al trasladar la curva. |
| Ajuste | Regresión, residuos, correlación de Pearson | Ajustar una recta desde observaciones o evaluar una recta propuesta. Temperaturas equiespaciadas y distintas, residuos no nulos ortogonales a 1 y a x. |
| Lotes | Esperanza, complemento, distribución binomial y umbral | Partir de la probabilidad o deducirla de la media. Número entero de señales, independencia y probabilidad estrictamente entre cero y uno. |
| Exponenciales | Factor, asíntota, parámetros y cambio de escala | Reconstruir un modelo desplazado a partir de tres observaciones o recuperar la abscisa de una lectura. En MAE P1 se invierten potencias exactas y en las pruebas con calculadora se resuelve un umbral no entero. |
| Geométrica | Razón, suma parcial e índices | Partir de una fase inicial, dos fases separadas o una suma y una diferencia. Tamaños enteros positivos e índices crecientes. |
| Voronoi | Mediatrices, distancias y fronteras | Construir las regiones a partir de tres centros o reconstruir un centro por reflexión. Los sitios forman un triángulo no degenerado. |
| Sectores | Longitud de arco, área y radianes | Deducir el radio con área y arco o comparar sectores con un radio y un ángulo dados. Ángulos menores que una vuelta. |
| Tangentes | Derivada, ecuación de tangente y error | Derivar una cuadrática o recuperar un coeficiente desde una pendiente conocida. El error es cuadrático en el desplazamiento. |
| Independencia | Tabla de contingencia, frecuencias esperadas y contraste | Utilizar una tabla completa o reconstruir una frecuencia. Todas las frecuencias esperadas son al menos 9. |
| Movimiento | Integral de velocidad, desplazamiento y distancia | Partir de velocidad o aceleración con condición inicial. Se garantiza exactamente un cambio de sentido interior. |
| Normal | Tipificación, cuantiles, independencia y selección condicionada | Partir de los parámetros o deducirlos de dos valores tipificados. El área normal se contrasta mediante integración numérica. |

Cada familia contiene un contexto común y hasta cinco incisos dependientes. La configuración básica facilita una relación de partida. Los niveles intermedio y avanzado cambian las demandas de cálculo, inversión o interpretación. La dificultad es una clasificación editorial. Los pasos de solución y el baremo están junto al generador de cada familia en src/math. El generador contrasta las respuestas cerradas con un segundo cálculo en src/math/verification.ts antes de servir cada pregunta. Las pruebas también comprueban estructuras, opciones curriculares, tablas y comportamiento en el navegador.
