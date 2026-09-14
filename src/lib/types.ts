export type BandKey = 'subbass' | 'bass' | 'lowmid' | 'mid' | 'uppermid' | 'treble' | 'air'

export type Bands = Record<BandKey, number>

export interface Product {
  id: string
  name: string
  base: string
  variant: string
  rig: string
  isDefault: boolean
  pref: number | null
  cluster: number
  bands: Bands
}

export interface Cluster {
  id: number
  name: string
  size: number
  bands: Bands
}

export interface RigMeta {
  id: string
  source: string
  sourceUrl: string
  rig: string
  form: 'in-ear' | 'over-ear'
  formLabel: string
  role: 'default' | 'extra'
  reason: string
  entries: number
  models: number
  withPref: number
  pca: { explained: number[]; axes: { positive: string; negative: string }[] }
  k: number
  silhouette: number
  silhouetteByK: Record<string, number>
  clusters: Cluster[]
  distanceStats: { median: number; p05: number; p95: number }
  targetSpreadDb: number
}

export interface BandDef {
  key: BandKey
  label: string
  lo: number
  hi: number
  usedForSimilarity: boolean
}

export interface Meta {
  autoeq: { commit: string; date: string; url: string }
  grid: number[]
  bands: BandDef[]
  simMaxHz: number
  levelBand: [number, number]
  scoreZeroDb: number
  clipDb: number
  rigs: RigMeta[]
  totals: { entries: number; models: number }
  hasPrices: boolean
}

/** [product index, similarity 0-100, RMS distance in dB] */
export type Neighbor = [number, number, number]

/** [product id, x, y, cluster] */
export type MapPoint = [string, number, number, number]

export interface RigCurves {
  rig: string
  ids: string[]
  /** level aligned raw response, dB x 10 */
  raw: number[][]
  /** rig target, dB x 10 */
  target: number[]
  targetSpreadDb: number
}

export interface Price {
  id: string
  hargaRp: number
  toko: string
  tanggalCek: string
  url: string
}

export interface CoreData {
  meta: Meta
  products: Product[]
  neighbors: Neighbor[][]
  map: Record<string, MapPoint[]>
  prices: Price[]
  indexById: Map<string, number>
}
