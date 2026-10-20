// Render the actual Jam instruments with identical seeded noise/notes in each mode.
import { chromium } from '@playwright/test'
import ts from 'typescript'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const source = readFileSync('src/lib/audio.ts','utf8')
const eqSource = readFileSync('src/lib/eq.ts','utf8')
const code = ts.transpileModule(eqSource.replace(/^import .*$/m,'').replaceAll('export ','') + '\n' + source.replace("import { FILTER_Q, OCTAVE_HZ } from './eq'", '').replace('export class Jam', 'class Jam'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + '\nwindow.ProbeJam = Jam;'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--mute-audio'] })
try {
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:4171/#dengar')
  const panel = page.getByTestId('listen')
  await panel.getByRole('button', { name: 'Putar musik', exact: true }).waitFor({state:'visible'})
  await page.waitForFunction(() => document.querySelector('[data-testid="listen"]')?.getAttribute('data-expected'))
  const gains = (await panel.getAttribute('data-expected')).split(',').map(Number)
  const preamp = Number(await panel.getAttribute('data-preamp'))
  await page.addScriptTag({ content: code })
  const report = await page.evaluate(async ({gains,preamp}) => {
    const originalRandom = Math.random, Base = window.AudioContext
    const sr = 48000, seconds = 10
    const render = async mode => {
      let seed = 123456
      Math.random = () => { seed = (Math.imul(1664525,seed)+1013904223)>>>0; return seed/4294967296 }
      window.AudioContext = class extends OfflineAudioContext { constructor() { super(1,sr*seconds,sr) } }
      try {
        const j = new window.ProbeJam()
        j.master.gain.value = .3
        j.setEq(mode==='A' ? gains.map(()=>0) : gains, mode==='A' ? 0 : preamp)
        for(let s=0;s<64;s++) j.playStep(s,s*(60/96/4))
        return Array.from((await j.ctx.startRendering()).getChannelData(0))
      } finally { Math.random = originalRandom; window.AudioContext = Base }
    }
    const A = await render('A'), B = await render('B')
    const rms = x => Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length)
    const residual = B.map((v,i)=>v-A[i])
    return { A,B,sr,metrics: { rmsA:rms(A),rmsB:rms(B), residualRmsRelativeDb:20*Math.log10(rms(residual)/rms(A)), rmsDeltaDb:20*Math.log10(rms(B)/rms(A)), maxAbsoluteSampleDifference: residual.reduce((m,v)=>Math.max(m,Math.abs(v)),0), peakA:A.reduce((m,v)=>Math.max(m,Math.abs(v)),0), peakB:B.reduce((m,v)=>Math.max(m,Math.abs(v)),0) } }
  }, {gains,preamp})
  const out = 'docs/audio/listening-check'
  mkdirSync(out,{recursive:true})
  function wav(samples) {
    const b=Buffer.alloc(44+samples.length*2)
    b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16)
    b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(report.sr,24);b.writeUInt32LE(report.sr*2,28)
    b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40)
    samples.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2))
    return b
  }
  writeFileSync(`${out}/A-original.wav`,wav(report.A))
  writeFileSync(`${out}/B-default-pair.wav`,wav(report.B))
  writeFileSync(`${out}/A-B-A-B.wav`,wav([...report.A,...report.B,...report.A,...report.B]))
  const evidence = { pair:['Apple Airpods Pro 2','SeeAudio Yume'], gains, preamp, sampleRate:report.sr, durationSeconds:10, metrics:report.metrics, sourceSha256:createHash('sha256').update(source).digest('hex'), eqSourceSha256:createHash('sha256').update(eqSource).digest('hex'), scope:'Actual Jam synthesis, identical seeded notes/noise, same master level, same filter/limiter graph; offline rendering. Does not reproduce live scheduler or physical output. No independent loudness normalization.' }
  writeFileSync(`${out}/report.json`,JSON.stringify(evidence,null,2)+'\n')
  console.log(JSON.stringify(evidence,null,2))
  if(!Number.isFinite(report.metrics.residualRmsRelativeDb) || report.metrics.maxAbsoluteSampleDifference < .00001 || report.metrics.peakA >= 1 || report.metrics.peakB >= 1) throw new Error('Actual music comparison is silent, identical or clipped')
} finally { await browser.close() }
