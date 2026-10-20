import type { CoreData, MapPoint, Meta, Neighbor, Price, Product, RigCurves } from './types'

const base = import.meta.env.BASE_URL

async function getJson<T>(path: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const version = path.startsWith('data/') ? '?v=2' : ''
    const res = await fetch(`${base}${path}${version}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`${path}: ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

let corePromise: Promise<CoreData> | null = null

export function loadCore(): Promise<CoreData> {
  if (!corePromise) {
    corePromise = Promise.all([
      getJson<Meta>('data/meta.json'),
      getJson<Product[]>('data/products.json'),
      getJson<Neighbor[][]>('data/neighbors.json'),
      getJson<Record<string, MapPoint[]>>('data/map.json'),
      getJson<Price[]>('data/prices.json'),
    ]).then(([meta, products, neighbors, map, prices]) => {
      if (meta.schemaVersion !== 2 || !meta.totals ||
          !['measurements', 'modelRigPairs', 'distinctBaseNames'].every((key) => Number.isInteger(meta.totals[key as keyof Meta['totals']]))) {
        throw new Error('Invalid catalog metadata')
      }
      return {
        meta,
        products,
        neighbors,
        map,
        prices,
        indexById: new Map(products.map((p, i) => [p.id, i])),
      }
    }).catch((error: unknown) => {
      corePromise = null
      throw error
    })
  }
  return corePromise
}

export interface DecodedCurves {
  rig: string
  ids: string[]
  rowById: Map<string, number>
  raw: number[][]
  target: number[]
}

const curveCache = new Map<string, Promise<DecodedCurves>>()

export function loadCurves(rig: string): Promise<DecodedCurves> {
  let p = curveCache.get(rig)
  if (!p) {
    p = getJson<RigCurves>(`data/curves/${rig}.json`).then((c) => {
      const finiteRow = (row: unknown): row is number[] => Array.isArray(row) && row.length > 0 && row.every((v) => typeof v === 'number' && Number.isFinite(v))
      if (c.rig !== rig || !Array.isArray(c.ids) || !c.ids.every((id) => typeof id === 'string') ||
          new Set(c.ids).size !== c.ids.length || !finiteRow(c.target) || !Array.isArray(c.raw) ||
          c.raw.length !== c.ids.length || !c.raw.every((row) => finiteRow(row) && row.length === c.target.length)) {
        throw new Error('Invalid curve data')
      }
      return {
        rig: c.rig,
        ids: c.ids,
        rowById: new Map(c.ids.map((id, i) => [id, i])),
        raw: c.raw.map((row) => row.map((v) => v / 10)),
        target: c.target.map((v) => v / 10),
      }
    }).catch((error: unknown) => {
      curveCache.delete(rig)
      throw error
    })
    curveCache.set(rig, p)
  }
  return p
}

export interface HeroManifest {
  hero: boolean
}

export async function loadManifest(): Promise<HeroManifest> {
  try {
    return await getJson<HeroManifest>('media/manifest.json')
  } catch {
    return { hero: false }
  }
}
