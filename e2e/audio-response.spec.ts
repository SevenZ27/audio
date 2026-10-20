import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

test('native audio response, level diagnostics and voice cleanup', async ({ page }, info) => {
  await page.addInitScript(() => {
    const Base = window.AudioContext
    const state = { contexts: [] as AudioContext[], filters: [] as BiquadFilterNode[], activeVoices: 0 }
    ;(window as any).__audioProbe = state
    window.AudioContext = class extends Base {
      constructor() {
        super()
        state.contexts.push(this)
        const filter = this.createBiquadFilter.bind(this)
        this.createBiquadFilter = () => { const node = filter(); state.filters.push(node); return node }
        const track = (node: any) => {
          const start = node.start.bind(node)
          node.start = (...args: any[]) => {
            state.activeVoices++
            node.addEventListener('ended', () => { state.activeVoices-- }, { once: true })
            return start(...args)
          }
          return node
        }
        const osc = this.createOscillator.bind(this), buffer = this.createBufferSource.bind(this)
        this.createOscillator = () => track(osc())
        this.createBufferSource = () => track(buffer())
      }
    }
  })
  await page.goto('/#dengar')
  const panel = page.getByTestId('listen')
  await panel.getByRole('button', { name: 'B', exact: true }).click()
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'true')
  await page.waitForTimeout(300)
  const report = await page.evaluate(async () => {
    const probe = (window as any).__audioProbe
    const filters: BiquadFilterNode[] = probe.filters.slice(0, 10)
    const meta = await (await fetch('/data/meta.json')).json()
    const c = await (await fetch('/data/curves/hypethesonics-inear.json')).json()
    const products = await (await fetch('/data/products.json')).json()
    const aName = document.querySelector('[data-testid="compare-a"]')!.textContent
    const bName = document.querySelector('[data-testid="compare-b"]')!.textContent
    const a = products.find((p: any) => p.name === aName && p.rig === c.rig)
    const b = products.find((p: any) => p.name === bName && p.rig === c.rig)
    const ar = c.raw[c.ids.indexOf(a.id)], br = c.raw[c.ids.indexOf(b.id)]
    const grid = meta.grid.filter((f: number) => f <= 10000)
    const frequencies = new Float32Array(grid), magnitude = new Float32Array(grid.length), phase = new Float32Array(grid.length)
    const actual = grid.map(() => 0)
    filters.forEach(f => {
      f.getFrequencyResponse(frequencies, magnitude, phase)
      magnitude.forEach((v, i) => { actual[i] += 20 * Math.log10(v) })
    })
    const desired = grid.map((_: number, i: number) => (br[i] - ar[i]) / 10)
    const residual = actual.map((v: number, i: number) => v - desired[i])
    const offset = residual.reduce((a: number, b: number) => a + b, 0) / residual.length
    const shapeRmseDb = Math.sqrt(residual.reduce((s: number, v: number) => s + (v - offset) ** 2, 0) / residual.length)
    const preamp = Number(document.querySelector('[data-testid="listen"]')!.getAttribute('data-preamp'))
    const render = async (mode: 'A' | 'B') => {
      const ctx = new OfflineAudioContext(1, 48000 * 2, 48000)
      const buffer = ctx.createBuffer(1, ctx.length, ctx.sampleRate), samples = buffer.getChannelData(0)
      // Deterministic multitone probe; this is not a listening loudness study.
      for (let i = 0; i < samples.length; i++) {
        samples[i] = [63, 125, 500, 2000, 8000].reduce((s, hz) => s + Math.sin(2 * Math.PI * hz * i / 48000), 0) * .08
      }
      const source = ctx.createBufferSource(); source.buffer = buffer
      const gain = ctx.createGain(); gain.gain.value = mode === 'B' ? 10 ** (preamp / 20) : 1
      source.connect(gain)
      let node: AudioNode = gain
      filters.forEach(f => {
        const filter = ctx.createBiquadFilter(); filter.type = 'peaking'
        filter.frequency.value = f.frequency.value; filter.Q.value = f.Q.value
        filter.gain.value = mode === 'B' ? f.gain.value : 0
        node.connect(filter); node = filter
      })
      const compressor = ctx.createDynamicsCompressor(); compressor.threshold.value = -6; compressor.ratio.value = 12
      node.connect(compressor); compressor.connect(ctx.destination); source.start()
      const out = (await ctx.startRendering()).getChannelData(0).slice(4800)
      return { rms: Math.sqrt(out.reduce((s, v) => s + v * v, 0) / out.length), peak: out.reduce((m, v) => Math.max(m, Math.abs(v)), 0) }
    }
    const A = await render('A'), B = await render('B')
    return { pair: [a.id, b.id], sampleRate: probe.contexts[0].sampleRate, grid, desiredDifferenceDb: desired,
      measuredFilterResponseDb: actual, shapeRmseDb, preampDb: preamp, probeA: A, probeB: B,
      probeRmsDeltaDb: 20 * Math.log10(B.rms / A.rms), activeVoices: probe.activeVoices }
  })
  expect(report.activeVoices).toBeGreaterThan(0)
  expect(report.measuredFilterResponseDb.every(Number.isFinite)).toBe(true)
  expect(report.probeA.peak).toBeLessThan(1)
  expect(report.probeB.peak).toBeLessThan(1)
  await panel.getByRole('button', { name: 'A', exact: true }).click()
  await page.waitForTimeout(300)
  const flat = await page.evaluate(() => {
    const filters: BiquadFilterNode[] = (window as any).__audioProbe.filters.slice(0, 10)
    const freq = new Float32Array([31.5, 125, 1000, 4000, 16000]), mag = new Float32Array(5), phase = new Float32Array(5)
    return Math.max(...filters.flatMap(f => { f.getFrequencyResponse(freq, mag, phase); return [...mag].map(v => Math.abs(20 * Math.log10(v))) }))
  })
  expect(flat).toBeLessThan(.01)
  for (let i = 0; i < 3; i++) {
    await panel.getByRole('button', { name: 'Stop', exact: true }).click()
    await panel.getByRole('button', { name: 'Putar musik' }).click()
    await expect(panel).toHaveAttribute('data-playing', 'true')
  }
  await panel.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.activeVoices)).toBe(0)
  await panel.getByRole('button', { name: 'Putar musik' }).click()
  await expect(panel).toHaveAttribute('data-playing', 'true')
  await page.getByRole('link', { name: 'Detail produk A' }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.contexts.every((c: AudioContext) => c.state === 'closed'))).toBe(true)
  const evidence = { ...report, flatModeMaxDeviationDb: flat, cleanupPassed: true,
    scope: 'One default pair; native filter response and synthetic multitone RMS/peak. Not perceptual validation.' }
  writeFileSync(info.outputPath('audio-response.json'), JSON.stringify(evidence, null, 2))
  if (process.env.AUDIOMATCH_AUDIO_REPORT === '1') {
    mkdirSync('docs/audio', { recursive: true })
    writeFileSync(`docs/audio/${info.project.name}.json`, JSON.stringify(evidence, null, 2))
  }
})
