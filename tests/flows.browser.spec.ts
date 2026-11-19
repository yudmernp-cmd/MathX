import { test, expect, type Page } from '@playwright/test'
import { storageKey, type Run } from '../src/math/session'
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
  await expect(page.locator('.summary')).toContainText('Permitida')
  await page.getByRole('button', { name: 'Generar ejercicio' }).click()
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
  await page.getByRole('button', { name: 'Otro ejercicio' }).click()
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
  await page.getByRole('button', { name: /Simulacros Una/ }).click()
  await page.getByRole('button', { name: 'Iniciar simulacro' }).click()
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
    page.getByRole('button', { name: 'Iniciar simulacro' }),
  ).toBeVisible()
})
test('el cronómetro cierra el simulacro tras 90 minutos', async ({ page }) => {
  await page.clock.install()
  await page.getByRole('button', { name: /Simulacros Una/ }).click()
  await page.getByRole('button', { name: 'Iniciar simulacro' }).click()
  await page.clock.fastForward('01:30:01')
  await expect(
    page.getByRole('heading', { name: 'Revisión del simulacro' }),
  ).toBeVisible()
  await expect(page.locator('.result')).toContainText('0 puntos verificados')
  await expect(page.locator('#answer0-0')).toHaveAttribute('readonly', '')
})
test('descartar una sesión requiere confirmar', async ({ page }) => {
  await page.getByRole('button', { name: /Simulacros Una/ }).click()
  await page.getByRole('button', { name: 'Iniciar simulacro' }).click()
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Configura tu práctica' }),
  ).toBeVisible()
})
