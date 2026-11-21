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

La compilación prepara la reserva en SQLite y el sitio en `dist`. Vercel empaqueta `server-data/bank.sqlite` con `api/classroom.mjs`. Configura las variables en el ámbito Production y vuelve a desplegar al cambiarlas. La sesión dura ocho horas y utiliza una cookie firmada, Secure, HttpOnly y SameSite=Strict. La página de acceso es pública. El catálogo, el contenido de los ejercicios y las imágenes requieren una sesión vigente. Las respuestas de una sesión abierta se conservan en la pestaña. Cambiar la clave o el secreto invalida las cookies anteriores.

## Banco del aula

```sh
npm run bank:prepare
npm run bank:prepare -- --add 20
npm run bank:report
```

La reserva empieza con veinte semillas por familia, prueba y dificultad. Cada enunciado pasa por el verificador matemático y se deduplica por contenido. El segundo comando amplía el intervalo de semillas por familia. Las siguientes compilaciones locales conservan ese tamaño. En un despliegue limpio puede fijarse con `MATHX_RESERVE_SIZE`.

El historial de ejercicios y simulacros se comparte entre las pestañas del mismo navegador y se conserva al salir del aula. Guarda identificadores en el dispositivo. Una sesión nueva excluye las preguntas ya reservadas. En los originales también descarta las versiones con los mismos dos primeros incisos y tipo de figura, aunque cambien los números o se elija otra prueba. Cuando se agotan las opciones compatibles, MathX lo indica. Para ampliar el número de ejercicios que puede resolver una persona con los mismos filtros, incorpora estructuras nuevas al banco.

Los simulacros tienen un límite de 90 minutos, 80 puntos y calculadora gráfica. MathX utiliza doce preguntas en P1 y cinco en P2, tamaños observados en la colección. En P1 reparte seis preguntas de cada origen. En P2 reparte tres de un origen y dos del otro. El constructor busca los cinco temas, las tres dificultades, baremos próximos entre fuentes y estructuras distintas. Respeta cada pregunta real completa. Un banco insuficiente devuelve un diagnóstico y deja disponible la práctica por temas. El informe administrativo prueba también tamaños alternativos cuando encuentra un conflicto.

La edición revisada se exporta con `python tools/bank.py export`. En producción, Vercel reconstruye el banco desde el secreto `MATHX_APPROVED_EDITION`, también en despliegues desde Git. Contiene la base aprobada comprimida y su suma SHA-256. Los cuadernillos y borradores permanecen en el espacio privado. Para actualizar o retirar preguntas, vuelve a exportar, reemplaza la edición y despliega. Conserva una copia privada de la edición exportada.

```sh
node tools/pack-edition.mjs | vercel env add MATHX_APPROVED_EDITION --environment production --sensitive --force --yes
```

La compilación local utiliza `server-data/approved.sqlite` cuando la variable está ausente. Una edición dañada detiene el build. Para ediciones que excedan el espacio disponible en las variables de Vercel, se puede desplegar el archivo desde el checkout privado mediante la CLI, retirando primero la variable de esa edición. En este modo, los despliegues posteriores necesitan el mismo archivo privado.

[Importador y revisión](docs/banco-privado.md) · [Resultados del piloto y la colección](docs/importacion.md) · [Fuentes y condiciones académicas](docs/fuentes.md)
