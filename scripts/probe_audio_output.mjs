// Measure rendered PCM through the real UI's audio graph, not AudioParam readback.
// Run against the local preview: node scripts/probe_audio_output.mjs
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--mute-audio'] })
try {
  const page = await browser.newPage()
  await page.addInitScript(() => {
    const Base = window.AudioContext
    window.AudioContext = class extends Base {
      constructor() {
        super()
        const nodes = [], filters = []
        window.__pcm = { ctx: this, nodes, filters }
        const gain = this.createGain.bind(this), filter = this.createBiquadFilter.bind(this)
        this.createGain = () => { const n = gain(); nodes.push(n); return n }
        this.createBiquadFilter = () => { const n = filter(); filters.push(n); return n }
      }
    }
  })
  await page.goto('http://127.0.0.1:4171/#dengar')
  if (process.argv.includes('--sony')) {
    await page.getByRole('combobox', { name: 'Ganti A', exact: true }).fill('Sony WF-1000XM4')
    await page.getByRole('listbox').getByRole('option').filter({ hasText: 'HypetheSonics' }).click()
    await page.getByRole('combobox', { name: 'Ganti B (rig yang sama dengan A)', exact: true }).fill('Apple Airpods Pro 2')
    await page.getByRole('listbox').getByRole('option').click()
  }
  const panel = page.getByTestId('listen')
  await panel.getByRole('button', { name: 'Putar musik', exact: true }).click()
  await page.waitForTimeout(500)
  await panel.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.waitForTimeout(350)
  await page.evaluate(() => {
    const p = window.__pcm
    // bus, preamp, master are the first three gains in Jam's constructor.
    const master = p.nodes[2]
    master.gain.cancelScheduledValues(p.ctx.currentTime)
    master.gain.setValueAtTime(.3, p.ctx.currentTime)
    p.analyser = p.ctx.createAnalyser(); p.analyser.fftSize = 32768
    master.connect(p.analyser)
    p.probe = p.ctx.createOscillator()
    const level = p.ctx.createGain(); level.gain.value = .02
    p.probe.connect(level); level.connect(p.nodes[0]); p.probe.start()
  })
  const results = []
  for (const hz of [125, 500, 2000, 8000]) {
    await page.evaluate(hz => { window.__pcm.probe.frequency.value = hz }, hz)
    const modes = {}
    for (const mode of ['A', 'B', 'A']) {
      await panel.getByRole('button', { name: mode, exact: true }).click()
      // Allow a full analyser window after the 15ms smoothing settles.
      await page.waitForTimeout(1100)
      const reading = await page.evaluate(hz => {
        const p = window.__pcm, values = new Float32Array(p.analyser.fftSize)
        p.analyser.getFloatTimeDomainData(values)
        const rms = Math.sqrt(values.reduce((s,v) => s + v*v, 0) / values.length)
        const freq = new Float32Array([hz]), mag = new Float32Array(1), phase = new Float32Array(1)
        let db = 20*Math.log10(p.nodes[1].gain.value)
        p.filters.slice(0,10).forEach(f => { f.getFrequencyResponse(freq,mag,phase); db += 20*Math.log10(mag[0]) })
        return { rms, predictedDb: db }
      }, hz)
      modes[mode === 'A' && modes.A ? 'A_return' : mode] = reading
    }
    results.push({ hz, ...modes, measuredDeltaDb: 20*Math.log10(modes.B.rms/modes.A.rms), returnDeltaDb: 20*Math.log10(modes.A_return.rms/modes.A.rms) })
  }
  const report = { pair: [await page.getByTestId('compare-a').innerText(), await page.getByTestId('compare-b').innerText()], results,
    scope: 'Rendered PCM from low-level sine probes through the actual Jam graph, switched with UI buttons. Desktop Chrome, muted output. Not a physical speaker or perceptual test.' }
  mkdirSync('docs/audio', { recursive: true })
  writeFileSync(`docs/audio/pcm-output-probe${process.argv.includes('--sony') ? '-sony' : ''}.json`, JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
  if (results.some(r => !Number.isFinite(r.measuredDeltaDb) || !Number.isFinite(r.returnDeltaDb) || r.A.rms <= 0 || r.B.rms <= 0 || Math.abs(r.measuredDeltaDb - r.B.predictedDb) > .15 || Math.abs(r.returnDeltaDb) > .05)) throw new Error('PCM does not match the selected EQ response')
} finally { await browser.close() }
