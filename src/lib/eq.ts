import { valueAt } from './curve'

export const OCTAVE_HZ = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
export const MAX_GAIN_DB = 12
export const FILTER_Q = 1.41

/** Gain per octave filter that turns headphone A into headphone B, clamped to +-12 dB. */
export function eqGains(grid: number[], a: number[], b: number[]): number[] {
  return OCTAVE_HZ.map((f) => {
    const g = valueAt(grid, b, f) - valueAt(grid, a, f)
    const clamped = Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, g))
    return Math.round(clamped * 10) / 10
  })
}

/** Average power change of the filter bank with every octave weighted the same.
 *  Returned as the preamp (dB) that cancels it, so A and B play at about the same loudness. */
export function loudnessPreamp(gains: number[]): number {
  const mean = gains.reduce((s, g) => s + 10 ** (g / 10), 0) / gains.length
  return Math.round(-10 * Math.log10(mean) * 10) / 10
}
