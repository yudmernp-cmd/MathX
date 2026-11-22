# MathX

Aula privada de Matemáticas IB · Aplicaciones e Interpretación, Nivel Medio. React, TypeScript, Vite y KaTeX. El acceso compartido, la selección de preguntas y la entrega de figuras se comprueban en una función de Node.js. El navegador recibe únicamente el catálogo de subtemas y las preguntas de la sesión escogida.

## Desarrollo y despliegue

Utiliza Node 24. Configura dos variables de entorno en el proceso de desarrollo o en el proyecto de Vercel. `MATHX_CLASS_PASSWORD` contiene la clave compartida que el docente comunica por su canal habitual. `MATHX_SESSION_SECRET` contiene un secreto aleatorio privado de al menos 32 caracteres. Puedes generar ese segundo valor en tu propio gestor de secretos. Los valores se leen en el servidor. La ausencia de configuración cierra el aula. En desarrollo utiliza localhost para las cookies seguras.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
npm run preview
```

La compilación prepara la reserva en SQLite y el sitio en `dist`. Vercel empaqueta `server-data/bank.sqlite` y el generador `server-data/exam-originals.cjs` con `api/classroom.mjs`. Configura las variables en el ámbito Production y vuelve a desplegar al cambiarlas. La sesión dura ocho horas y utiliza una cookie firmada, Secure, HttpOnly y SameSite=Strict. La página de acceso es pública. El catálogo, el contenido de los ejercicios y las imágenes requieren una sesión vigente. Las respuestas de una sesión abierta se conservan en la pestaña. Cambiar la clave o el secreto invalida las cookies anteriores.

## Banco del aula

```sh
npm run bank:prepare
npm run bank:prepare -- --add 20
npm run bank:report
```

La reserva empieza con veinte semillas por familia, prueba y dificultad. Cada enunciado pasa por el verificador matemático y se deduplica por contenido. El segundo comando amplía el intervalo de semillas por familia. Las siguientes compilaciones locales conservan ese tamaño. En un despliegue limpio puede fijarse con `MATHX_RESERVE_SIZE`.

La práctica individual ofrece los cinco temas de MAI NM en tres dificultades. El catálogo de `server/individual` empieza con 60 estructuras originales. Tras las cuatro iniciales de un tema y dificultad, el generador combina condiciones del mismo tema y plantea una pregunta sobre los datos resultantes. Elige entre tres incógnitas por nivel y ocho tipos de datos por tema. Enumera combinaciones de longitud creciente y agrupa las permutaciones bajo la misma estructura. Cada estructura define la incógnita y sus relaciones matemáticas, un generador reproducible, una comprobación del resultado y una solución desarrollada. La pregunta tiene un único campo de respuesta. Las soluciones numéricas admiten expresiones cerradas, fracciones y resultados redondeados a tres cifras significativas.

El historial de IndexedDB asigna un identificador anónimo al perfil del navegador. Antes de mostrar una pregunta se reservan su huella de contenido y su huella matemática en una transacción compartida por todas las pestañas. Esta última deriva del modelo de la pregunta e ignora los parámetros numéricos, el tema, la dificultad y el texto. Las estructuras consumidas se excluyen también al elegir «Todos los temas». El contador compartido asigna a cada generación un turno único. Las huellas de la serie se comprueban directamente en IndexedDB para mantener pequeño el tamaño de las solicitudes. Al ampliar el catálogo hay que conservar los modelos canónicos de las estructuras ya publicadas. Los registros anteriores a la práctica individual se mantienen con la información que guardaba aquella edición. El historial depende de conservar los datos del sitio en ese perfil.

Los simulacros duran 90 minutos, permiten calculadora gráfica y suman exactamente 80 puntos. P1 combina seis originales y seis variantes de preguntas de examen. P2 usa tres originales y tres variantes extensas. El sexto problema de P2 permite el reparto igualitario solicitado para esta modalidad de práctica. El constructor selecciona instancias verificadas de cinco temas y tres niveles, con sus baremos. Cada variante conserva la puntuación de su fuente y recalcula sus datos y soluciones. Las 28 reglas de adaptación están vinculadas a una edición privada aprobada. Una edición sin suficientes fuentes compatibles devuelve un diagnóstico de disponibilidad.

La edición revisada se exporta con `python tools/bank.py export`. En producción, Vercel reconstruye el banco desde el secreto `MATHX_APPROVED_EDITION`, también en despliegues desde Git. Contiene la base aprobada comprimida y su suma SHA-256. Los cuadernillos y borradores permanecen en el espacio privado. Para actualizar o retirar preguntas, vuelve a exportar, reemplaza la edición y despliega. Conserva una copia privada de la edición exportada.

```sh
node tools/pack-edition.mjs | vercel env add MATHX_APPROVED_EDITION --environment production --sensitive --force --yes
```

La compilación local utiliza `server-data/approved.sqlite` cuando la variable está ausente. Una edición dañada detiene el build. Para ediciones que excedan el espacio disponible en las variables de Vercel, se puede desplegar el archivo desde el checkout privado mediante la CLI, retirando primero la variable de esa edición. En este modo, los despliegues posteriores necesitan el mismo archivo privado.

[Importador y revisión](docs/banco-privado.md) · [Resultados del piloto y la colección](docs/importacion.md) · [Fuentes y condiciones académicas](docs/fuentes.md)
