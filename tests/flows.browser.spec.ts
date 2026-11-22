import { test, expect, chromium, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { storageKey, type Run } from '../src/math/session'

const saved = (page: Page) =>
  page.evaluate(
    (k) => JSON.parse(sessionStorage.getItem(k)!) as Run,
    storageKey,
  )
const button = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true })
async function login(page: Page) {
  await page.goto('/')
  await page
    .getByLabel('Clave compartida de la clase')
    .fill(process.env.MATHX_CLASS_PASSWORD!)
  await button(page, 'Entrar al aula').click()
  await expect(
    page.getByRole('heading', { name: 'Configura tu práctica' }),
  ).toBeVisible()
}
async function select(page: Page, theme = 'Funciones', level = 'Avanzado') {
  await page.getByLabel('Tema', { exact: true }).selectOption(theme)
  await button(page, level).click()
}
async function start(page: Page) {
  await button(page, 'Empezar práctica').click()
  await expect(
    page.getByRole('heading', { name: 'Ejercicio individual' }),
  ).toBeVisible()
  return (await saved(page)).questions[0]
}
test.afterEach(async ({ page }) => {
  await expect(page.locator('.katex-error')).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
test('aula privada, pregunta única, corrección, solución y nueva generación', async ({
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
  await expect(button(page, 'Prueba 1')).toHaveCount(0)
  await expect(page.getByLabel('Subtema', { exact: true })).toHaveCount(0)
  await select(page)
  const q = await start(page)
  expect(q).toMatchObject({
    individual: true,
    theme: 'Funciones',
    level: 'Difícil',
    origin: 'original',
  })
  await expect(page.locator('.question input')).toHaveCount(1)
  await expect(page.locator('.question textarea, .prompt b')).toHaveCount(0)
  const answer = String(q.parts[0].value) + '/1'
  await page.getByPlaceholder('Tu respuesta').fill(answer)
  await page.reload()
  await expect(page.getByPlaceholder('Tu respuesta')).toHaveValue(answer)
  await button(page, 'Comprobar respuesta').click()
  await expect(page.locator('.feedback')).toHaveText('Resultado correcto')
  await button(page, 'Ver solución').click()
  expect(await page.locator('.solution p').count()).toBeGreaterThanOrEqual(3)
  await button(page, 'Volver a intentar').click()
  await page.getByPlaceholder('Tu respuesta').fill('1/0')
  await button(page, 'Comprobar respuesta').click()
  await expect(page.locator('.feedback')).toContainText('Formato no reconocido')
  await button(page, 'Siguiente ejercicio').click()
  await expect(page.getByText('PREGUNTA 2', { exact: true })).toBeVisible()
  expect((await saved(page)).questions[0].structureKey).not.toBe(q.structureKey)
})
test('dos pestañas y continuación tras consumir las cuatro estructuras de una selección', async ({
  page,
  context,
}) => {
  await login(page)
  const other = await context.newPage()
  await other.goto('/')
  await Promise.all([page, other].map((p) => select(p)))
  const qs = await Promise.all([page, other].map((p) => start(p)))
  const used = new Set(qs.map((q) => q.structureKey))
  expect(used.size).toBe(2)
  await other.close()
  await button(page, 'Salir del aula').click()
  await expect(page.getByLabel('Clave compartida de la clase')).toBeVisible()
  await login(page)
  await select(page)
  const third = await start(page)
  expect(used.has(third.structureKey)).toBe(false)
  used.add(third.structureKey)
  for (let i = 0; i < 12; i++) {
    const response = page.waitForResponse((r) =>
      r.url().includes('action=practice'),
    )
    await button(page, 'Siguiente ejercicio').click()
    expect((await response).status()).toBe(200)
    await expect.poll(async () => (await saved(page)).ordinal).toBe(i + 2)
    const q = (await saved(page)).questions[0]
    expect(used.has(q.structureKey)).toBe(false)
    used.add(q.structureKey)
  }
  expect(used.size).toBe(15)
  const last = (await saved(page)).questions[0]
  expect(last.composed).toBe(true)
  await page.reload()
  await page.getByPlaceholder('Tu respuesta').fill(String(last.parts[0].value))
  await button(page, 'Comprobar respuesta').click()
  await expect(page.locator('.feedback')).toHaveText('Resultado correcto')
  await button(page, 'Ver solución').click()
  await expect(page.locator('.solution')).toBeVisible()
  // Replay a saved composite with changed numbers after reload. The server never
  // receives the entire series history, but IndexedDB must reject its shape.
  let served = 0
  await page.route('**/api/classroom?action=practice', async (route) => {
    const body = route.request().postDataJSON()
    expect(body.recent).not.toContain(last.structureKey)
    if (served++ > 0) return route.continue()
    const previous = await saved(page)
    return route.fulfill({
      json: {
        ...previous,
        questions: [
          {
            ...last,
            wordingKey: 'contenido-alternativo',
            patternKey: 'otra-redaccion',
            stem: 'Otros datos.',
          },
        ],
      },
    })
  })
  await button(page, 'Siguiente ejercicio').click()
  await expect.poll(async () => (await saved(page)).ordinal).toBe(14)
  expect(served).toBeGreaterThanOrEqual(2)
  expect(used.has((await saved(page)).questions[0].structureKey)).toBe(false)
  await page.unroute('**/api/classroom?action=practice')
  await button(page, 'Configuración').click()
  await select(page, 'Funciones', 'Intermedio')
  expect((await start(page)).level).toBe('Medio')
})
test('el historial persiste tras cerrar Chromium y volver a abrir el mismo perfil', async ({
  baseURL,
}, info) => {
  const profile = info.outputPath('perfil')
  const open = () =>
    chromium.launchPersistentContext(profile, {
      baseURL,
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    })
  let context = await open()
  const p = context.pages()[0]
  await login(p)
  await select(p)
  const first = await start(p)
  await context.close()
  context = await open()
  try {
    const next = await context.newPage()
    await next.goto('/')
    const auth = next.getByLabel('Clave compartida de la clase')
    await auth.or(next.getByLabel('Tema', { exact: true })).waitFor()
    if (await auth.isVisible()) await login(next)
    await select(next)
    const post = next.waitForRequest((r) => r.url().includes('action=practice'))
    const second = await start(next)
    expect((await post).postDataJSON().recent).toContain(first.structureKey)
    expect(second.structureKey).not.toBe(first.structureKey)
  } finally {
    await context.close()
  }
})
test('rechaza una respuesta concurrente con igual estructura y valores cambiados', async ({
  page,
}) => {
  await login(page)
  await select(page)
  await start(page)
  const first = await saved(page)
  let calls = 0
  await page.route('**/api/classroom?action=practice', async (route) => {
    calls++
    expect(route.request().postDataJSON().recent).toContain(
      first.questions[0].structureKey,
    )
    if (calls > 1) return route.continue()
    const old = first.questions[0]
    const duplicate = {
      ...old,
      id: 'otro-id',
      wordingKey: 'otro-contenido',
      stem: old.stem + ' (Dato alternativo).',
    }
    return route.fulfill({ json: { ...first, questions: [duplicate] } })
  })
  await button(page, 'Siguiente ejercicio').click()
  await expect.poll(async () => (await saved(page)).ordinal).toBe(2)
  expect(calls).toBeGreaterThanOrEqual(2)
  expect((await saved(page)).questions[0].structureKey).not.toBe(
    first.questions[0].structureKey,
  )
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
  await page
    .getByLabel('Clave compartida de la clase')
    .fill('clave incorrecta de prueba')
  await button(page, 'Entrar al aula').click()
  await expect(page.getByRole('alert')).toContainText('incorrecta')
  expect(
    (await page.request.get('/api/classroom?action=catalog')).status(),
  ).toBe(401)
})
