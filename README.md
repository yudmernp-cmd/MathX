# MathX
Aplicación de práctica en español para Matemáticas IB de Nivel Medio. React, Vite y TypeScript generan y corrigen localmente ejercicios y simulacros reproducibles. El sitio utiliza KaTeX, Tailwind CSS y D3. Las fuentes tipográficas se sirven con la aplicación.

## Desarrollo
Usa Node.js 22.12 o posterior. Desde la raíz del repositorio ejecuta:

```sh
npm ci
npm run dev
```

## Verificación y producción
```sh
npm test
npm run build
npm run test:e2e
npm run preview
```

Playwright utiliza Chromium en /usr/bin/chromium cuando está disponible. En otro equipo instala el navegador con `npx playwright install chromium` o indica el ejecutable mediante `CHROMIUM_PATH`. La suite de navegador arranca una vista previa de dist. Para probar una instalación pública, configura `MATHX_TEST_URL` con su URL y ejecuta la misma suite.

## Motor y evaluación
En ejercicios se puede seleccionar un tema completo o uno de los subtemas disponibles para la asignatura y prueba. Los controles y el generador comparten el mismo catálogo. La selección Mixto distribuye los niveles en la práctica continuada. Los simulacros recorren los cinco temas con un presupuesto de puntos fijo. La clasificación de dificultad y el reparto de preguntas entre secciones son decisiones de práctica de MathX.

Las familias de src/math definen su curso, restricciones de muestreo, contexto, incógnitas, dependencias, pasos y criterios. Los parámetros se eligen en intervalos discretos que garantizan denominadores positivos, grupos no vacíos y dominios válidos. Cada estructura parte de datos directos o inversos. El nivel básico incorpora ayudas y los niveles superiores incluyen preguntas de combinación o inversión. La semilla mostrada y la configuración reproducen la generación de la misma versión mediante `exercise(config, seed)` o `exam(config, seed)`.

El ensamblador selecciona prefijos de incisos que conservan sus dependencias y baremos. Busca por suma exacta dentro de cada sección. MAI P1 tiene 12 preguntas cortas. MAI P2 tiene seis extensas. MAE combina seis preguntas cortas en A con tres extensas en B. Todos los modelos duran 90 minutos y suman 80 puntos.

Cada respuesta numérica correcta verifica un punto de resultado. Las expresiones admiten operaciones aritméticas, potencias, raíces, pi y logaritmos (ln natural y log decimal). Los puntos de método quedan para revisión cuando hay procedimiento escrito. El razonamiento abierto se contrasta con la solución y sus criterios. Los espacios en blanco no suman puntos. El temporizador usa una hora absoluta de vencimiento. La sesión y la selección reciente se conservan en sessionStorage de la pestaña.

Las pruebas incluyen recálculos independientes, enumeraciones de sucesos, ajuste por mínimos cuadrados, integración y comprobación de combinaciones de familias y semillas. Consulta docs/fuentes.md y docs/fuentes.csv para el alcance académico verificado.

## Vercel
El proyecto usa el preset Vite, el comando `npm run build` y la carpeta de salida `dist`. Con una cuenta de Vercel autorizada, se puede importar el repositorio o ejecutar `vercel deploy --prod` desde la raíz. La aplicación desplegada no requiere variables de entorno, claves ni servidor de pago.
