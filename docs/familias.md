# Familias de problemas

| Familia | Conceptos y datos que varían | Variantes y condiciones de validez |
|---|---|---|
| Tarifas | Pendiente, cuota fija, punto de cruce, presupuesto | Deducir una tarifa de una gráfica o reconstruirla con dos facturas. Tiempos distintos, pendientes positivas y ecuaciones de cruce con solución única. |
| Capital | Interés compuesto y simple, inflación, años enteros | Proyectar desde el depósito o recuperar el capital a partir de un saldo posterior. Capital positivo, tasas constantes y umbral entre saldos consecutivos. |
| Muestras | Frecuencias, posición central, varianza y muestreo | Tabla completa o frecuencia desconocida con tamaño conocido. Dos extremos equidistantes con igual frecuencia y bloque central impar. |
| Probabilidad condicionada | Cuatro frecuencias, condicionamiento, independencia | Unión de sucesos desde una tabla completa o reconstrucción de una celda para invertir el condicionamiento. Cada subgrupo tiene al menos dos personas. |
| Triángulos | Semejanza, razones trigonométricas y alturas | Calcular la hipotenusa desde los catetos o recuperar la altura con cable y base. Ternas pitagóricas escaladas por enteros positivos. |
| Depósito | Derivada, acumulación, máximo, tasa media | Obtener la tasa desde el volumen o integrar la tasa dada una condición inicial. Máximo interior y volumen positivo en todo el intervalo indicado. |
| Sucesión | Término general, suma, reindexación | Progresión directa o reconstrucción a partir de términos no consecutivos. Índices distintos, diferencia positiva y suma estrictamente creciente. |
| Parábola | Raíces, vértice, desigualdad e integral | Forma de vértice o forma factorizada con un punto adicional. Raíces distintas y simétricas, concavidad negativa y área positiva. |
| Ajuste | Regresión, residuos, variación explicada | Ajustar una recta desde observaciones o evaluar una recta propuesta. Temperaturas equiespaciadas y distintas, residuos no nulos ortogonales a 1 y a x. |
| Lotes | Esperanza, complemento, distribución binomial y umbral | Partir de la probabilidad o deducirla de la media. Número entero de señales, independencia y probabilidad estrictamente entre cero y uno. |

Cada familia contiene un contexto común y hasta cinco incisos dependientes. La configuración básica facilita una relación de partida. Los niveles intermedio y avanzado cambian las demandas de cálculo, inversión o interpretación. La dificultad es una clasificación editorial. Los pasos de solución y el baremo están junto al generador de cada familia en src/math. Las pruebas de tests/oracles.unit.test.ts calculan resultados por separado.
