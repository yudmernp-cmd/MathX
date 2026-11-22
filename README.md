# MathX

Aula privada de Matemáticas IB · Aplicaciones e Interpretación, Nivel Medio. React, TypeScript, Vite y KaTeX. El acceso compartido, la selección de preguntas y la entrega de figuras se comprueban en una función de Node.js. El navegador recibe únicamente el catálogo de subtemas y las preguntas de la sesión escogida.

## Desarrollo y despliegue

Utiliza Node 24. Configura `MATHX_ADMIN_PASSWORD` (una clave exclusiva del administrador) y `MATHX_SESSION_SECRET` (un secreto aleatorio estable de al menos 32 caracteres). En producción conecta al proyecto un almacén privado de Vercel Blob con `BLOB_READ_WRITE_TOKEN`. En desarrollo local se utiliza SQLite en `.private/classroom.sqlite`. Conserva el secreto de sesión: protege también las huellas del DNI y del código. El acceso individual sustituye a la antigua clave de aula.

En Administración, inscribe a cada estudiante con su nombre y DNI peruano de ocho dígitos y entrégale el código de seis dígitos por un canal privado. El DNI y el código se guardan como huellas con clave. Las clasificaciones del aula solo muestran nombres y puntos. Cada ejercicio distinto acertado suma un punto. Activar la convocatoria abre el top de simulacros; registra el mejor resultado verificado de cada participante en simulacros iniciados y entregados durante esa convocatoria. Cerrarla retira los resultados de esa convocatoria. Los ejercicios conservan su acumulado.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
npm run preview
```

La compilación prepara la reserva en SQLite y el sitio en `dist`. Vercel empaqueta `server-data/bank.sqlite` y el generador `server-data/exam-originals.cjs` con `api/classroom.mjs`. Configura las variables en el ámbito Production y vuelve a desplegar al cambiarlas. La sesión dura ocho horas y utiliza una cookie firmada, Secure, HttpOnly y SameSite=Strict. La página de acceso es pública. El catálogo, el contenido de los ejercicios y las imágenes requieren una sesión vigente. Las respuestas de una sesión abierta se conservan en la pestaña.

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
