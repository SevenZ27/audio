import { FILTER_Q, OCTAVE_HZ } from './eq'

const BPM = 96
const STEP = 60 / BPM / 4 // sixteenth note
const LOOKAHEAD = 0.12

// Am, F, C, G as MIDI notes
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
]
const BASS_PATTERN = [0, null, 0, null, null, 0, null, 12, 0, null, 0, null, null, 7, null, 0]

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

/** A small procedural loop (kick, snare, hats, bass, pad) played through 10 peaking filters. */
export class Jam {
  readonly ctx: AudioContext
  readonly filters: BiquadFilterNode[]
  private readonly bus: GainNode
  private readonly preamp: GainNode
  private readonly master: GainNode
  private readonly noise: AudioBuffer
  private timer: number | null = null
  private nextTime = 0
  private step = 0
  private volume = 0.6

  constructor() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctor()
    this.bus = this.ctx.createGain()
    this.bus.gain.value = 0.5
    this.preamp = this.ctx.createGain()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    this.filters = OCTAVE_HZ.map((f) => {
      const bq = this.ctx.createBiquadFilter()
      bq.type = 'peaking'
      bq.frequency.value = f
      bq.Q.value = FILTER_Q
      bq.gain.value = 0
      return bq
    })
    let node: AudioNode = this.bus
    node.connect(this.preamp)
    node = this.preamp
    for (const f of this.filters) {
      node.connect(f)
      node = f
    }
    const limiter = this.ctx.createDynamicsCompressor()
    limiter.threshold.value = -6
    limiter.ratio.value = 12
    node.connect(limiter)
    limiter.connect(this.master)
    this.master.connect(this.ctx.destination)

    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate)
    const ch = this.noise.getChannelData(0)
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1
  }

  get running() {
    return this.timer !== null
  }

  async start() {
    await this.ctx.resume()
    if (this.timer !== null) return
    this.nextTime = this.ctx.currentTime + 0.05
    this.step = 0
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05)
    this.timer = window.setInterval(() => this.schedule(), 25)
    this.schedule()
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04)
  }

  setVolume(v: number) {
    this.volume = v
    if (this.running) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03)
  }

  /** Apply filter gains in dB. The values are set directly so they can be read back. */
  setEq(gains: number[], preampDb: number) {
    this.filters.forEach((f, i) => {
      f.gain.value = gains[i] ?? 0
    })
    this.preamp.gain.value = 10 ** (preampDb / 20)
  }

  appliedGains(): number[] {
    return this.filters.map((f) => Math.round(f.gain.value * 10) / 10)
  }

  close() {
    this.stop()
    void this.ctx.close()
  }

  private schedule() {
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime)
      this.nextTime += STEP
      this.step = (this.step + 1) % 64
    }
  }

  private playStep(step: number, t: number) {
    const bar = Math.floor(step / 16) % 4
    const s = step % 16
    const chord = CHORDS[bar]
    if (s === 0 || s === 8 || s === 10) this.kick(t)
    if (s === 4 || s === 12) this.snare(t)
    if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.09 : 0.05)
    const b = BASS_PATTERN[s]
    if (b !== null) this.bass(t, midi(chord[0] - 24 + b))
    if (s === 0) this.pad(t, chord.map(midi), STEP * 16)
  }

  private env(t: number, peak: number, attack: number, decay: number) {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
    g.connect(this.bus)
    return g
  }

  private kick(t: number) {
    const o = this.ctx.createOscillator()
    o.frequency.setValueAtTime(120, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    const g = this.env(t, 0.9, 0.004, 0.32)
    o.connect(g)
    o.start(t)
    o.stop(t + 0.4)
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = this.env(t, peak, 0.002, decay)
    src.connect(f)
    f.connect(g)
    src.start(t, Math.random() * 0.5)
    src.stop(t + decay + 0.05)
  }

  private snare(t: number) {
    this.noiseHit(t, 'bandpass', 1800, 0.45, 0.18)
    const o = this.ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(190, t)
    const g = this.env(t, 0.25, 0.002, 0.1)
    o.connect(g)
    o.start(t)
    o.stop(t + 0.15)
  }

  private hat(t: number, peak: number) {
    this.noiseHit(t, 'highpass', 7500, peak, 0.05)
  }

  private bass(t: number, freq: number) {
    const o = this.ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = freq
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(900, t)
    lp.frequency.exponentialRampToValueAtTime(180, t + 0.2)
    const g = this.env(t, 0.32, 0.006, 0.22)
    o.connect(lp)
    lp.connect(g)
    o.start(t)
    o.stop(t + 0.3)
  }

  private pad(t: number, freqs: number[], length: number) {
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.4)
    g.gain.setValueAtTime(0.09, t + length - 0.5)
    g.gain.exponentialRampToValueAtTime(0.0001, t + length)
    lp.connect(g)
    g.connect(this.bus)
    freqs.forEach((f, i) => {
      for (const detune of [-6, 6]) {
        const o = this.ctx.createOscillator()
        o.type = i === 0 ? 'triangle' : 'sawtooth'
        o.frequency.value = f
        o.detune.value = detune
        o.connect(lp)
        o.start(t)
        o.stop(t + length + 0.05)
      }
    })
  }
}
