import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diffSentence, regionDiffs, valueAt } from './curve'
import { eqGains, loudnessPreamp, OCTAVE_HZ, MAX_GAIN_DB } from './eq'
import { parseHash, productHref } from './router'
import { normalize, searchProducts } from './search'
import { QUIZ, rankByTaste, shelfAt, tasteFromAnswers, tiltAt } from './taste'
import type { Meta, Product, RigCurves } from './types'

const dataDir = resolve(__dirname, '../../public/data')
const read = <T,>(p: string): T => JSON.parse(readFileSync(resolve(dataDir, p), 'utf-8')) as T
const meta = read<Meta>('meta.json')
const products = read<Product[]>('products.json')
const indexById = new Map(products.map((p, i) => [p.id, i]))
const grid = meta.grid

describe('search', () => {
  it('finds AirPods by typing part of the name', () => {
    const names = searchProducts(products, 'airpods', 20).map((i) => products[i].name.toLowerCase())
    expect(names.length).toBeGreaterThan(0)
    expect(names.some((n) => n.includes('airpods pro'))).toBe(true)
  })

  it('ignores case, spaces and punctuation', () => {
    expect(normalize('  Sony WH-1000XM4 ')).toBe('sony wh 1000xm4')
    const a = searchProducts(products, 'AIRPODS PRO')
    const b = searchProducts(products, 'airpodspro')
    expect(a.length).toBeGreaterThan(0)
    expect(b).toEqual(expect.arrayContaining([a[0]]))
  })

  it('returns nothing for an empty query', () => {
    expect(searchProducts(products, '   ')).toEqual([])
  })
})

describe('curve helpers', () => {
  it('interpolates on log frequency', () => {
    const g = [10, 100, 1000]
    expect(valueAt(g, [0, 10, 20], Math.sqrt(10 * 100))).toBeCloseTo(5)
    expect(valueAt(g, [0, 10, 20], 5)).toBe(0)
  })

  it('describes the main difference in one sentence', () => {
    const a = grid.map(() => 0)
    const b = grid.map((f) => (f <= 250 ? 2 : 0))
    expect(diffSentence(grid, a, b)).toBe('Bass-nya 2 dB lebih tebal, vokal dan treble mirip.')
    expect(diffSentence(grid, a, a)).toMatch(/hampir sama/)
    const r = regionDiffs(grid, a, b)
    expect(r[0].db).toBeCloseTo(2)
  })
})

describe('Dengar Bedanya filter gains', () => {
  it('matches the curve difference at each octave and is clamped', () => {
    const a = grid.map(() => 0)
    const b = grid.map((f) => 3 * Math.log2(f / 1000))
    const gains = eqGains(grid, a, b)
    expect(gains).toHaveLength(10)
    OCTAVE_HZ.forEach((f, i) => {
      const expected = Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, valueAt(grid, b, f) - valueAt(grid, a, f)))
      expect(gains[i]).toBeCloseTo(expected, 1)
    })
    const big = eqGains(grid, a, grid.map(() => 30))
    expect(big.every((g) => g === 12)).toBe(true)
  })

  it('uses real curves from the data', () => {
    const rig = meta.rigs[0]
    const c = read<RigCurves>(`curves/${rig.id}.json`)
    const A = c.raw[0].map((v) => v / 10)
    const B = c.raw[1].map((v) => v / 10)
    const gains = eqGains(grid, A, B)
    expect(gains[5]).toBeCloseTo(valueAt(grid, B, 1000) - valueAt(grid, A, 1000), 0)
  })

  it('preamp cancels a flat boost', () => {
    expect(loudnessPreamp(Array(10).fill(6))).toBeCloseTo(-6)
    expect(loudnessPreamp(Array(10).fill(0))).toBeCloseTo(0)
  })
})

describe('quiz', () => {
  const rig = meta.rigs.find((r) => r.form === 'in-ear' && r.role === 'default')!
  const c = read<RigCurves>(`curves/${rig.id}.json`)
  const input = {
    grid,
    target: c.target.map((v) => v / 10),
    raw: c.raw.map((row) => row.map((v) => v / 10)),
    ids: c.ids,
    products,
    indexById,
    clipDb: meta.clipDb,
    simMaxHz: meta.simMaxHz,
    scoreZeroDb: meta.scoreZeroDb,
  }

  it('shelf and tilt follow the ranges', () => {
    expect(shelfAt(20, 8)).toBeGreaterThan(7.5)
    expect(shelfAt(2000, 8)).toBeLessThan(0.1)
    expect(tiltAt(1000, 2)).toBe(0)
    expect(tiltAt(10000, -3)).toBe(-3)
    const t = tasteFromAnswers([0, 0, 0, 0, 3])
    expect(t.bassDb).toBeLessThanOrEqual(8)
    expect(t.trebleDb).toBeGreaterThanOrEqual(-3)
  })

  it('always gives 5 recommendations of distinct models', () => {
    const recs = rankByTaste(input, tasteFromAnswers([1, 1, 1, 2, 2]))
    expect(recs).toHaveLength(5)
    expect(new Set(recs.map((r) => products[r.index].base)).size).toBe(5)
    expect(recs.every((r) => products[r.index].rig === rig.id)).toBe(true)
  })

  it('liking bass really changes the order', () => {
    const bassAnswer = QUIZ[3].options.findIndex((o) => (o.bass ?? 0) >= 3)
    const noBass = QUIZ[3].options.findIndex((o) => (o.bass ?? 0) < 0)
    const likesBass = rankByTaste(input, tasteFromAnswers([0, 1, 0, bassAnswer, 2]))
    const dislikes = rankByTaste(input, tasteFromAnswers([0, 1, 3, noBass, 2]))
    expect(likesBass.map((r) => r.index)).not.toEqual(dislikes.map((r) => r.index))
    const bassOf = (rs: typeof likesBass) =>
      rs.reduce((s, r) => s + products[r.index].bands.bass + products[r.index].bands.subbass, 0) / rs.length
    expect(bassOf(likesBass)).toBeGreaterThan(bassOf(dislikes))
  })
})

describe('router', () => {
  it('sends malformed encodings to the product not-found view', () => {
    expect(parseHash('#/produk/%ZZ')).toEqual({ page: 'product', id: '' })
    expect(parseHash('#/produk/%E0%A4%A')).toEqual({ page: 'product', id: '' })
    expect(parseHash('#/produk/')).toEqual({ page: 'product', id: '' })
  })
  it('round trips product ids with special characters', () => {
    const id = 'superreview-inear~apple-airpods-pro'
    const r = parseHash(productHref(id))
    expect(r).toEqual({ page: 'product', id })
    expect(parseHash('#kuis')).toEqual({ page: 'home', section: 'kuis' })
  })
})

describe('quiz form choices', () => {
  it('only promises the two form factors supported by the data', () => {
    expect(QUIZ[0].options.map((o) => o.form)).toEqual(['in-ear', 'over-ear'])
    expect(tasteFromAnswers([0]).form).toBe('in-ear')
    expect(tasteFromAnswers([1]).form).toBe('over-ear')
  })
})
