import { test, expect, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
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
  { name: string; code: string }
>()
async function login(page: Page) {
  await page.goto('/')
  await expect(page.getByLabel('Código personal')).toBeVisible()
  await expect(page.getByLabel('DNI')).toHaveCount(0)
  let profile = profiles.get(page)
  if (!profile) {
    if (process.env.MATHX_TEST_URL) {
      profile = {
        name: process.env.MATHX_TEST_NAME!,
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
      const name = 'Estudiante de prueba'
      const r = await api('enroll', { name })
      expect(r.ok()).toBeTruthy()
      profile = { name, code: (await r.json()).code }
      await api('logout', {})
      await page.reload()
    }
    profiles.set(page, profile)
  }
  await page.getByLabel('Nombre', { exact: true }).fill(profile.name)
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
  await page.getByText('Símbolos matemáticos', { exact: true }).click()
  for (const symbol of ['y', '=', '−', 'x', '/', 'x', '+', 'x'])
    await button(page, symbol).click()
  await expect(page.getByPlaceholder('Tu respuesta')).toHaveValue('y=−x/x+x')
  await page.getByText('Símbolos matemáticos', { exact: true }).click()
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
  await page.getByLabel('Código personal').fill('000000')
  await button(page, 'Entrar al aula').click()
  await expect(page.getByRole('alert')).toContainText('incorrecta')
  expect(
    (await page.request.get('/api/classroom?action=catalog')).status(),
  ).toBe(401)
})

test('aula del profesor, reto supervisado, notas y convocatoria asignada', async ({
  page,
  browser,
}, info) => {
  test.skip(
    !!process.env.MATHX_TEST_URL ||
      (info.project.name === 'mobile' &&
        !process.env.MATHX_TEST_MOBILE_TEACHER),
    'Usa exclusivamente el aula local de pruebas.',
  )
  await page.goto('/')
  await button(page, 'Administración').click()
  await page
    .getByLabel('Clave de administración')
    .fill(process.env.MATHX_ADMIN_PASSWORD!)
  await button(page, 'Entrar al aula').click()
  await button(page, 'Inscribir alumno').click()
  await page.getByLabel('Nombre', { exact: true }).fill('Estudiante del top')
  await button(page, 'Crear código personal').click()
  const code = (await page.getByRole('status').innerText()).match(/\d{6}/)![0]
  await button(page, 'Actividades').click()
  await page.getByLabel('Título', { exact: true }).fill('Reto de áreas')
  await page
    .getByLabel('Enunciado')
    .fill('Halla el área de un círculo de radio 2.')
  await page
    .getByLabel('Solución para después del cierre')
    .fill('El área es cuatro pi.')
  await button(page, 'Publicar reto').click()
  await expect(
    page.getByRole('heading', { name: 'Reto de áreas' }),
  ).toBeVisible()
  const ctx = await browser.newContext({
      baseURL: new URL(page.url()).origin,
      viewport: page.viewportSize(),
    }),
    student = await ctx.newPage()
  try {
    await student.goto('/')
    await student
      .getByLabel('Nombre', { exact: true })
      .fill('Estudiante del top')
    await student.getByLabel('Código personal').fill(code)
    await button(student, 'Entrar al aula').click()
    await button(student, 'Ver en Mi aula').click()
    const monitoring = student.waitForResponse(r =>
      r.url().includes('action=task') && r.request().postDataJSON()?.action === 'signal',
    )
    await button(student, 'Resolver reto').click()
    await monitoring
    await expect(
      student.getByRole('heading', { name: 'Reto de áreas' }),
    ).toBeVisible()
    expect(await student.evaluate(() => !!document.fullscreenElement)).toBe(
      true,
    )
    await student.evaluate(() => document.exitFullscreen())
    // Chromium headless does not background tabs consistently. Exercise the browser visibility listener explicitly.
    await student.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
      Reflect.deleteProperty(document, 'hidden')
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await student.getByLabel('Respuesta', { exact: true }).fill('4')
    await student
      .getByText('Símbolos matemáticos', { exact: true })
      .first()
      .click()
    await button(student, 'π').click()
    await expect(student.getByLabel('Respuesta', { exact: true })).toHaveValue(
      '4π',
    )
    await student
      .getByLabel('Procedimiento', { exact: true })
      .fill('Área = πr²')
    await expect(student.getByText(/Respuestas guardadas/)).toBeVisible()
    await button(student, 'Volver al aula').click()
    await button(student, 'Continuar').click()
    await expect(student.getByLabel('Respuesta', { exact: true })).toHaveValue(
      '4π',
    )
    student.once('dialog', (d) => d.accept())
    await button(student, 'Entregar reto').click()
    await expect(student.getByRole('status')).toContainText('Pendiente')
    await button(page, 'Actualizar aula').click()
    await expect(
      page.getByText(/Salida de pantalla completa/).first(),
    ).toBeVisible()
    await expect(page.getByText(/Pestaña oculta/).first()).toBeVisible()
    await button(page, 'Revisar entrega').click()
    await expect(page.getByLabel('Procedimiento', { exact: true })).toHaveValue(
      'Área = πr²',
    )
    for (const score of ['15', '17']) {
      await page.getByLabel('Reto · puntos de 20').fill(score)
      await button(page, 'Publicar nota').click()
      await expect(page.getByRole('status')).toContainText(score + ' / 20')
    }
    await button(page, 'Volver al aula').click()
    await button(student, 'Volver al aula').click()
    await expect(student.getByText('Nota publicada · 17 puntos')).toBeVisible()
    await button(student, 'Clasificaciones').click()
    await expect(
      student
        .getByRole('row')
        .filter({ hasText: 'Estudiante del top' })
        .getByRole('cell')
        .last(),
    ).toHaveText('17')
    if (existsSync('server-data/approved.sqlite')) {
      await page.getByLabel('Origen').selectOption('bank')
      await page.getByLabel('Prueba asignada').selectOption('2')
      await expect
        .poll(() =>
          page.getByLabel('Pregunta del banco').locator('option').count(),
        )
        .toBeGreaterThan(1)
      await page.getByLabel('Pregunta del banco').selectOption({ index: 1 })
      await page.getByText('Vista previa del reto').click()
      await expect(
        page.locator('.task-form details[open] .preserve-lines'),
      ).toBeVisible()
      await page
        .getByRole('combobox', { name: 'Actividad', exact: true })
        .selectOption('exam')
      await page
        .getByLabel('Título', { exact: true })
        .fill('Convocatoria de prueba')
      await page.getByLabel('Mostrar top de esta convocatoria').check()
      await button(page, 'Publicar convocatoria').click()
      await expect(
        page.getByRole('heading', { name: 'Convocatoria de prueba' }),
      ).toBeVisible()
      await button(student, 'Mi aula').click()
      await button(student, 'Resolver simulacro').click()
      await expect(
        student
          .getByRole('navigation', { name: 'Preguntas del simulacro' })
          .getByRole('button'),
      ).toHaveCount(6)
      await student.getByLabel('Respuesta', { exact: true }).first().fill('2')
      student.once('dialog', (d) => d.accept())
      await button(student, 'Entregar simulacro').click()
      await expect(student.getByText('Informe por tema')).toBeVisible()
      await button(page, 'Actualizar aula').click()
      await page
        .locator('article')
        .filter({ hasText: 'Estudiante del top · Convocatoria de prueba' })
        .getByRole('button', { name: 'Revisar entrega' })
        .click()
      const marks = page.getByRole('spinbutton')
      await expect(marks).toHaveCount(6)
      for (const input of await marks.all()) await input.fill('1')
      await button(page, 'Publicar nota').click()
      await expect(page.getByRole('status')).toContainText('6 / 80')
      await button(page, 'Volver al aula').click()
      await button(student, 'Volver al aula').click()
      await button(student, 'Clasificaciones').click()
      await expect(
        student
          .locator('.ranking')
          .last()
          .getByRole('row')
          .filter({ hasText: 'Estudiante del top' })
          .getByRole('cell')
          .last(),
      ).toHaveText('6')
      await button(page, 'Ocultar top').click()
      await expect(button(page, 'Mostrar top')).toBeVisible()
      await button(student, 'Actualizar clasificaciones').click()
      await expect(
        student.getByRole('heading', { name: 'Top de simulacros' }),
      ).toHaveCount(0)
    }
  } finally {
    await ctx.close()
  }
})

test('un estado de sesión lento permite entrar sin cerrar la sesión recién iniciada', async ({ page }) => {
  test.skip(!!process.env.MATHX_TEST_URL, 'Usa el aula local de pruebas.')
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/classroom?action=status', async (route) => {
    await delayed
    await route.fulfill({ json: { authenticated: false, expires: 0 } })
  })
  try {
    await page.goto('/')
    await button(page, 'Administración').click()
    await page.getByLabel('Clave de administración').fill(process.env.MATHX_ADMIN_PASSWORD!)
    await button(page, 'Entrar al aula').click()
    await expect(page.getByRole('heading', { name: 'Panel del profesor' })).toBeVisible()
    const status = page.waitForResponse(r => r.url().endsWith('action=status'))
    release()
    await status
    await page.getByLabel('Título', { exact: true }).fill('Pregunta de prueba')
    await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Pregunta de prueba')
  } finally {
    release()
  }
})

