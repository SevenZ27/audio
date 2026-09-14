import type { Product } from './types'

export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

interface Hit {
  index: number
  rank: number
}

/** Partial, case insensitive search. Every word typed must appear in the name.
 *  One result per (rig, model): the default variant wins unless only a variant matches. */
export function searchProducts(products: Product[], query: string, limit = 8): number[] {
  const q = normalize(query)
  if (!q) return []
  const words = q.split(' ')
  const compactQ = q.replace(/ /g, '')
  const hits: Hit[] = []
  products.forEach((p, index) => {
    const name = normalize(p.name)
    const compact = name.replace(/ /g, '')
    const all = words.every((w) => name.includes(w)) || compact.includes(compactQ)
    if (!all) return
    let rank = 2
    if (name.startsWith(q) || compact.startsWith(compactQ)) rank = 0
    else if (name.split(' ').some((part) => part.startsWith(words[0]))) rank = 1
    hits.push({ index, rank })
  })
  hits.sort((a, b) => {
    const pa = products[a.index]
    const pb = products[b.index]
    return (
      a.rank - b.rank ||
      Number(pb.isDefault) - Number(pa.isDefault) ||
      pa.name.length - pb.name.length ||
      pa.name.localeCompare(pb.name)
    )
  })
  const seen = new Set<string>()
  const out: number[] = []
  for (const h of hits) {
    const p = products[h.index]
    const key = `${p.rig}|${p.base}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h.index)
    if (out.length === limit) break
  }
  return out
}
