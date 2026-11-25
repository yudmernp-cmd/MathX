# MathX

Aula privada de Matemáticas IB · Aplicaciones e Interpretación, Nivel Medio. React, TypeScript, Vite y KaTeX. El acceso compartido, la selección de preguntas y la entrega de figuras se comprueban en una función de Node.js. El navegador recibe únicamente el catálogo de subtemas y las preguntas de la sesión escogida.

## Desarrollo y despliegue

Utiliza Node 24. Configura `MATHX_ADMIN_PASSWORD` (una clave exclusiva del administrador) y `MATHX_SESSION_SECRET` (un secreto aleatorio estable de al menos 32 caracteres). En producción conecta al proyecto un almacén privado de Vercel Blob con `BLOB_READ_WRITE_TOKEN`. En desarrollo local se utiliza SQLite en `.private/classroom.sqlite`. Conserva el secreto de sesión: protege también las huellas del DNI y del código. El acceso individual sustituye a la antigua clave de aula.

En Administración, inscribe a cada estudiante con su nombre y DNI peruano de ocho dígitos y entrégale el código de seis dígitos por un canal privado. La autenticación verifica el DNI y el código mediante huellas con clave. El padrón guarda además una copia cifrada de estos campos para su consulta individual por el administrador. Las cuentas antiguas completan estos datos en su próximo ingreso correcto. En **Administración → Usuarios** se puede buscar por nombre o DNI, consultar o renovar el código, reiniciar el avance y eliminar una cuenta. El reinicio elimina las entregas y los puntos de ese alumno e inicia un historial de práctica nuevo. Las clasificaciones del aula solo muestran nombres y puntos. Cada ejercicio distinto acertado suma un punto. Cada reto corregido aporta entre 0 y 20 puntos al top de ejercicios. Si el profesor modifica la nota, se aplica la diferencia.

## Actividades del profesor

En **Administración → Asignar actividad**, el profesor puede escribir un reto con una solución opcional o seleccionar una pregunta del banco privado de Prueba 1 o 2. Se admite un reto diario avanzado por fecha de Lima. Para convocar un simulacro común de 80 puntos, elige la prueba, las fechas de apertura y cierre y la duración (90 minutos por defecto). El top de esa convocatoria se puede mostrar u ocultar.

El estudiante abre la actividad desde **Mi aula**. El servidor conserva respuestas y procedimientos confirmados y recoge el último borrador guardado al vencer el plazo. Las notas se publican en **Entregas para revisar**. El profesor puntúa el reto sobre 20 y el simulacro por pregunta sobre un total de 80. El alumno puede consultar su entrega, las observaciones y el desglose del simulacro. Las soluciones de referencia se habilitan después del cierre para toda la clase.

Al abrir un reto se solicita pantalla completa. **Avisos del reto** muestra los eventos de visibilidad y pantalla completa que comunica el navegador. Se comprueba la conexión cada 45 segundos y el panel muestra interrupción tras más de 90 segundos sin señal durante un intento activo. Un corte abrupto puede impedir el envío del último evento. Los avisos no modifican las notas.