for (const paper of [1, 2]) {
  test('Simulacro Pro conserva el cuadernillo de Prueba ' + paper, async ({ page, request }) => {
    test.skip(!!process.env.MATHX_TEST_URL, 'Usa el aula local de pruebas.')
    await login(page)
    await button(page, 'Simulacro Pro').click()
    await button(page, 'Prueba ' + paper).click()
    const loaded = page.waitForResponse(r => r.url().includes('/api/pro-paper?') && !r.url().includes('&asset='))
    await button(page, 'Empezar Simulacro Pro').click()
    const manifest = await loaded
    expect(manifest.status()).toBe(200)
    expect(manifest.headers()['content-type']).toContain('application/json')
    const questions: { number: number; marks: number; blocks: { answer?: string }[] }[] = await manifest.json()
    expect(questions.reduce((total, q) => total + q.marks, 0)).toBe(80)
    expect(questions.length).toBeGreaterThanOrEqual(paper === 2 ? 5 : 11)
    const path = manifest.url()
    const id = new URL(path).searchParams.get('id')
    const catalog: { id: string; paper: number }[] = JSON.parse(readFileSync('server-data/pro/catalog.json', 'utf8'))
    expect(catalog.find(row => row.id === id)?.paper).toBe(paper)
    await expect(page.getByRole('heading', { name: 'Simulacro Pro · Prueba ' + paper })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pregunta 1 de ' + questions.length })).toBeVisible()
    await expect(page.locator('.pro-question p').nth(1)).toBeVisible()
    await expect(page.locator('.pro-exam iframe')).toHaveCount(0)
    const asset = JSON.stringify(questions).match(/"image":"([a-f0-9]{64})"/)![1]
    const figure = await page.request.get(path + '&asset=' + asset)
    expect(figure.headers()['content-type']).toBe('image/webp')
    expect(createHash('sha256').update(await figure.body()).digest('hex')).toBe(asset)
    expect((await request.get(path)).status()).toBe(401)
    expect((await request.get(path + '&asset=' + asset)).status()).toBe(401)
    expect((await page.request.get(path + '&asset=..')).status()).toBe(400)
    expect((await page.request.get(path.replace('signature=', 'signature=0'))).status()).toBe(403)
    const multi = questions.find(q => q.blocks.filter(b => b.answer).length >= 2)!
    const other = questions.find(q => q.number !== multi.number)!
    await button(page, 'Pregunta ' + multi.number).click()
    const fields = page.getByRole('textbox', {name: /Respuesta y procedimiento/})
    await expect(fields).toHaveCount(multi.blocks.filter(b => b.answer).length)
    await fields.nth(0).fill('24')
    await fields.nth(1).fill('3')
    const keys = page.locator('.pro-answer').nth(1)
    await keys.getByText('Símbolos matemáticos').click()
    await keys.getByRole('button', {name: 'π', exact: true}).click()
    await expect(fields.nth(1)).toHaveValue('3π')
    await button(page, 'Pregunta ' + other.number).click()
    await expect(fields.first()).toHaveValue('')
    await fields.first().fill('Otra pregunta')
    await page.evaluate(n => {
      const attempt = JSON.parse(sessionStorage.getItem('mathx.pro.1')!)
      attempt.responses[n] = 'Borrador de la versión anterior'
      sessionStorage.setItem('mathx.pro.1', JSON.stringify(attempt))
    }, multi.number)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Pregunta ' + other.number + ' de ' + questions.length })).toBeVisible()
    await expect(fields.first()).toHaveValue('Otra pregunta')
    await button(page, 'Pregunta ' + multi.number).click()
    await expect(fields.nth(0)).toHaveValue('24')
    await expect(fields.nth(1)).toHaveValue('3π')
    await page.getByText('Respuesta anterior para la pregunta completa').click()
    await expect(page.getByText('Borrador de la versión anterior')).toBeVisible()
    page.once('dialog', dialog => dialog.accept())
    await button(page, 'Finalizar simulacro').click()
    await expect(page.getByText('Simulacro finalizado')).toBeVisible()
    for (const field of await fields.all()) await expect(field).not.toBeEditable()
    await button(page, 'Volver a la configuración').click()
    await expect(page.getByRole('heading', { name: 'Configura tu práctica' })).toBeVisible()
  })
}

test('el administrador gestiona el acceso y el avance de un alumno desde Usuarios', async ({page, browser}) => {
  test.skip(!!process.env.MATHX_TEST_URL, 'Usa exclusivamente el aula local.')
  await page.goto('/')
  await button(page, 'Administración').click()
  await page.getByLabel('Clave de administración').fill(process.env.MATHX_ADMIN_PASSWORD!)
  await button(page, 'Entrar al aula').click()
  await button(page, 'Inscribir alumno').click()
  const name = 'Alumno de gestión ' + crypto.randomUUID().slice(-8)
  await page.getByLabel('Nombre', { exact: true }).fill(name)
  await button(page, 'Crear código personal').click()
  const code = (await page.getByRole('status').innerText()).match(/\d{6}/)![0]
  await button(page, 'Usuarios').click()
  await page.getByLabel('Buscar por nombre').fill(name)
  const row = page.getByRole('button', { name: new RegExp(name + ' Cuenta ') })
  await row.click()
  await button(page, 'Ver código').click()
  await expect(page.getByText(code, { exact: true })).toBeVisible()
  const origin = new URL(page.url()).origin
  const ctx = await browser.newContext({baseURL:origin})
  const login = (pin: string) => ctx.request.post('/api/classroom?action=login', {
    headers:{Origin:origin},data:{name,code:pin},
  })
  try {
    expect((await login(code)).status()).toBe(200)
    expect((await ctx.request.get('/api/classroom?action=directory')).status()).toBe(403)
    page.once('dialog', d => d.accept())
    await button(page, 'Generar nuevo código').click()
    await expect(page.getByText('Código actualizado.')).toBeVisible()
    const next = (await page.locator('.account-editor strong').innerText()).trim()
    expect(next).not.toBe(code)
    expect((await ctx.request.get('/api/classroom?action=status')).ok()).toBeTruthy()
    expect((await (await ctx.request.get('/api/classroom?action=status')).json()).authenticated).toBe(false)
    expect((await login(next)).status()).toBe(200)
    page.once('dialog', d => d.accept())
    await button(page, 'Reiniciar avance').click()
    await expect(page.getByRole('status')).toContainText('Se reinició el avance')
    await row.click()
    page.once('dialog', d => d.dismiss())
    await button(page, 'Eliminar alumno').click()
    await expect(row).toBeVisible()
    page.once('dialog', d => d.accept())
    await button(page, 'Eliminar alumno').click()
    await expect(row).toHaveCount(0)
    expect((await login(next)).status()).toBe(401)
  } finally { await ctx.close() }
})
