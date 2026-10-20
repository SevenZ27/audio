import { expect, test, type Page } from '@playwright/test'

function watch(page: Page) {
  const errors: string[] = []
  const external: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`))
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`)
  })
  page.on('request', (r) => {
    const u = new URL(r.url())
    // Host antivirus injects this script into HTTP responses; it is not shipped by AudioMatch.
    if (u.hostname === 'gc.kis.v2.scr.kaspersky-labs.com') {
      test.info().annotations.push({ type: 'environment', description: 'Host antivirus injected a request; application external requests are still checked.' })
      return
    }
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url())
  })
  return { errors, external }
}

test('home loads, placeholder hero, no console errors, no external requests', async ({ page }, info) => {
  const w = watch(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cari kembarannya')
  await expect(page.getByTestId('hero-placeholder')).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
  await expect(page.locator('#kembaran ol > li')).toHaveCount(5)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1600)
  await page.screenshot({ path: info.outputPath(`${info.project.name === 'desktop-1440' ? 'desktop-1440' : 'mobile-375'}.jpg`), quality: 85 })
  await page.screenshot({ path: info.outputPath(`${info.project.name}-full.jpg`), fullPage: true, quality: 80 })
  expect(w.errors).toEqual([])
  expect(w.external).toEqual([])
})

test('search by partial name finds AirPods and shows 5 twins', async ({ page }) => {
  const w = watch(page)
  await page.goto('/')
  const input = page.locator('#cari-kembaran')
  await input.fill('airpods')
  const options = page.getByRole('option')
  await expect(options.first()).toBeVisible()
  const texts = await options.allTextContents()
  expect(texts.some((t) => /airpods pro/i.test(t))).toBe(true)
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect(page.locator('#kembaran ol > li')).toHaveCount(5)
  await expect(page.locator('#kembaran ol > li').first()).toContainText('/100')
  expect(w.errors).toEqual([])
})

test('quiz finishes with 5 recommendations', async ({ page }, info) => {
  const w = watch(page)
  await page.goto('/#kuis')
  const quiz = page.locator('#kuis')
  for (let i = 0; i < 5; i++) {
    await quiz.locator('label').first().click()
    await quiz.getByRole('button', { name: i === 4 ? 'Lihat hasil' : 'Lanjut' }).click()
  }
  await expect(page.getByTestId('quiz-results').locator('li')).toHaveCount(5)
  await quiz.screenshot({ path: info.outputPath(`${info.project.name}-quiz.png`) })
  expect(w.errors).toEqual([])
})

test('map works with keyboard and click', async ({ page }, info) => {
  const w = watch(page)
  await page.goto('/#peta')
  await expect(page.locator('#peta')).toContainText('Peta ini ringkasan, bukan urutan kemiripan.')
  const map = page.getByTestId('sound-map')
  await map.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('#peta [aria-live="polite"]')).toContainText('Enter')
  await page.locator('#peta').screenshot({ path: info.outputPath(`${info.project.name}-map.png`) })
  await map.press('Enter')
  await expect(page).toHaveURL(/#\/produk\//)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/#peta')
  await page.getByTestId('sound-map').evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.getByTestId('sound-map').locator('circle').nth(3).click()
  await expect(page).toHaveURL(/#\/produk\//)
  expect(w.errors).toEqual([])
})

test('product page shows curve, group and twins', async ({ page }, info) => {
  const w = watch(page)
  await page.goto('/#/produk/hypethesonics-inear~apple-airpods-pro-2')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Apple Airpods Pro 2')
  await expect(page.getByText('Kelompok karakter')).toBeVisible()
  await expect(page.locator('#twins-title + p + ol > li')).toHaveCount(5)
  const chart = page.getByRole('application').first()
  await chart.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('figure p[aria-live="polite"]').first()).toContainText('Hz')
  await page.waitForTimeout(1600)
  await page.screenshot({ path: info.outputPath(`${info.project.name}-product.png`), fullPage: true })
  expect(w.errors).toEqual([])
})

test('Dengar Bedanya: AudioContext starts and filter gains match the curve difference', async ({ page }, info) => {
  const w = watch(page)
  await page.goto('/#dengar')
  const panel = page.getByTestId('listen')
  await expect(panel).toHaveAttribute('data-expected', /\d/)
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'true')
  await panel.getByRole('button', { name: 'B', exact: true }).click()
  await expect(panel).toHaveAttribute('data-mode', 'B')
  const expected = await panel.getAttribute('data-expected')
  await expect(panel).toHaveAttribute('data-applied', expected!)
  const state = await page.evaluate(() => new Promise<string>((r) => setTimeout(() => r('ok'), 500)))
  expect(state).toBe('ok')
  await panel.getByRole('button', { name: 'A', exact: true }).click()
  await expect(panel).toHaveAttribute('data-applied', '0,0,0,0,0,0,0,0,0,0')
  await page.locator('#dengar').screenshot({ path: info.outputPath(`${info.project.name}-listen.png`) })
  await panel.getByRole('button', { name: 'Stop' }).click()
  expect(w.errors).toEqual([])
})

test('reduced motion keeps placeholder still', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:4171/')
  const anim = await page.locator('.ring').first().evaluate((el) => getComputedStyle(el).animationName)
  expect(anim).toBe('none')
  await ctx.close()
})
