import { clip, rms, scoreFromDistance, subtract } from './curve'
import type { Product } from './types'

export const BASS_RANGE = [-2, 8] as const
export const TREBLE_RANGE = [-3, 2] as const
export const SHELF_HZ = 150
export const TILT_START_HZ = 3000
export const TILT_FULL_HZ = 10000

export type Form = 'in-ear' | 'over-ear'

export interface QuizOption {
  label: string
  hint?: string
  bass?: number
  treble?: number
  form?: Form
}

export interface QuizQuestion {
  id: string
  title: string
  options: QuizOption[]
}

// The numbers below are design assumptions, not research results.
// They are shown in the UI and meant to be checked with user tests.
export const QUIZ: QuizQuestion[] = [
  {
    id: 'form',
    title: 'Kamu cari tipe yang mana?',
    options: [
      { label: 'IEM kabel', hint: 'masuk ke lubang telinga', form: 'in-ear' },
      { label: 'TWS atau earbuds', hint: 'yang pakai ujung karet', form: 'in-ear' },
      { label: 'Over-ear', hint: 'nutup seluruh telinga', form: 'over-ear' },
    ],
  },
  {
    id: 'use',
    title: 'Paling sering dipakai buat apa?',
    options: [
      { label: 'Di jalan atau olahraga', bass: 1 },
      { label: 'Kerja atau belajar', bass: 0, treble: -0.5 },
      { label: 'Main game atau nonton', bass: 1, treble: 0.5 },
      { label: 'Edit audio atau video', bass: -1 },
    ],
  },
  {
    id: 'genre',
    title: 'Genre yang paling sering diputar?',
    options: [
      { label: 'EDM atau hip-hop', bass: 2.5 },
      { label: 'Pop atau K-pop', bass: 1, treble: 0.5 },
      { label: 'Rock atau metal', bass: 0.5, treble: 0.5 },
      { label: 'Jazz, klasik, atau akustik', bass: -1, treble: -0.5 },
    ],
  },
  {
    id: 'bassHabit',
    title: 'Suka naikin bass di pengaturan EQ?',
    options: [
      { label: 'Sering, bass harus kerasa', bass: 3 },
      { label: 'Kadang-kadang', bass: 1 },
      { label: 'Ga pernah utak-atik', bass: 0 },
      { label: 'Malah suka nurunin', bass: -2 },
    ],
  },
  {
    id: 'sharp',
    title: 'Gampang capek sama suara yang tajam (s, cymbal)?',
    options: [
      { label: 'Iya banget', treble: -2 },
      { label: 'Sedikit', treble: -1 },
      { label: 'Biasa aja', treble: 0 },
      { label: 'Justru suka yang detail dan terang', treble: 1.5 },
    ],
  },
]

export interface Taste {
  form: Form
  bassDb: number
  trebleDb: number
}

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.max(lo, Math.min(hi, v))

/** answers[i] is the chosen option index for QUIZ[i]. */
export function tasteFromAnswers(answers: number[], quiz: QuizQuestion[] = QUIZ): Taste {
  let form: Form = 'in-ear'
  let bass = 0
  let treble = 0
  quiz.forEach((q, i) => {
    const opt = q.options[answers[i]]
    if (!opt) return
    if (opt.form) form = opt.form
    bass += opt.bass ?? 0
    treble += opt.treble ?? 0
  })
  return { form, bassDb: clamp(bass, BASS_RANGE), trebleDb: clamp(treble, TREBLE_RANGE) }
}

export function shelfAt(f: number, gainDb: number): number {
  return gainDb / (1 + (f / SHELF_HZ) ** 2)
}

export function tiltAt(f: number, gainDb: number): number {
  if (f <= TILT_START_HZ) return 0
  if (f >= TILT_FULL_HZ) return gainDb
  return (gainDb * Math.log(f / TILT_START_HZ)) / Math.log(TILT_FULL_HZ / TILT_START_HZ)
}

/** Offset from the rig target that the quiz asks for. */
export function tasteOffset(grid: number[], taste: Taste): number[] {
  return grid.map((f) => shelfAt(f, taste.bassDb) + tiltAt(f, taste.trebleDb))
}

export interface Ranked {
  index: number
  distance: number
  score: number
}

export interface RankInput {
  grid: number[]
  target: number[]
  /** raw curves in dB, aligned with ids */
  raw: number[][]
  ids: string[]
  products: Product[]
  indexById: Map<string, number>
  clipDb: number
  simMaxHz: number
  scoreZeroDb: number
}

export function rankByTaste(input: RankInput, taste: Taste, n = 5): Ranked[] {
  const want = tasteOffset(input.grid, taste)
  const mask = input.grid.map((f) => f <= input.simMaxHz)
  const out: Ranked[] = []
  input.ids.forEach((id, row) => {
    const index = input.indexById.get(id)
    if (index === undefined || !input.products[index].isDefault) return
    const err = clip(subtract(input.raw[row], input.target), input.clipDb)
    const distance = rms(subtract(err, want), mask)
    out.push({ index, distance, score: scoreFromDistance(distance, input.scoreZeroDb) })
  })
  out.sort((a, b) => a.distance - b.distance || a.index - b.index)
  return out.slice(0, n)
}
