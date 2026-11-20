# Importación y revisión privada

Ejecuta los comandos desde la raíz del repositorio. El proceso trabaja en `.private/` y utiliza Python, PyMuPDF y Pillow. Para OCR instala Tesseract y el idioma inglés. Si Tesseract no encuentra los datos, configura `TESSDATA_PREFIX` con el directorio que contiene `eng.traineddata`.

```sh
python -m venv .private/venv
.private/venv/bin/pip install -r tools/importer/requirements.txt
```

La traducción usa CTranslate2 y SentencePiece en CPU con el paquete gratuito inglés–español de Argos. Descarga el paquete desde el índice oficial de Argos y descomprímelo en `.private/models` para obtener `en_es/model` y `en_es/sentencepiece.model`. Una vez instalado el modelo, la traducción y el OCR se ejecutan localmente. [Índice de paquetes](https://github.com/argosopentech/argospm-index) · [Paquete inglés–español utilizado](https://argos-net.com/v1/translate-en_es-1_0.argosmodel)

```sh
.private/venv/bin/python tools/bank.py import --pilot 5 --model .private/models/en_es
.private/venv/bin/python tools/bank.py import --model .private/models/en_es
.private/venv/bin/python tools/bank.py report
```

El importador recorre la carpeta compartida y sus subcarpetas. Se puede cambiar el origen con `--drive URL` o usar `--local RUTA` con la carpeta completa. Si el listado anónimo está paginado o requiere autenticación, utiliza la opción local. El inventario registra los identificadores de Drive, nombres y cambios. Cada PDF se almacena por SHA-256. Cada documento se confirma por separado y los errores se registran. Repetir el comando permite reanudar. Para traducir una importación hecha sin el modelo, ejecuta `tools/bank.py translate --model .private/models/en_es` con el mismo Python.

## Qué se conserva

Cada directorio `.private/questions/SHA/número/` contiene el original inglés, posiciones de palabras, recortes por página y un borrador español editable. La detección usa coordenadas, numeración, etiquetas y puntuaciones impresas. Los recortes conservan gráficas, fracciones, superíndices, tablas y escalas que la capa de texto del PDF puede aplanar. Un mismo ejercicio puede abarcar varias páginas. La vista del estudiante admite fórmulas delimitadas por `$`, imágenes en el enunciado o en un inciso, y etiquetas de subincisos. Los resultados de OCR y las sugerencias sobre tema y dificultad requieren revisión. La ficha del documento distingue metadatos de portada e indicios del nombre de archivo.

## Revisión de un ejercicio

1. Obtén el identificador SHA/número en el inventario y abre la revisión local con `python tools/bank.py review SHA/número show`. Abre el archivo HTML indicado. Presenta los recortes, el texto original y el borrador español.
2. Edita `draft.json`. Contrasta el enunciado, las condiciones y todos los incisos con los recortes. Transcribe las expresiones en LaTeX cuando proceda y comprueba las unidades. Elige tema, subtema, etiquetas secundarias y uno de los tres niveles. La propuesta automática usa métodos e interpretación además de la dependencia de los incisos.
3. Conserva el total impreso y el reparto real de puntos. Un bloque introductorio sin respuesta puede llevar cero puntos. Si el OCR confundió los límites, documenta `sourceCorrection` con `reason`, `pages` y `transcript`. Esta transcripción inglesa contiene `stem`, `total` y la lista ordenada de apartados con `label`, `en` y `printed` (puntuaciones impresas del apartado). Sirve para contrastar la traducción con una lectura humana de las páginas. Registra también ahí la retirada de pies de página del texto recuperado.
4. Añade las figuras necesarias como WebP revisados dentro del directorio del ejercicio. En `assets`, cada elemento contiene `file`, una descripción española en `alt` y `part`. Usa −1 para una figura del enunciado o el índice del inciso empezando por cero. Comprueba la rotulación española y la correspondencia de los datos con la fuente.
5. Mantén `scheme` como `sin esquema` y los resultados numéricos en null mientras falte un baremo fiable. Para habilitar corrección, indica `revisado`, la referencia en `schemeReference`, los pasos y el baremo contrastados. Un inciso abierto conserva `value: null`. La puntuación automática distingue resultados numéricos, métodos pendientes y máximos sin esquema.
6. Resuelve las observaciones de `sourceChecks`, identifica al revisor en `reviewer` y confirma `translationReviewed`, `mathReviewed` y `graphicsReviewed`. Ejecuta `python tools/bank.py review SHA/número validate`. Para descartar un registro utiliza `reject`.
7. Con permiso documentado para traducir y mostrar la pregunta en esta aula, introduce su referencia en `rightsReference` y ejecuta `python tools/bank.py review SHA/número authorize`. Una modificación posterior del borrador, del original o de las figuras invalida la huella de autorización.
8. Ejecuta `python tools/bank.py export`, `npm run bank:prepare` y `npm run bank:report`. El exportador construye una nueva base de publicación con los registros autorizados y sus figuras aprobadas. Conserva los demás archivos en el almacén de revisión.

## Pruebas

`MATHX_TRANSLATOR_MODEL=.private/models/en_es .private/venv/bin/python tests/importer_test.py` ejecuta el recorrido con un PDF sintético propio. Incluye lectura de un escaneo, gráfico, cortes de página, duplicados, fichero corrupto, traducción, autorización y detección de ediciones posteriores. Las pruebas del constructor y del navegador usan datos sintéticos identificados y almacenados fuera de la reserva de producción.
