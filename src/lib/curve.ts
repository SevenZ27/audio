export function decode(row: number[]): number[] {
  return row.map((v) => v / 10)
}

/** Linear interpolation on log frequency, clamped at the ends. */
export function valueAt(grid: number[], values: number[], f: number): number {
  if (f <= grid[0]) return values[0]
  const last = grid.length - 1
  if (f >= grid[last]) return values[last]
  const lf = Math.log10(f)
  let i = 1
  while (grid[i] < f) i++
  const x0 = Math.log10(grid[i - 1])
  const x1 = Math.log10(grid[i])
  const t = (lf - x0) / (x1 - x0)
  return values[i - 1] + t * (values[i] - values[i - 1])
}

export function rangeMean(grid: number[], values: number[], lo: number, hi: number): number {
  let sum = 0
  let n = 0
  grid.forEach((f, i) => {
    if (f >= lo && f <= hi) {
      sum += values[i]
      n++
    }
  })
  return n ? sum / n : 0
}

export function subtract(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i])
}

export function rms(values: number[], mask?: boolean[]): number {
  let sum = 0
  let n = 0
  values.forEach((v, i) => {
    if (mask && !mask[i]) return
    sum += v * v
    n++
  })
  return n ? Math.sqrt(sum / n) : 0
}

export function clip(values: number[], limit: number): number[] {
  return values.map((v) => Math.max(-limit, Math.min(limit, v)))
}

export function scoreFromDistance(distanceDb: number, zeroDb: number): number {
  return Math.round(100 * Math.max(0, 1 - distanceDb / zeroDb))
}

const REGIONS = [
  { key: 'bass', label: 'bass', lo: 20, hi: 250, up: 'lebih tebal', down: 'lebih tipis' },
  { key: 'mid', label: 'vokal', lo: 250, hi: 2000, up: 'lebih maju', down: 'lebih mundur' },
  { key: 'treble', label: 'treble', lo: 2000, hi: 10000, up: 'lebih terang', down: 'lebih kalem' },
] as const

export interface RegionDiff {
  key: 'bass' | 'mid' | 'treble'
  label: string
  db: number
}

/** Average difference of b minus a per broad region, in dB. */
export function regionDiffs(grid: number[], a: number[], b: number[]): RegionDiff[] {
  const d = subtract(b, a)
  return REGIONS.map((r) => ({ key: r.key, label: r.label, db: rangeMean(grid, d, r.lo, r.hi) }))
}

const SAME_DB = 1

/** One short sentence describing how b sounds compared to a. */
export function diffSentence(grid: number[], a: number[], b: number[]): string {
  const diffs = regionDiffs(grid, a, b)
  const sorted = [...diffs].sort((x, y) => Math.abs(y.db) - Math.abs(x.db))
  const main = sorted[0]
  if (Math.abs(main.db) < SAME_DB) return 'Karakternya hampir sama di bass, vokal, dan treble.'
  const def = REGIONS.find((r) => r.key === main.key)!
  const amount = Math.max(1, Math.round(Math.abs(main.db)))
  const first = `${cap(main.label)}-nya ${amount} dB ${main.db > 0 ? def.up : def.down}`
  const similar = sorted.slice(1).filter((d) => Math.abs(d.db) < SAME_DB)
  if (similar.length) return `${first}, ${similar.map((d) => d.label).join(' dan ')} mirip.`
  const second = sorted[1]
  const def2 = REGIONS.find((r) => r.key === second.key)!
  return `${first}, ${second.label} ${second.db > 0 ? def2.up : def2.down}.`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
