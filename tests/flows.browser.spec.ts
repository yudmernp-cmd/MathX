import { test, expect, type Page } from '@playwright/test'
import { storageKey, type Run } from '../src/math/session'
const saved = (page: Page) =>
  page.evaluate(
    (k) => JSON.parse(sessionStorage.getItem(k)!) as Run,
    storageKey,
  )
async function login(page: Page) {
  await page.goto('/')
  await page
    .getByLabel('Clave compartida de la clase')
    .fill(process.env.MATHX_CLASS_PASSWORD!)
  await page.getByRole('button', { name: 'Entrar al aula' }).click()
  await expect(
    page.getByRole('heading', { name: 'Configura tu práctica' }),
  ).toBeVisible()
}
test.afterEach(async ({ page }) => {
  expect(await page.locator('.katex-error').count()).toBe(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
test('acceso privado, filtros, corrección, salida y persistencia', async ({
  page,
  request,
}) => {
  expect((await request.get('/api/classroom?action=catalog')).status()).toBe(
    401,
  )
  expect(
    (
      await request.get('/api/classroom?action=asset&id=' + 'a'.repeat(64))
    ).status(),
  ).toBe(401)
  await login(page)
  await expect(page.getByLabel('Asignatura')).toHaveCount(0)
  await page.getByLabel('Tema', { exact: true }).selectOption('Funciones')
  await page
    .getByLabel('Subtema', { exact: true })
    .selectOption('Funciones exponenciales')
  await page.getByRole('button', { name: 'Difícil', exact: true }).click()
  await page.getByRole('button', { name: 'Empezar práctica' }).click()
  await expect(
    page.getByRole('heading', { name: 'Ejercicio individual' }),
  ).toBeVisible()
  const q = (await saved(page)).questions[0]
  expect(q).toMatchObject({
    origin: 'original',
    topic: 'Funciones exponenciales',
    level: 'Difícil',
  })
  await page.locator('#answer0-0').fill(String(q.parts[0].value))
  await page.reload()
  await expect(page.locator('#answer0-0')).toHaveValue(String(q.parts[0].value))
  await page.getByRole('button', { name: 'Comprobar respuestas' }).click()
  await expect(page.locator('.feedback').first()).toContainText(
    'Resultado correcto',
  )
  await page.getByRole('button', { name: 'Ver solución' }).click()
  await expect(page.locator('.solution').first()).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente ejercicio' }).click()
  await expect(page.getByText('PREGUNTA 2', { exact: true })).toBeVisible()
  expect((await saved(page)).questions[0].id).not.toBe(q.id)
  await page.getByRole('button', { name: 'Salir del aula' }).click()
  await expect(
    page.getByRole('heading', { name: 'Acceso al aula' }),
  ).toBeVisible()
  expect(
    await page.evaluate((k) => sessionStorage.getItem(k), storageKey),
  ).toBeNull()
})
test('impide entregar un simulacro compuesto únicamente por originales', async ({
  page,
}) => {
  test.skip(
    !!process.env.MATHX_TEST_URL,
    'Requiere el inventario local de prueba.',
  )
  await login(page)
  await page.getByRole('button', { name: 'Simulacros', exact: true }).click()
  await expect(page.getByLabel('Tema', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Empezar simulacro' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Faltan 6 preguntas reales',
  )
  await expect(page.locator('.timer')).toHaveCount(0)
})

test('dos pestañas consumen formas distintas y el historial sobrevive al cierre de sesión', async ({
  page,
  context,
}) => {
  test.skip(!!process.env.MATHX_TEST_URL, 'Requiere la reserva de desarrollo.')
  await login(page)
  const tab = await context.newPage()
  await tab.goto('/')
  async function selectVoronoi(p: Page) {
    await p
      .getByLabel('Tema', { exact: true })
      .selectOption('Geometría y trigonometría')
    await p
      .getByLabel('Subtema', { exact: true })
      .selectOption('Diagramas de Voronoi')
    await p.getByRole('button', { name: 'Difícil', exact: true }).click()
  }
  await Promise.all([selectVoronoi(page), selectVoronoi(tab)])
  await Promise.all(
    [page, tab].map(async (p) => {
      await p.getByRole('button', { name: 'Empezar práctica' }).click()
      await expect(
        p.getByRole('heading', { name: 'Ejercicio individual' }),
      ).toBeVisible()
    }),
  )
  const first = (await saved(page)).questions[0],
    second = (await saved(tab)).questions[0]
  expect(first.historyKey).toBeTruthy()
  expect(first.historyKey).not.toBe(second.historyKey)
  await tab.close()
  await page.getByRole('button', { name: 'Salir del aula' }).click()
  await expect(page.getByLabel('Clave compartida de la clase')).toBeVisible()
  await login(page)
  await selectVoronoi(page)
  await page.getByRole('button', { name: 'Empezar práctica' }).click()
  await expect(
    page.getByRole('heading', { name: 'Ejercicio individual' }),
  ).toBeVisible()
  const next = await saved(page)
  const used = new Set([first.historyKey, second.historyKey])
  expect(used.has(next.questions[0].historyKey)).toBe(false)
  used.add(next.questions[0].historyKey)
  for (let i = 0; i < 12; i++) {
    await page.getByRole('button', { name: 'Siguiente ejercicio' }).click()
    await expect.poll(async () => (await saved(page)).ordinal).toBe(i + 2)
    const q = (await saved(page)).questions[0]
    expect(q.topic).toBe('Diagramas de Voronoi')
    expect(used.has(q.historyKey)).toBe(false)
    used.add(q.historyKey)
  }
})
for (const auto of [false, true])
  test(
    'simulacro híbrido, navegación y entrega ' +
      (auto ? 'automática' : 'manual'),
    async ({ page }) => {
      test.skip(
        !!process.env.MATHX_TEST_URL,
        'Usa un banco simulado de integración fuera de producción.',
      )
      await login(page)
      await page
        .getByRole('button', { name: 'Simulacros', exact: true })
        .click()
      await page.getByRole('button', { name: 'Prueba 2', exact: true }).click()
      await page.getByRole('button', { name: 'Empezar simulacro' }).click()
      await expect(page.locator('.timer')).toBeVisible()
      const run = await saved(page),
        i = run.questions.findIndex((q) => q.origin === 'real')
      const reserved = run.questions.map((q) => q.historyKey)
      const tab = await page.context().newPage()
      await tab.goto('/')
      await tab.getByRole('button', { name: 'Simulacros', exact: true }).click()
      await tab.getByRole('button', { name: 'Prueba 2', exact: true }).click()
      await tab.getByRole('button', { name: 'Empezar simulacro' }).click()
      await expect(tab.locator('.timer')).toBeVisible()
      const later = await saved(tab)
      await tab.close()
      expect(later.questions).toHaveLength(5)
      expect(
        later.questions.every((q) => !reserved.includes(q.historyKey)),
      ).toBe(true)
      await page
        .getByRole('button', { name: 'Pregunta ' + (i + 1), exact: true })
        .click()
      await page.locator('#answer' + i + '-0').fill('Desarrollo escrito')
      await page.reload()
      await expect(page.locator('#answer' + i + '-0')).toHaveValue(
        'Desarrollo escrito',
      )
      await expect(page.locator('.prompt').last()).toContainText('(b)(i)')
      if (auto) {
        await page.clock.install()
        await page.clock.fastForward('01:30:01')
      } else {
        await page
          .getByRole('button', { name: 'Finalizar simulacro', exact: true })
          .first()
          .click()
        await page
          .getByRole('button', { name: 'Confirmar finalización' })
          .click()
      }
      await expect(page.locator('.result')).toContainText('80 puntos posibles')
      await expect(page.locator('.result')).toContainText(
        'sin esquema de calificación',
      )
      await expect(page.locator('#answer' + i + '-0')).toHaveAttribute(
        'readonly',
        '',
      )
    },
  )

test('una clave incorrecta conserva cerrado el catálogo', async ({ page }) => {
  await page.goto('/')
  await page
    .getByLabel('Clave compartida de la clase')
    .fill('clave de prueba incorrecta')
  await page.getByRole('button', { name: 'Entrar al aula' }).click()
  await expect(page.getByRole('alert')).toContainText('incorrecta')
  await expect(
    page.getByRole('button', { name: 'Empezar práctica' }),
  ).toHaveCount(0)
  expect(
    (await page.request.get('/api/classroom?action=catalog')).status(),
  ).toBe(401)
})

test('descarta una variante ya vista antes de mostrar otro ejercicio', async ({
  page,
}) => {
  test.skip(
    !!process.env.MATHX_TEST_URL,
    'Comprueba el reintento con una respuesta controlada.',
  )
  await login(page)
  await page
    .getByLabel('Tema', { exact: true })
    .selectOption('Geometría y trigonometría')
  await page
    .getByLabel('Subtema', { exact: true })
    .selectOption('Diagramas de Voronoi')
  await page.getByRole('button', { name: 'Empezar práctica' }).click()
  await expect(
    page.getByRole('heading', { name: 'Ejercicio individual' }),
  ).toBeVisible()
  const first = await saved(page)
  expect(first.questions[0].generated).toBe(true)
  const draws: number[] = []
  await page.route('**/api/classroom?action=practice', async (route) => {
    const body = route.request().postDataJSON()
    draws.push(body.draw)
    expect(body.recent).not.toContain(first.questions[0].historyKey)
    if (draws.length === 1) await route.fulfill({ json: first })
    else await route.continue()
  })
  await page.getByRole('button', { name: 'Siguiente ejercicio' }).click()
  await expect.poll(async () => (await saved(page)).ordinal).toBe(2)
  expect(draws.length).toBeGreaterThanOrEqual(2)
  expect(draws[1]).toBe(draws[0] + 1)
  expect((await saved(page)).questions[0].historyKey).not.toBe(
    first.questions[0].historyKey,
  )
})
