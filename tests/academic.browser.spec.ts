import { expect, test, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import type { Drill } from '../src/math/drills'

test('un estudiante equipa sus logros y otro ve su tarjeta dentro del aula', async ({ page, browser, request }) => {
  test.skip(!!process.env.MATHX_TEST_URL, 'Utiliza cuentas locales de prueba.')
  await page.goto('/')
  const origin = new URL(page.url()).origin
  const api = (p: Page, action: string, data: object) => p.request.post('/api/classroom?action=' + action, {
    headers: { Origin: origin }, data,
  })
  const json = async (action: string, data: object) => {
    const response = await api(page, action, data)
    expect(response.ok()).toBeTruthy()
    return response.json()
  }
  const name = 'Perfil ' + randomUUID().slice(-8)
  await json('login', { admin: true, password: process.env.MATHX_ADMIN_PASSWORD })
  const owner = await json('enroll', { name })
  const peer = await json('enroll', { name: 'Visita ' + randomUUID().slice(-8) })
  await json('login', owner)
  await page.reload()
  const openEditor = async () => {
    await page.getByRole('button', { name: 'Mi aula', exact: true }).click()
    await page.getByRole('button', { name: 'Personalizar perfil' }).click()
    return page.getByRole('dialog', { name: 'Personalizar perfil' })
  }
  const editor = await openEditor()
  await expect(editor.getByLabel('Color del nombre').locator('option[value="bronze"]')).toBeDisabled()
  await editor.getByText('Cómo desbloquear los elementos').click()
  await expect(editor.getByText('Resuelve 50 ejercicios distintos.')).toBeVisible()
  await editor.getByRole('button', { name: 'Cerrar' }).click()
  for (const tema of ['Funciones', 'Cálculo', 'Número y Álgebra', 'Geometría y Trigonometría']) {
    const batch: Drill[] = await json('drills', { tema, dificultad_objetivo: 3, cantidad: 15, trackBatch: true })
    expect(new Set(batch.map(q => q.slot)).size).toBe(15)
    for (const { signature, ...drill } of batch) {
      if (tema === 'Cálculo' && drill.slot! < 5) await json('submit', { signature, drill, answer: 'no sé' })
      expect((await json('submit', { signature, drill, answer: drill.respuesta })).correct).toBe(true)
    }
  }
  await page.getByRole('button', { name: 'Personalizar perfil' }).click()
  await editor.getByLabel('Color del nombre').selectOption('bronze')
  await editor.getByLabel('Marco de perfil').selectOption('bronze')
  await editor.getByLabel('Título académico').selectOption('perfect')
  for (const badge of ['Primera tanda', 'Tanda perfecta', 'Sin ayuda']) await editor.getByLabel(badge, { exact: true }).check()
  await expect(editor.getByLabel('Recuperación', { exact: true })).toBeDisabled()
  await editor.getByRole('button', { name: 'Guardar perfil' }).click()
  await expect(editor.getByRole('status')).toHaveText('Perfil guardado.')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Personalizar perfil' })).toBeFocused()
  await page.reload()
  await openEditor()
  await expect(editor.getByLabel('Marco de perfil')).toHaveValue('bronze')
  await expect(editor.getByLabel('Sin ayuda', { exact: true })).toBeChecked()
  const context = await browser.newContext({ baseURL: origin, viewport: page.viewportSize()! })
  try {
    const other = await context.newPage()
    await other.goto('/')
    expect((await api(other, 'login', peer)).ok()).toBeTruthy()
    await other.reload()
    await other.getByRole('button', { name: 'Clasificaciones', exact: true }).click()
    const link = other.getByRole('button', { name: 'Ver perfil de ' + name, exact: true })
    await expect(link.locator('.tier-bronze')).toContainText(name)
    await expect(link.locator('.avatar')).toHaveAttribute('data-frame', 'bronze')
    await link.click()
    const card = other.getByRole('dialog', { name: 'Perfil del aula' })
    await expect(card.getByText('Precisión matemática')).toBeVisible()
    await expect(card.getByText('Rango Bronce')).toBeVisible()
    await expect(card.getByText('Recuperación')).toBeVisible()
    await expect(card.locator('.academic-identity li')).toHaveCount(3)
    await expect(card.getByRole('combobox')).toHaveCount(0)
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  } finally { await context.close() }
  expect((await request.get('/api/classroom?action=academic-profile')).status()).toBe(401)
})
