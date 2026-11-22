import { test, expect, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { storageKey, type Run } from '../src/math/session'

const saved = (page: Page) =>
  page.evaluate(
    (k) => JSON.parse(sessionStorage.getItem(k)!) as Run,
    storageKey,
  )
const button = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true })
const profiles = new WeakMap<
  Page,
  { name: string; dni: string; code: string }
>()
async function login(page: Page) {
  await page.goto('/')
  await expect(page.getByLabel('Código personal')).toBeVisible()
  let profile = profiles.get(page)
  if (!profile) {
    if (process.env.MATHX_TEST_URL) {
      profile = {
        name: process.env.MATHX_TEST_NAME!,
        dni: process.env.MATHX_TEST_DNI!,
        code: process.env.MATHX_TEST_CODE!,
      }
    } else {
      const origin = new URL(page.url()).origin
      const api = (action: string, data: object) =>
        page.request.post('/api/classroom?action=' + action, {
          headers: { Origin: origin },
          data,
        })
      expect(
        (
          await api('login', {
            admin: true,
            password: process.env.MATHX_ADMIN_PASSWORD,
          })
        ).ok(),
      ).toBeTruthy()
      const dni = String(10000000 + Math.floor(Math.random() * 90000000)),
        name = 'Estudiante de prueba'
      const r = await api('enroll', { dni, name })
      expect(r.ok()).toBeTruthy()
      profile = { dni, name, code: (await r.json()).code }
      await api('logout', {})
      await page.reload()
    }
    profiles.set(page, profile)
  }
  await page.getByLabel('Nombre', { exact: true }).fill(profile.name)
  await page.getByLabel('DNI', { exact: true }).fill(profile.dni)
  await page.getByLabel('Código personal').fill(profile.code)
  await button(page, 'Entrar al aula').click()
  await expect(
    page.getByRole('heading', { name: 'Configura tu práctica' }),
  ).toBeVisible()
}
test.afterEach(async ({ page }) => {
  await expect(page.locator('.katex-error')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
test('tanda de 15, corrección, soluciones, navegación y otra tanda', async ({
  page,
  request,
}) => {
  expect((await request.get('/api/classroom?action=catalog')).status()).toBe(
    401,
  )
  await login(page)
  await page
    .getByLabel('Tema', { exact: true })
    .selectOption({ label: 'Geometría y Trigonometría' })
  await button(page, '4').click()
  const response = page.waitForResponse((r) =>
    r.url().includes('action=drills'),
  )
  await button(page, 'Empezar práctica').click()
  const batch = await (await response).json()
  expect(batch).toHaveLength(15)
  const counts: Record<string, number> = {}
  for (const q of batch) {
    expect(q.dificultad).toBe(4)
    counts[q.subtema] = (counts[q.subtema] ?? 0) + 1
  }
  expect(counts).toEqual({
    '3.1': 3,
    '3.2': 3,
    '3.3': 3,
    '3.4': 2,
    '3.5': 2,
    '3.6': 2,
  })
  await expect(
    page.getByText('Ejercicio 1 de 15', { exact: true }),
  ).toBeVisible()
  const used = new Set((await saved(page)).questions.map((q) => q.wordingKey))
  for (let i = 0; i < 15; i++) {
    await expect(
      page.getByText('Ejercicio ' + (i + 1) + ' de 15', { exact: true }),
    ).toBeVisible()
    await expect(page.locator('.question input')).toHaveCount(1)
    await page.getByPlaceholder('Tu respuesta').fill(batch[i].respuesta)
    await button(page, 'Comprobar respuesta').click()
    await expect(page.getByRole('status')).toHaveText('Resultado correcto')
    await button(page, 'Ver solución').click()
    await expect(page.locator('.solution')).toBeVisible()
    await expect(page.locator('.katex-error')).toHaveCount(0)
    if (i === 3) {
      await page.reload()
      await expect(page.getByPlaceholder('Tu respuesta')).toHaveValue(
        batch[i].respuesta,
      )
      await button(page, 'Anterior').click()
      await expect(page.getByPlaceholder('Tu respuesta')).toHaveValue(
        batch[i - 1].respuesta,
      )
      await button(page, 'Siguiente ejercicio').click()
    }
    if (i < 14) await button(page, 'Siguiente ejercicio').click()
  }
  await button(page, 'Generar otra tanda').click()
  await expect(
    page.getByText('Ejercicio 1 de 15', { exact: true }),
  ).toBeVisible()
  expect(
    (await saved(page)).questions.every((q) => !used.has(q.wordingKey)),
  ).toBe(true)
})
test('dos pestañas y una sesión nueva evitan repetir enunciados', async ({
  page,
  context,
}) => {
  await login(page)
  const tab = await context.newPage()
  await tab.goto('/')
  await Promise.all(
    [tab, page].map((p) => button(p, 'Empezar práctica').click()),
  )
  for (const p of [tab, page])
    await expect(
      p.getByText('Ejercicio 1 de 15', { exact: true }),
    ).toBeVisible()
  const previous = [
    ...(await saved(tab)).questions,
    ...(await saved(page)).questions,
  ]
  expect(new Set(previous.map((q) => q.wordingKey)).size).toBe(30)
  await tab.close()
  await button(page, 'Salir del aula').click()
  await expect(page.getByLabel('Código personal')).toBeVisible()
  await login(page)
  await button(page, 'Empezar práctica').click()
  await expect(
    page.getByText('Ejercicio 1 de 15', { exact: true }),
  ).toBeVisible()
  expect(
    (await saved(page)).questions.every((q) =>
      previous.every((old) => old.wordingKey !== q.wordingKey),
    ),
  ).toBe(true)
})
for (const paper of [1, 2]) {
  test(
    'simulacro P' + paper + ' con la edición instalada, reloj y entrega',
    async ({ page }) => {
      await login(page)
      await button(page, 'Simulacros').click()
      await expect(page.getByLabel('Tema', { exact: true })).toHaveCount(0)
      await button(page, 'Prueba ' + paper).click()
      const response = page.waitForResponse((r) =>
        r.url().includes('action=exam'),
      )
      await button(page, 'Empezar simulacro').click()
      const status = (await response).status()
      if (
        !process.env.MATHX_TEST_URL &&
        !existsSync('server-data/approved.sqlite') &&
        status === 409
      ) {
        await expect(page.getByRole('alert')).toContainText('Faltan')
        await expect(page.locator('.timer')).toHaveCount(0)
        return
      }
      expect(status).toBe(200)
      await expect(page.locator('.timer')).toBeVisible()
      const run = await saved(page),
        qs = run.questions
      expect(qs.length).toBe(paper === 1 ? 12 : 6)
      expect(qs.filter((q) => q.origin === 'adapted')).toHaveLength(
        qs.length / 2,
      )
      expect(qs.filter((q) => q.origin === 'original')).toHaveLength(
        qs.length / 2,
      )
      expect(run.deadline - Date.now()).toBeGreaterThan(89 * 60000)
      expect(run.deadline - Date.now()).toBeLessThanOrEqual(90 * 60000)
      const index = qs.findIndex(
        (q) => q.origin === 'adapted' && q.parts.some((p) => p.value !== null),
      )
      await button(page, 'Pregunta ' + (index + 1)).click()
      const j = qs[index].parts.findIndex((p) => p.value !== null)
      const field = page.locator('#answer' + index + '-' + j)
      await field.fill(String(qs[index].parts[j].value))
      await page.reload()
      await expect(field).toHaveValue(String(qs[index].parts[j].value))
      if (paper === 2) {
        await page.clock.install()
        await page.clock.fastForward('01:30:01')
      } else {
        await page
          .getByRole('button', { name: 'Finalizar simulacro', exact: true })
          .first()
          .click()
        await button(page, 'Confirmar finalización').click()
      }
      await expect(page.locator('.result')).toContainText('80 puntos posibles')
      await expect(page.locator('.result')).toContainText('1 punto verificado')
      await expect(field).toHaveAttribute('readonly', '')
      await expect(page.locator('.solution').first()).toBeVisible()
    },
  )
}
test('una clave incorrecta conserva cerrado el catálogo', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Nombre', { exact: true }).fill('Prueba')
  await page.getByLabel('DNI', { exact: true }).fill('00000000')
  await page.getByLabel('Código personal').fill('000000')
  await button(page, 'Entrar al aula').click()
  await expect(page.getByRole('alert')).toContainText('incorrecta')
  expect(
    (await page.request.get('/api/classroom?action=catalog')).status(),
  ).toBe(401)
})

test('el administrador inscribe y abre una convocatoria visible para la clase', async ({
  page,
  browser,
}, info) => {
  test.skip(
    !!process.env.MATHX_TEST_URL || info.project.name === 'mobile',
    'Usa exclusivamente el aula local de pruebas.',
  )
  await page.goto('/')
  await button(page, 'Administración').click()
  await page
    .getByLabel('Clave de administración')
    .fill(process.env.MATHX_ADMIN_PASSWORD!)
  await button(page, 'Entrar al aula').click()
  const dni = String(10000000 + Math.floor(Math.random() * 90000000))
  await page.getByLabel('Nombre', { exact: true }).fill('Estudiante del top')
  await page.getByLabel('DNI', { exact: true }).fill(dni)
  await button(page, 'Crear código personal').click()
  const code = (await page.getByRole('status').innerText()).match(/\d{6}/)![0]
  await button(page, 'Activar top de simulacros').click()
  await expect(
    page.getByRole('heading', { name: 'Top de simulacros' }),
  ).toBeVisible()
  const ctx = await browser.newContext({ baseURL: new URL(page.url()).origin }),
    student = await ctx.newPage()
  try {
    await student.goto('/')
    await student
      .getByLabel('Nombre', { exact: true })
      .fill('Estudiante del top')
    await student.getByLabel('DNI', { exact: true }).fill(dni)
    await student.getByLabel('Código personal').fill(code)
    await button(student, 'Entrar al aula').click()
    await button(student, 'Clasificaciones').click()
    await expect(
      student.getByRole('heading', { name: 'Top de simulacros' }),
    ).toBeVisible()
    const r = await student.request.post('/api/classroom?action=toggle', {
      headers: { Origin: new URL(page.url()).origin },
      data: { active: false },
    })
    expect(r.status()).toBe(403)
    if (existsSync('server-data/approved.sqlite')) {
      await button(student, 'Práctica').click()
      await button(student, 'Simulacros').click()
      await button(student, 'Empezar simulacro').click()
      await expect(student.locator('.timer')).toBeVisible()
      expect(
        (await saved(student)).questions.every((q) =>
          q.parts.every((p) => p.value === null && !p.steps.length),
        ),
      ).toBe(true)
      await student
        .getByRole('button', { name: 'Finalizar simulacro', exact: true })
        .first()
        .click()
      await button(student, 'Confirmar finalización').click()
      await expect(student.locator('.result')).toContainText(
        'Resultado registrado',
      )
      await expect(student.locator('.solution').first()).toBeVisible()
      await button(student, 'Clasificaciones').click()
      await expect(student.locator('.ranking').last()).toContainText(
        'Estudiante del top',
      )
    }
    page.once('dialog', (d) => d.accept())
    await button(page, 'Cerrar convocatoria').click()
    await expect(button(page, 'Activar top de simulacros')).toBeVisible()
    await button(student, 'Actualizar clasificaciones').click()
    await expect(
      student.getByRole('heading', { name: 'Top de simulacros' }),
    ).toHaveCount(0)
  } finally {
    await ctx.close()
  }
})
