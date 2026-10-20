import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import { QUIZ, tasteFromAnswers, rankByTaste, BASS_RANGE } from './taste'
import type { Meta, Product, RigCurves } from './types'

const read = <T,>(name: string): T => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8'))
const overlap = (a: number[], b: number[]) => a.filter(x => b.includes(x)).length / a.length

test('all 512 quiz answer combinations respect catalog constraints and respond consistently', () => {
  const meta = read<Meta>('meta')
  const products = read<Product[]>('products')
  const indexById = new Map(products.map((p, i) => [p.id, i]))
  const combinations = QUIZ.reduce<number[][]>((rows, q) => rows.flatMap(row => q.options.map((_, i) => [...row, i])), [[]])
  expect(combinations).toHaveLength(512)
  const output = meta.rigs.filter(r => r.role === 'default').map(rig => {
    const c = read<RigCurves>(`curves/${rig.id}`)
    const input = { grid: meta.grid, target: c.target.map(v => v / 10), raw: c.raw.map(row => row.map(v => v / 10)),
      ids: c.ids, products, indexById, clipDb: meta.clipDb, simMaxHz: meta.simMaxHz, scoreZeroDb: meta.scoreZeroDb }
    const profiles = new Set<string>(), lists = new Set<string>(), exposed = new Set<number>()
    const rows = combinations.filter(a => tasteFromAnswers(a).form === rig.form).map(answers => {
      const taste = tasteFromAnswers(answers)
      const ranking = rankByTaste(input, taste)
      const ids = ranking.map(x => x.index)
      expect(ranking).toHaveLength(5)
      expect(new Set(ids).size).toBe(5)
      ranking.forEach((x, i) => {
        expect(products[x.index].rig).toBe(rig.id)
        expect(products[x.index].isDefault).toBe(true)
        expect(Number.isFinite(x.distance)).toBe(true)
        if (i) expect(x.distance).toBeGreaterThanOrEqual(ranking[i - 1].distance)
        exposed.add(x.index)
      })
      profiles.add(`${taste.bassDb},${taste.trebleDb}`)
      lists.add(ids.join(','))
      const neutral = rankByTaste(input, { ...taste, bassDb: 0, trebleDb: 0 }).map(x => x.index)
      const perturbed = rankByTaste(input, { ...taste, bassDb: Math.min(BASS_RANGE[1], taste.bassDb + 0.5) }).map(x => x.index)
      return { answers, taste, recommendations: ids.map(i => products[i].id), neutralOverlapAt5: overlap(ids, neutral),
        bassPerturbationOverlapAt5: overlap(ids, perturbed) }
    })
    return { rig: rig.id, combinations: rows.length, distinctProfiles: profiles.size, distinctRankedLists: lists.size,
      exposedModels: exposed.size, eligibleModels: products.filter(p => p.rig === rig.id && p.isDefault).length,
      neutralOverlapAt5: rows.reduce((s, r) => s + r.neutralOverlapAt5, 0) / rows.length,
      bassPerturbationOverlapAt5: rows.reduce((s, r) => s + r.bassPerturbationOverlapAt5, 0) / rows.length, rows }
  })
  expect(output).toHaveLength(2)
  if (process.env.AUDIOMATCH_EVALUATE === '1') {
    mkdirSync('docs/evaluation', { recursive: true })
    writeFileSync('docs/evaluation/quiz.json', JSON.stringify({ scope: 'Exhaustive synthetic answers; not user preferences',
      tasteCodeSha256: createHash('sha256').update(readFileSync('src/lib/taste.ts')).digest('hex'), rigs: output }, null, 2))
  }
})
