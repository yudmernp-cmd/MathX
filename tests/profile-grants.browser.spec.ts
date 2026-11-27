import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'

test('desde Usuarios el profesor concede y equipa beneficios que el alumno puede usar en su perfil', async ({ page, browser, request }) => {
  test.skip(!!process.env.MATHX_TEST_URL, 'Usa cuentas de un aula local de pruebas.')
  await page.goto('/')
  const origin = new URL(page.url()).origin
  const headers = { Origin: origin }
  const endpoint = (action: string) => '/api/classroom?action=' + action
  expect((await page.request.post(endpoint('login'), { headers, data: { admin: true, password: process.env.MATHX_ADMIN_PASSWORD } })).ok()).toBeTruthy()
  const name = 'Perfil asignado ' + randomUUID().slice(-8)
  const account = await (await page.request.post(endpoint('enroll'), { headers, data: { name } })).json()
  await page.reload()
  await page.getByRole('button', { name: 'Usuarios', exact: true }).click()
  await page.getByLabel('Buscar por nombre').fill(name)
  await page.getByRole('button', { name: new RegExp(name + ' Cuenta ') }).click()
  const grants = page.getByRole('region', { name: 'Beneficios de perfil' })
  const button = grants.getByRole('button', { name: 'Asignar beneficio', exact: true })
  async function select(kind: string, id: string, equip: boolean) {
    await grants.getByRole('combobox', { name: 'Tipo de beneficio', exact: true }).selectOption(kind)
    await grants.getByRole('combobox', { name: 'Beneficio', exact: true }).selectOption(id)
    await grants.getByLabel('Equipar ahora en el perfil').setChecked(equip)
  }
  async function assign(label: string) {
    await button.click()
    await expect(grants.getByRole('status')).toContainText('«' + label + '»')
  }
  await select('color', 'ruby', false)
  await assign('Rubí')
  const ctx = await browser.newContext({ baseURL: origin, viewport: page.viewportSize()! })
  try {
    const login = await ctx.request.post(endpoint('login'), { headers, data: account })
    expect(login.ok()).toBeTruthy()
    const url = endpoint('student-benefits&id=' + (await login.json()).id)
    expect((await request.get(url)).status()).toBe(401)
    expect((await ctx.request.get(url)).status()).toBe(403)
    expect((await ctx.request.post(url, { headers, data: { kind: 'color', id: 'gold', equip: true } })).status()).toBe(403)
    const pupil = await ctx.newPage()
    await pupil.goto('/')
    await pupil.getByRole('button', { name: 'Mi aula', exact: true }).click()
    await pupil.getByRole('button', { name: 'Personalizar perfil' }).click()
    const editor = pupil.getByRole('dialog', { name: 'Personalizar perfil' })
    await expect(editor.getByLabel('Color del nombre').locator('option[value="ruby"]')).toBeEnabled()
    await expect(editor.getByLabel('Marco de perfil').locator('option[value="ruby"]')).toBeDisabled()
    await editor.getByLabel('Color del nombre').selectOption('ruby')

    await select('frame', 'geometry', true)
    await assign('Marco de geometría')
    await select('title', 'functions', true)
    await assign('Analista de funciones')
    for (const [id, label] of [['first-batch','Primera tanda'], ['weeks','Constancia'], ['recovery','Recuperación']]) {
      await select('badge', id, true)
      await assign(label)
    }
    await select('badge', 'band-7', true)
    await expect(button).toBeDisabled()
    await grants.getByLabel('Insignia destacada que se sustituirá').selectOption('weeks')
    await assign('Banda 7')
    expect(await grants.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)

    // The editor was open before the teacher equipped the frame, title and badges.
    await editor.getByRole('button', { name: 'Guardar perfil' }).click()
    await expect(editor.getByRole('status')).toHaveText('Perfil guardado.')
    await expect(editor.getByLabel('Marco de perfil')).toHaveValue('geometry')
    await expect(editor.getByRole('checkbox', { name: 'Banda 7 · Del profesor' })).toBeChecked()
    await expect(editor.getByRole('checkbox', { name: 'Constancia · Del profesor' })).not.toBeChecked()
    await editor.getByRole('button', { name: 'Cerrar' }).click()
    await pupil.getByRole('button', { name: 'Clasificaciones', exact: true }).click()
    const entry = pupil.getByRole('button', { name: 'Ver perfil de ' + name, exact: true })
    await expect(entry.locator('.tier-ruby')).toContainText(name)
    await expect(entry.locator('.avatar')).toHaveAttribute('data-frame', 'geometry')
    await entry.click()
    const card = pupil.getByRole('dialog', { name: 'Perfil del aula' })
    await expect(card.getByText('Analista de funciones')).toBeVisible()
    await expect(card.getByText('Asignadas por el profesor')).toBeVisible()
    await expect(card.locator('.academic-identity li')).toHaveCount(3)
    await expect(card.getByText('Constancia', { exact: true })).toHaveCount(1)
  } finally { await ctx.close() }
})