El progreso individual y del aula cuenta ejercicios distintos practicados, resueltos y acertados al primer intento desde la incorporación del seguimiento. El resumen semanal usa la hora de Lima. Los puntos anteriores se conservan.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
npm run preview
```

La compilación prepara la reserva en SQLite y el sitio en `dist`. Vercel empaqueta `server-data/bank.sqlite` y el generador `server-data/exam-originals.cjs` con `api/classroom.mjs`. Configura las variables en el ámbito Production y vuelve a desplegar al cambiarlas. La sesión dura ocho horas y utiliza una cookie firmada, Secure, HttpOnly y SameSite=Strict. La página de acceso es pública. El catálogo, el contenido de los ejercicios y las imágenes requieren una sesión vigente. Las respuestas de una sesión abierta se conservan en la pestaña.

## Simulacro Pro

El alumno elige Prueba 1 o Prueba 2 y recibe un cuadernillo completo al azar de la carpeta de Drive del aula. Las copias idénticas cuentan una sola vez en el sorteo. La sesión dura 90 minutos y conserva el cuadernillo y las respuestas al recargar la misma pestaña. El resultado queda disponible para repaso personal, sin calificación automática.

La preparación local extrae los enunciados de los PDF privados y los traduce al español con el modelo inglés-español de Argos en CPU. Conserva la numeración, los puntajes y las figuras originales. La interfaz presenta una pregunta a la vez y coloca un campo de respuesta debajo de cada inciso y subinciso. Si la pregunta es indivisible, muestra un único campo. La API comprueba la asignación antes de servir el texto o una figura. Para actualizar la colección desde Drive, ejecuta `npm run pro:prepare -- --refresh`. La preparación utiliza Python 3.12 con dependencias aisladas y reutiliza la edición local cuando coinciden la fuente y la versión del importador.

Vercel abre la edición cifrada durante la compilación. Así puede desplegar el contenido ya traducido aunque Drive o el modelo de traducción estén temporalmente indisponibles. Para publicar una edición actualizada, ejecuta `node tools/pro_delivery.mjs pack editions/pro-recipient.json` después de prepararla localmente e incluye el archivo JWE resultante en el despliegue. La clave pública del aula está en `/.well-known/mathx-pro-recipient.json`. La clave privada se deriva de `MATHX_SESSION_SECRET` en el servidor. Una rotación de ese secreto requiere volver a cifrar la edición para la nueva clave pública antes de desplegar.

## Banco del aula

```sh
npm run bank:prepare
npm run bank:prepare -- --add 20
npm run bank:report
```

La reserva empieza con veinte semillas por familia, prueba y dificultad. Cada enunciado pasa por el verificador matemático y se deduplica por contenido. El segundo comando amplía el intervalo de semillas por familia. Las siguientes compilaciones locales conservan ese tamaño. En un despliegue limpio puede fijarse con `MATHX_RESERVE_SIZE`.

En Ejercicios se elige uno de cinco temas y una dificultad de 1 a 5. Cada tanda incluye 15 tareas directas de cálculo, sin enunciados narrativos ni incisos. El servicio privado `POST /api/classroom?action=drills` devuelve el arreglo JSON de ejercicios con la clasificación solicitada. Distribuye la tanda entre todos los subtemas, asigna el resto a los primeros y alterna los subtemas durante la práctica. Los códigos y tipos siguen el catálogo indicado para MathX. En cada subtema de una tanda las tareas son de tipos distintos. Entre tandas se rotan los tipos, las representaciones disponibles y los datos.

El navegador registra las huellas de los enunciados en IndexedDB y conserva las respuestas y la posición de la tanda activa en la pestaña. Al terminar, el estudiante puede generar otra tanda del mismo tema. Los métodos vuelven a practicarse en tandas posteriores. Los registros de las versiones anteriores se conservan.

Los simulacros duran 90 minutos, permiten calculadora gráfica y suman exactamente 80 puntos. P1 combina seis originales y seis variantes de preguntas de examen. P2 usa tres originales y tres variantes extensas. El sexto problema de P2 permite el reparto igualitario solicitado para esta modalidad de práctica. El constructor selecciona instancias verificadas de cinco temas y tres niveles, con sus baremos. Cada variante conserva la puntuación de su fuente y recalcula sus datos y soluciones. Las 28 reglas de adaptación están vinculadas a una edición privada aprobada. Una edición sin suficientes fuentes compatibles devuelve un diagnóstico de disponibilidad.

La edición revisada se exporta con `python tools/bank.py export`. En producción, Vercel reconstruye el banco desde el secreto `MATHX_APPROVED_EDITION`, también en despliegues desde Git. Contiene la base aprobada comprimida y su suma SHA-256. Los cuadernillos y borradores permanecen en el espacio privado. Para actualizar o retirar preguntas, vuelve a exportar, reemplaza la edición y despliega. Conserva una copia privada de la edición exportada.

```sh
node tools/pack-edition.mjs | vercel env add MATHX_APPROVED_EDITION --environment production --sensitive --force --yes
```

La compilación local utiliza `server-data/approved.sqlite` cuando la variable está ausente. Una edición dañada detiene el build. Para ediciones que excedan el espacio disponible en las variables de Vercel, se puede desplegar el archivo desde el checkout privado mediante la CLI, retirando primero la variable de esa edición. En este modo, los despliegues posteriores necesitan el mismo archivo privado.

[Importador y revisión](docs/banco-privado.md) · [Resultados del piloto y la colección](docs/importacion.md) · [Fuentes y condiciones académicas](docs/fuentes.md)
