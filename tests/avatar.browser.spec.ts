import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

test('el alumno sube y quita su foto desde Mi aula y la ve en la clasificación', async ({ page, request }) => {
  test.skip(!!process.env.MATHX_TEST_URL, 'Utiliza cuentas locales de prueba.')
  await page.goto('/')
  const origin = new URL(page.url()).origin
  const post = (action: string, data: object) => page.request.post('/api/classroom?action=' + action, { headers: { Origin: origin }, data })
  expect((await post('login', { admin: true, password: process.env.MATHX_ADMIN_PASSWORD })).ok()).toBeTruthy()
  const name = 'Foto ' + randomUUID().slice(-8)
  const account = await (await post('enroll', { name })).json()
  expect((await post('login', account)).ok()).toBeTruthy()
  await page.reload()
  await page.getByRole('button', { name: 'Mi aula', exact: true }).click()
  const editor = page.getByRole('region', { name: 'Foto de perfil' })
  await editor.getByLabel('Elegir foto de perfil').setInputFiles(path.resolve('public/mathx-cat.png'))
  await expect(editor.getByRole('status')).toHaveText('Foto de perfil guardada.')
  const src = await editor.locator('img').getAttribute('src')
  expect(src).toBeTruthy()
  expect((await request.get(src!)).status()).toBe(401)
  await page.getByRole('button', { name: 'Clasificaciones', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: name })
  await expect(row.locator('img')).toHaveAttribute('src', src!)
  await expect.poll(() => row.locator('img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(96)
  await page.getByRole('button', { name: 'Mi aula', exact: true }).click()
  await editor.getByRole('button', { name: 'Quitar foto' }).click()
  await expect(editor.getByRole('status')).toHaveText('Foto de perfil eliminada.')
  expect((await page.request.get(src!)).status()).toBe(404)
  await page.getByRole('button', { name: 'Clasificaciones', exact: true }).click()
  await expect(row).toContainText(name)
  await expect(row.locator('img')).toHaveCount(0)
})
