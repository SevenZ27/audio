import { expect, test } from '@playwright/test'

test('malformed and unknown product links stay usable', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const hash of ['%ZZ', '%E0%A4%A', '', 'not-in-catalog']) {
    await page.goto('/#/produk/' + hash)
    await expect(page.getByRole('heading', { name: 'Produk tidak ditemukan' })).toBeVisible()
  }
  await page.getByRole('link', { name: 'Kembali ke pencarian' }).click()
  await expect(page.locator('#cari-kembaran')).toBeVisible()
  expect(errors).toEqual([])
})

test('core catalog recovers without a page reload', async ({ page }) => {
  let fail = true
  await page.route('**/data/meta.json*', (route) => fail ? route.fulfill({ status: 503, body: 'temporarily unavailable' }) : route.continue())
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Data belum bisa dimuat')
  fail = false
  await page.getByRole('button', { name: 'Muat ulang data' }).click()
  await expect(page.locator('#kembaran ol > li')).toHaveCount(5)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('curve HTTP failure has a retry and recovers in each consuming panel', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  let fail = true
  await page.route('**/data/curves/hypethesonics-inear.json*', (route) => fail ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue())
  await page.goto('/')
  await expect(page.locator('#kembaran').getByRole('alert')).toBeVisible()
  await expect(page.locator('#dengar').getByRole('button', { name: 'Putar musik' })).toBeDisabled()
  fail = false
  await page.locator('#kembaran').getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.locator('#kembaran ol svg')).toHaveCount(5)
  await expect(page.locator('#kembaran').getByRole('alert')).toHaveCount(0)
  await page.locator('#dengar').getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.locator('#dengar').getByRole('button', { name: 'Putar musik' })).toBeEnabled()
  expect(errors).toEqual([])
})

test('invalid curve JSON on a deep link offers recovery', async ({ page }) => {
  let corrupt = true
  await page.route('**/data/curves/hypethesonics-inear.json*', (route) => corrupt ? route.fulfill({ json: { rig: 'wrong', ids: [] } }) : route.continue())
  await page.goto('/#/produk/hypethesonics-inear~apple-airpods-pro-2')
  await expect(page.getByRole('alert')).toBeVisible()
  corrupt = false
  await page.getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.getByRole('application').first()).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('switching rigs while an earlier request is pending keeps the new selection', async ({ page }) => {
  let release!: () => void
  const wait = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/data/curves/hypethesonics-inear.json*', async (route) => { await wait; await route.continue() })
  await page.goto('/')
  await page.locator('#kembaran').getByRole('button', { name: 'Sony WH-1000XM4', exact: true }).click()
  await expect(page.locator('#kembaran ol svg')).toHaveCount(5)
  release()
  await expect(page.locator('#kembaran h3')).toHaveText('Sony WH-1000XM4')
  await expect(page.locator('#kembaran ol svg').first()).toHaveAttribute('aria-label', /Sony WH-1000XM4/)
})

test('over-ear quiz results respect form and disclose connectivity limitation', async ({ page }) => {
  await page.goto('/#kuis')
  const quiz = page.locator('#kuis')
  await expect(quiz.getByRole('radio')).toHaveCount(2)
  await expect(quiz).toContainText('Hasil belum disaring berdasarkan kabel atau nirkabel')
  await quiz.locator('label').filter({ hasText: 'Over-ear' }).click()
  await quiz.getByRole('button', { name: 'Lanjut', exact: true }).click()
  for (let i = 1; i < 5; i++) {
    await quiz.locator('label').first().click()
    await quiz.getByRole('button', { name: i === 4 ? 'Lihat hasil' : 'Lanjut', exact: true }).click()
  }
  const links = quiz.locator('[data-testid=quiz-results] a')
  await expect(links).toHaveCount(5)
  for (const href of await links.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')))) expect(href).toContain('rtings-overear')
})

test('catalog counts use precise definitions and remain within mobile width', async ({ page }, info) => {
  await page.goto('/#data')
  await expect(page.locator('#data')).toContainText('1.510 hasil pengukuran, 1.230 pasangan model–rig, dan 1.140 nama dasar')
  await expect(page.locator('#data')).toContainText('bukan katalog produk unik yang sudah diverifikasi')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('#data').screenshot({ path: info.outputPath('catalog.png') })
})
