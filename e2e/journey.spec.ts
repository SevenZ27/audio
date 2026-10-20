import { expect, test } from '@playwright/test'

test('search, compare, swap, detail and return preserve context', async ({ page }, info) => {
  await page.goto('/#kembaran')
  await page.locator('#cari-kembaran').fill('airpods pro 2')
  await page.getByRole('option').first().click()
  const query = await page.locator('#cari-kembaran').inputValue()
  const heading = await page.locator('#kembaran h3').textContent()
  const compare = page.locator('#kembaran').getByRole('button', { name: 'Bandingkan & dengar' }).first()
  await compare.click()
  await expect(page).toHaveURL(/#dengar$/)
  const a = await page.getByTestId('compare-a').textContent()
  const b = await page.getByTestId('compare-b').textContent()
  await page.getByRole('button', { name: 'Tukar A dan B' }).click()
  await expect(page.getByTestId('compare-a')).toHaveText(b!)
  await expect(page.getByTestId('compare-b')).toHaveText(a!)
  await page.getByRole('link', { name: 'Detail produk B' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(a!)
  await page.getByRole('button', { name: 'Kembali ke hasil sebelumnya' }).click()
  await expect(page).toHaveURL(/#dengar$/)
  await expect(page.getByTestId('compare-a')).toHaveText(b!)
  await page.locator('#dengar').getByRole('button', { name: 'Kembali ke hasil sebelumnya' }).click()
  await expect(page).toHaveURL(/#kembaran$/)
  await expect(page.locator('#cari-kembaran')).toHaveValue(query)
  await expect(page.locator('#kembaran h3')).toHaveText(heading!)
  await expect(compare).toBeFocused()
  await expect(compare).toBeInViewport()
  await compare.click()
  await page.locator('#dengar').screenshot({ path: info.outputPath('comparison.png'), animations: 'disabled' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('quiz answers and results survive detail, browser back and forward', async ({ page }) => {
  await page.goto('/#kuis')
  const quiz = page.locator('#kuis')
  for (let i = 0; i < 5; i++) {
    await quiz.locator('label').first().click()
    await quiz.getByRole('button', { name: i === 4 ? 'Lihat hasil' : 'Lanjut' }).click()
  }
  const results = page.getByTestId('quiz-results')
  await expect(results.locator('li')).toHaveCount(5)
  const before = await results.textContent()
  await results.getByRole('link').first().click()
  await page.goBack()
  await expect(results).toBeVisible()
  await expect(results).toHaveText(before!)
  await page.goForward()
  await expect(page).toHaveURL(/#\/produk\//)
  await page.getByRole('button', { name: 'Kembali ke hasil sebelumnya' }).click()
  await expect(page).toHaveURL(/#kuis$/)
  await expect(results).toHaveText(before!)
})

test('direct product link has a usable search fallback', async ({ page }) => {
  await page.goto('/#/produk/hypethesonics-inear~apple-airpods-pro-2')
  await page.getByRole('button', { name: 'Kembali ke hasil sebelumnya' }).click()
  await expect(page.locator('#cari-kembaran')).toBeInViewport()
  await page.locator('#cari-kembaran').fill('zz-no-such-product')
  await expect(page.getByRole('listbox')).toContainText('Belum ketemu')
  await page.locator('#cari-kembaran').press('Escape')
  await expect(page.getByRole('listbox')).toBeHidden()
})

test('skip link moves keyboard focus without changing the product route', async ({ page }) => {
  await page.goto('/#/produk/hypethesonics-inear~apple-airpods-pro-2')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const skip = page.getByRole('link', { name: 'Lompat ke konten' })
  await skip.focus()
  await skip.press('Enter')
  await expect(page.locator('#product-content')).toBeFocused()
  await expect(page).toHaveURL(/#\/produk\//)
})

test('mobile touch search and horizontal navigation remain usable', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-375', 'Touch-specific viewport check')
  await page.goto('/#kembaran')
  await page.locator('#cari-kembaran').tap()
  await page.locator('#cari-kembaran').fill('airpods')
  await page.getByRole('option').first().tap()
  await expect(page.locator('#kembaran ol > li')).toHaveCount(5)
  const listen = page.getByRole('navigation', { name: 'Utama' }).getByRole('link', { name: 'Dengar', exact: true })
  await listen.scrollIntoViewIfNeeded()
  await listen.tap()
  await expect(page).toHaveURL(/#dengar$/)
  await expect(page.locator('#dengar-title')).toBeInViewport()
})

test('pending audio can be cancelled without late playback; retry and route exit work', async ({ page }) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.resume
    AudioContext.prototype.resume = async function () {
      await new Promise(resolve => setTimeout(resolve, 350))
      return original.call(this)
    }
  })
  await page.goto('/#dengar')
  const panel = page.getByTestId('listen')
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await panel.getByRole('button', { name: 'Batalkan' }).click()
  await page.waitForTimeout(500)
  await expect(panel).toHaveAttribute('data-playing', 'false')
  await panel.getByRole('button', { name: 'B', exact: true }).click()
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'true')
  await expect(panel).toHaveAttribute('data-applied', (await panel.getAttribute('data-expected'))!)
  await page.getByRole('link', { name: 'Detail produk A' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'false')
  await page.getByRole('button', { name: 'Kembali ke hasil sebelumnya' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'false')
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'true')
  await panel.getByRole('button', { name: 'Stop', exact: true }).click()
})

test('audio rejection is recoverable and hidden tab pauses playback', async ({ page }) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.resume
    let fail = true
    AudioContext.prototype.resume = function () {
      if (fail) { fail = false; return Promise.reject(new Error('Test rejection')) }
      return original.call(this)
    }
  })
  await page.goto('/#dengar')
  const panel = page.getByTestId('listen')
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel.getByRole('alert')).toContainText('Coba lagi')
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'true')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(panel).toHaveAttribute('data-playing', 'false')
})

test('leaving during a pending resume cannot start audio later', async ({ page }) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.resume
    AudioContext.prototype.resume = async function () {
      await new Promise(resolve => setTimeout(resolve, 500))
      return original.call(this)
    }
  })
  const failures: string[] = []
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/#dengar')
  const panel = page.getByTestId('listen')
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await page.getByRole('link', { name: 'Detail produk A' }).click()
  await page.waitForTimeout(650)
  await page.getByRole('button', { name: 'Kembali ke hasil sebelumnya' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'false')
  await expect(panel).toHaveAttribute('data-starting', 'false')
  expect(failures).toEqual([])
})

test('pair changes stop playback; identical A/B gives zero EQ; volume works', async ({ page }) => {
  await page.goto('/#dengar')
  const panel = page.getByTestId('listen')
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'true')
  await page.getByRole('button', { name: 'Tukar A dan B' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'false')
  const a = (await page.getByTestId('compare-a').textContent())!
  await page.getByRole('combobox', { name: 'Ganti B (rig yang sama dengan A)', exact: true }).fill(a)
  await page.getByRole('option').filter({ hasText: a }).first().click()
  await expect(panel).toHaveAttribute('data-expected', '0,0,0,0,0,0,0,0,0,0')
  await expect(panel).toContainText('pengukuran yang sama')
  await panel.getByRole('slider', { name: 'Volume' }).fill('0')
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'true')
  await expect(panel.getByRole('slider', { name: 'Volume' })).toHaveValue('0')
  await panel.getByRole('button', { name: 'Stop', exact: true }).click()
})
