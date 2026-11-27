# MathX

Aula privada de Matemáticas IB · Aplicaciones e Interpretación, Nivel Medio. React, TypeScript, Vite y KaTeX. El acceso compartido, la selección de preguntas y la entrega de figuras se comprueban en una función de Node.js. El navegador recibe únicamente el catálogo de subtemas y las preguntas de la sesión escogida.

## Desarrollo y despliegue

Utiliza Node 24. Configura `MATHX_ADMIN_PASSWORD` (una clave exclusiva del administrador) y `MATHX_SESSION_SECRET` (un secreto aleatorio estable de al menos 32 caracteres). En producción conecta al proyecto un almacén privado de Vercel Blob con `BLOB_READ_WRITE_TOKEN`. En desarrollo local se utiliza SQLite en `.private/classroom.sqlite`. Conserva el secreto de sesión: protege también las credenciales de acceso. El acceso individual sustituye a la antigua clave de aula.

En Administración, inscribe a cada estudiante con su nombre y entrégale el código de seis dígitos por un canal privado. Para ingresar, el alumno usa su nombre y su código personal. Los códigos distinguen incluso a alumnos con el mismo nombre. Las cuentas anteriores conservan su acceso y avance. En **Administración → Usuarios** se puede buscar por nombre, consultar o renovar el código, reiniciar el avance y eliminar una cuenta. El reinicio elimina las entregas y los puntos de ese alumno e inicia un historial de práctica nuevo. Desde **Mi aula → Foto de perfil**, cada alumno puede subir, cambiar o quitar su foto. La miniatura aparece junto a su nombre en las clasificaciones de ejercicios y pruebas. La cuenta docente administra su propia foto en **Administración → Actividades**. Cada ejercicio distinto acertado suma un punto. Cada reto corregido aporta entre 0 y 20 puntos al top de ejercicios. Si el profesor modifica la nota, se aplica la diferencia.

En **Mi aula → Personalizar perfil**, cada estudiante puede equipar un título académico, un marco, un color de nombre y hasta tres insignias. Las condiciones se consultan en **Cómo desbloquear los elementos**. El servidor reconoce los ejercicios resueltos y las pruebas revisadas que ya constan en el aula. Los días de práctica por tema y las consultas de soluciones se registran desde la incorporación de los perfiles. Las clasificaciones permiten abrir la tarjeta de otro estudiante del aula. Los logros se conservan tras una corrección de nota. Reiniciar el avance desde Administración también reinicia la colección.

En **Administración → Usuarios**, selecciona un alumno y abre **Beneficios de perfil**. Elige el tipo y el elemento que quieres conceder. **Asignar beneficio** lo añade a la colección de ese alumno. Marca **Equipar ahora en el perfil** para mostrárselo al aula al asignarlo. Si ya tiene tres insignias destacadas, puedes elegir cuál sustituir. Los rangos académicos se siguen calculando a partir de la práctica y de las pruebas revisadas.

## Actividades del profesor

En **Administración → Asignar actividad**, el profesor puede escribir un reto con una solución opcional o seleccionar una pregunta del banco privado de Prueba 1 o 2. Se admite un reto diario avanzado por fecha de Lima. Para convocar un simulacro común de 80 puntos, elige la prueba, las fechas de apertura y cierre y la duración (90 minutos por defecto). El top de esa convocatoria se puede mostrar u ocultar.

En **Actividades asignadas**, el profesor puede editar el título, la programación y las preguntas, cambiar la prueba de una convocatoria o volver a sortear sus preguntas. Los alumnos que ya empezaron conservan su versión y su tiempo asignado, con el límite del cierre vigente. Eliminar una actividad retira sus entregas y notas y descuenta los puntos que ese reto aportó al top de ejercicios.

El estudiante abre la actividad desde **Mi aula**. El servidor conserva respuestas y procedimientos confirmados y recoge el último borrador guardado al vencer el plazo. Las notas se publican en **Entregas para revisar**. El profesor puntúa el reto sobre 20 y el simulacro por pregunta sobre un total de 80. El alumno puede consultar su entrega, las observaciones y el desglose del simulacro. Al terminar una prueba, el alumno ve su solucionario. En los retos diarios las soluciones se habilitan al cierre para toda la clase.

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

## Resultados y revisiones

En **Pruebas tipo IB**, **Simulacro Pro** y las convocatorias, el alumno puede comparar sus respuestas y su procedimiento con el solucionario después de entregar. Las bandas de Prueba 1 empiezan en 0, 12, 20, 30, 39, 50 y 58 puntos. Las de Prueba 2 empiezan en 0, 11, 21, 30, 41, 53 y 63. La banda es provisional mientras queden puntos abiertos. Desde cada pregunta, **Solicitar revisión** conserva la respuesta original y envía el motivo al profesor. En **Administración → Actividades → Revisiones de pruebas**, el profesor puede cambiar los puntos y explicar su decisión. El alumno vuelve a consultar sus resultados desde **Mi aula**.

## Simulacro Pro

El alumno elige Prueba 1 o Prueba 2 y recibe un cuadernillo completo al azar de la carpeta de Drive del aula. Las copias idénticas cuentan una sola vez en el sorteo. La sesión dura 90 minutos y conserva el cuadernillo y las respuestas al recargar la misma pestaña. Al entregar, el alumno recibe un informe sobre 80 con los puntos por pregunta y la banda de su prueba. Los 43 cuadernillos tienen un solucionario propio de MathX en español. La corrección automática reconoce resultados numéricos y respuestas equivalentes admitidas. Las justificaciones abiertas y el crédito parcial se pueden revisar en Administración.

La preparación local extrae los enunciados de los PDF privados y los traduce al español con el modelo inglés-español de Argos en CPU. Conserva la numeración, los puntajes y las figuras originales. La interfaz presenta una pregunta a la vez y coloca un campo de respuesta debajo de cada inciso y subinciso. Si la pregunta es indivisible, muestra un único campo. La API comprueba la asignación antes de servir el texto o una figura. Para actualizar la colección desde Drive, ejecuta `npm run pro:prepare -- --refresh`. La preparación utiliza Python 3.12 con dependencias aisladas y reutiliza la edición local cuando coinciden la fuente y la versión del importador.

Vercel abre la edición cifrada durante la compilación. Así puede desplegar el contenido ya traducido aunque Drive o el modelo de traducción estén temporalmente indisponibles. Para publicar una edición actualizada, ejecuta `node tools/pro_delivery.mjs pack editions/pro-recipient.json` después de prepararla localmente e incluye el archivo JWE resultante en el despliegue. Para actualizar las soluciones privadas, valida los archivos de `.private/worked/<id>.json` y crea la edición cifrada con `node tools/pro_delivery.mjs pack-solutions editions/pro-recipient.json`. El despliegue comprueba las claves de cada inciso y los puntos de cada pregunta. La clave pública del aula está en `/.well-known/mathx-pro-recipient.json`. La clave privada se deriva de `MATHX_SESSION_SECRET` en el servidor. Una rotación de ese secreto requiere volver a cifrar la edición para la nueva clave pública antes de desplegar.

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
