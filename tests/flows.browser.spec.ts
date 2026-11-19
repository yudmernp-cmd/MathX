import { test, expect, type Page } from '@playwright/test'
import { storageKey, type Run } from '../src/math/session'
const qStemValue = (stem: string, label: string) =>
  stem.split(label)[1]?.match(/-?\d+/)?.[0]
const saved = (page: Page) =>
  page.evaluate(
    (k) => JSON.parse(sessionStorage.getItem(k)!) as Run,
    storageKey,
  )
test.beforeEach(async ({ page }) => {
  await page.goto('/')
})
test.afterEach(async ({ page }) => {
  expect(await page.locator('.katex-error').count()).toBe(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
test('configuración, respuesta, solución y otro ejercicio', async ({
  page,
}) => {
  await page.getByLabel('Asignatura').selectOption('MAE')
  await expect(page.locator('.summary')).toContainText('Sin calculadora')
  await page.getByRole('button', { name: 'Prueba 2', exact: true }).click()
  await page.getByRole('button', { name: 'Avanzado', exact: true }).click()
  await expect(page.locator('.summary')).toContainText('Gráfica requerida')
  await page.getByRole('button', { name: 'Empezar práctica' }).click()
  const r = await saved(page),
    q = r.questions[0]
  await page.locator('#answer0-0').fill('(' + q.parts[0].value + '*2)/2')
  await page.locator('#answer0-1').fill('texto')
  await page.getByRole('button', { name: 'Comprobar respuestas' }).click()
  await expect(
    page.getByText('Resultado correcto · 1 punto verificado'),
  ).toBeVisible()
  await expect(page.getByText('Formato no reconocido')).toBeVisible()
  await page.getByRole('button', { name: 'Ver solución' }).click()
  await expect(
    page.getByText('Criterios · 1 punto por criterio').first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Ocultar solución' }).click()
  await page.getByRole('button', { name: 'Volver a intentar' }).click()
  await expect(page.locator('#answer0-0')).toBeEditable()
  await page.getByRole('button', { name: 'Siguiente ejercicio' }).click()
  expect((await saved(page)).questions[0].family).not.toBe(q.family)
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Configura tu práctica' }),
  ).toBeVisible()
})
test('simulacro MAE, navegación, persistencia, revisión y salida', async ({
  page,
}) => {
  await page.getByLabel('Asignatura').selectOption('MAE')
  await page.getByRole('button', { name: 'Simulacros' }).click()
  await page.getByRole('button', { name: 'Empezar simulacro' }).click()
  const r = await saved(page)
  await page.locator('#answer0-0').fill(String(r.questions[0].parts[0].value))
  await page.locator('.part summary').first().click()
  await page.getByLabel('Procedimiento a', { exact: true }).fill('Mi cálculo')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.reload()
  await expect(
    page.getByText('PREGUNTA 2 · SECCIÓN A', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Anterior' }).click()
  await expect(page.locator('#answer0-0')).toHaveValue(
    String(r.questions[0].parts[0].value),
  )
  await page.getByRole('button', { name: 'Pregunta 9', exact: true }).click()
  await expect(page.getByText('PREGUNTA 9 · SECCIÓN B')).toBeVisible()
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar resolviendo' }).click()
  await page
    .getByRole('button', { name: 'Finalizar simulacro', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: 'Confirmar finalización' }).click()
  await expect(page.locator('.result')).toContainText(
    '1 punto verificado · 1 pendiente de revisión · 80 puntos posibles',
  )
  await expect(page.locator('.solution').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('#answer8-0')).toHaveAttribute('readonly', '')
  await page.getByRole('button', { name: 'Volver a configuración' }).click()
  await expect(
    page.getByRole('button', { name: 'Empezar simulacro' }),
  ).toBeVisible()
})
test('el cronómetro cierra el simulacro tras 90 minutos', async ({ page }) => {
  await page.clock.install()
  await page.getByRole('button', { name: 'Simulacros' }).click()
  await page.getByRole('button', { name: 'Empezar simulacro' }).click()
  await page.clock.fastForward('01:30:01')
  await expect(
    page.getByRole('heading', { name: 'Revisión del simulacro' }),
  ).toBeVisible()
  await expect(page.locator('.result')).toContainText('0 puntos verificados')
  await expect(page.locator('#answer0-0')).toHaveAttribute('readonly', '')
})
test('descartar una sesión requiere confirmar', async ({ page }) => {
  await page.getByRole('button', { name: 'Simulacros' }).click()
  await page.getByRole('button', { name: 'Empezar simulacro' }).click()
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Configura tu práctica' }),
  ).toBeVisible()
})

test('práctica por subtema, solución, persistencia y cambio de asignatura', async ({
  page,
}) => {
  await page.getByLabel('Asignatura', { exact: true }).selectOption('MAE')
  await page.getByLabel('Tema', { exact: true }).selectOption('Funciones')
  await page
    .getByLabel('Subtema', { exact: true })
    .selectOption({ label: 'Funciones exponenciales' })
  await page.getByRole('button', { name: 'Avanzado', exact: true }).click()
  await expect(page.locator('.summary')).toContainText(
    'Funciones exponenciales',
  )
  await page.getByRole('button', { name: 'Empezar práctica' }).click()
  await expect(
    page.getByRole('heading', { name: 'Funciones exponenciales', exact: true }),
  ).toBeVisible()
  const r = await saved(page)
  expect(r.questions[0]).toMatchObject({
    family: 'exponenciales',
    level: 'Avanzado',
    theme: 'Funciones',
  })
  // Reconstruct the growth factor directly from the three displayed observations.
  const rows = await page.locator('tbody tr').allTextContents()
  expect(rows).toHaveLength(r.questions[0].variant ? 2 : 3)
  const observations = (
    await page.locator('tbody td:last-child').allTextContents()
  ).map(Number)
  const ratio =
    (observations[2] - observations[1]) / (observations[1] - observations[0])
  const offset = Number(qStemValue(r.questions[0].stem, 'asíntota es'))
  const target = Number(qStemValue(r.questions[0].stem, 'lectura es'))
  const decay = Math.sqrt(
    (observations[1] - offset) / (observations[0] - offset),
  )
  const inverseTime =
    Math.log((target - offset) / (observations[0] - offset)) / Math.log(decay)
  await page
    .locator('#answer0-0')
    .fill(String(r.questions[0].variant ? inverseTime : ratio))
  await page.getByRole('button', { name: 'Comprobar respuestas' }).click()
  await expect(page.locator('.feedback').first()).toContainText(
    'Resultado correcto',
  )
  await page.getByRole('button', { name: 'Ver solución' }).click()
  await expect(page.locator('.solution').first()).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente ejercicio' }).click()
  await page.reload()
  const next = await saved(page)
  expect(next.questions[0].family).toBe('exponenciales')
  expect(next.questions[0].variant).not.toBe(r.questions[0].variant)
  await expect(page.getByText('PREGUNTA 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  await page
    .getByLabel('Tema', { exact: true })
    .selectOption('Geometría y trigonometría')
  await page.getByLabel('Subtema', { exact: true }).selectOption('sectores')
  await page.getByLabel('Asignatura', { exact: true }).selectOption('MAI')
  await expect(page.getByLabel('Subtema', { exact: true })).toHaveValue('')
  await expect(
    page
      .getByLabel('Subtema', { exact: true })
      .locator('option[value=sectores]'),
  ).toHaveCount(0)
  await page.getByLabel('Subtema', { exact: true }).selectOption('voronoi')
  await page.getByRole('button', { name: 'Simulacros', exact: true }).click()
  await expect(page.getByLabel('Tema', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Subtema', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Empezar simulacro' }).click()
  const sim = await saved(page)
  expect(
    new Set(sim.questions.map((q) => q.theme)).size,
  ).toBeGreaterThanOrEqual(3)
  expect(sim.config.subtopic).toBeUndefined()
})

test('la práctica sigue generando y corrigiendo sin red después de cargar', async ({
  page,
  context,
}) => {
  await page.getByRole('heading', { name: 'Configura tu práctica' }).waitFor()
  await context.setOffline(true)
  try {
    await page.getByRole('button', { name: 'Empezar práctica' }).click()
    const run = await saved(page)
    await page
      .locator('#answer0-0')
      .fill(String(run.questions[0].parts[0].value))
    await page.getByRole('button', { name: 'Comprobar respuestas' }).click()
    await expect(page.locator('.feedback').first()).toContainText(
      'Resultado correcto',
    )
    await page.getByRole('button', { name: 'Siguiente ejercicio' }).click()
    await expect(page.getByText('PREGUNTA 2', { exact: true })).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})
