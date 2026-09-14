import type { CoreData, MapPoint, Meta, Neighbor, Price, Product, RigCurves } from './types'

const base = import.meta.env.BASE_URL

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return (await res.json()) as T
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
    ]).then(([meta, products, neighbors, map, prices]) => ({
      meta,
      products,
      neighbors,
      map,
      prices,
      indexById: new Map(products.map((p, i) => [p.id, i])),
    }))
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
    p = getJson<RigCurves>(`data/curves/${rig}.json`).then((c) => ({
      rig: c.rig,
      ids: c.ids,
      rowById: new Map(c.ids.map((id, i) => [id, i])),
      raw: c.raw.map((row) => row.map((v) => v / 10)),
      target: c.target.map((v) => v / 10),
    }))
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
