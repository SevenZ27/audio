import { scaleLinear } from 'd3-scale'
import { useMemo, useRef, useState } from 'react'
import { SectionHead } from '../components/common'
import { productHref } from '../lib/router'
import type { CoreData } from '../lib/types'

export const CLUSTER_COLORS = ['#2DD4BF', '#A78BFA', '#F5C06B', '#F472B6', '#60A5FA', '#A3E635', '#FB923C', '#E5E7EB']

const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`

export function SoundMap({ data }: { data: CoreData }) {
  const rigs = data.meta.rigs
  const [rigId, setRigId] = useState(rigs[0].id)
  const rig = rigs.find((r) => r.id === rigId)!
  const points = data.map[rigId]
  const [focus, setFocus] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 720
  const H = 520
  const pad = 28
  const { x, y } = useMemo(() => {
    const xs = points.map((p) => p[1])
    const ys = points.map((p) => p[2])
    const q = (arr: number[], t: number) => [...arr].sort((a, b) => a - b)[Math.floor(t * (arr.length - 1))]
    // trim the most extreme 1% so a few odd measurements do not squash the map
    const x = scaleLinear().domain([q(xs, 0.01), q(xs, 0.99)]).range([pad, W - pad]).nice().clamp(true)
    const y = scaleLinear().domain([q(ys, 0.01), q(ys, 0.99)]).range([H - pad, pad]).nice().clamp(true)
    return { x, y }
  }, [points])

  const active = hover ?? focus
  const activePoint = active !== null ? points[active] : null
  const activeProduct = activePoint ? data.products[data.indexById.get(activePoint[0])!] : null

  const move = (dx: number, dy: number) => {
    const from = focus ?? 0
    const [, fx, fy] = points[from]
    let best: number | null = null
    let bestScore = Infinity
    const px = x(fx)
    const py = y(fy)
    points.forEach((p, i) => {
      if (i === from) return
      const vx = x(p[1]) - px
      const vy = y(p[2]) - py
      const along = vx * dx + vy * dy
      if (along <= 0.5) return
      const across = Math.abs(vx * dy - vy * dx)
      const score = along + across * 2.5
      if (score < bestScore) {
        bestScore = score
        best = i
      }
    })
    if (best !== null) setFocus(best)
  }

  const onKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (keys[e.key]) {
      if (focus === null) setFocus(0)
      else move(...keys[e.key])
      e.preventDefault()
    } else if (e.key === 'Enter' && activeProduct) {
      window.location.hash = productHref(activeProduct.id)
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setFocus(null)
    }
  }

  const [e1, e2] = rig.pca.explained
  const tipLeft = activePoint ? (x(activePoint[1]) / W) * 100 : 0
  const tipTop = activePoint ? (y(activePoint[2]) / H) * 100 : 0

  return (
    <section aria-labelledby="peta-title" id="peta" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
      <SectionHead index="03" id="peta-title" title="Peta Karakter Suara">
        Jelajahi karakter suara. <span className="text-ink-2">Peta ini ringkasan, bukan urutan kemiripan.</span>
      </SectionHead>

      <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,360px)_1fr] md:items-end">
        <div>
          <label htmlFor="map-rig" className="mb-2 block text-sm text-ink-2">
            Alat ukur (rig)
          </label>
          <select
            id="map-rig"
            className="field"
            value={rigId}
            onChange={(e) => {
              setRigId(e.target.value)
              setFocus(null)
            }}
          >
            {rigs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.formLabel}: {r.source} ({r.rig}), {r.models} model
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-ink-2">
          Peta ini hasil PCA dari kurva tiap produk relatif ke target. Sumbu datar menangkap{' '}
          <span className="num text-ink">{pct(e1)}</span> variasi (ke kanan: {rig.pca.axes[0].positive.toLowerCase()} lebih banyak), sumbu
          tegak <span className="num text-ink">{pct(e2)}</span> (ke atas: {rig.pca.axes[1].positive.toLowerCase()} lebih banyak). Warna =
          kelompok hasil k-means, k=<span className="num">{rig.k}</span>.
        </p>
      </div>

      <div className="card relative overflow-hidden p-2 md:p-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="application"
          aria-roledescription="peta titik"
          aria-label={`Peta ${rig.models} model dari ${rig.source}. Pakai panah untuk pindah titik, Enter untuk buka detail.`}
          tabIndex={0}
          onKeyDown={onKey}
          onFocus={() => focus === null && setFocus(0)}
          data-testid="sound-map"
        >
          <line x1={W / 2} x2={W / 2} y1={pad} y2={H - pad} stroke="#26272E" />
          <line x1={pad} x2={W - pad} y1={H / 2} y2={H / 2} stroke="#26272E" />
          {points.map((p, i) => {
            const isActive = i === active
            return (
              <circle
                key={p[0]}
                cx={x(p[1])}
                cy={y(p[2])}
                r={isActive ? 8 : 4.2}
                fill={CLUSTER_COLORS[p[3] % CLUSTER_COLORS.length]}
                fillOpacity={isActive ? 1 : 0.72}
                stroke={isActive ? '#F5F5F7' : 'none'}
                strokeWidth={2}
                className="cursor-pointer"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onClick={() => {
                  window.location.hash = productHref(p[0])
                }}
              >
                <title>{data.products[data.indexById.get(p[0])!].name}</title>
              </circle>
            )
          })}
        </svg>
        {activeProduct && activePoint && (
          <div
            className="pointer-events-none absolute z-10 max-w-56 -translate-x-1/2 rounded-xl border border-line bg-bg/90 px-3 py-2 text-sm shadow-xl backdrop-blur"
            style={{ left: `clamp(80px, ${tipLeft}%, calc(100% - 80px))`, top: `calc(${tipTop}% + 14px)` }}
            aria-live="polite"
          >
            <p className="font-semibold">{activeProduct.name}</p>
            <p className="text-xs text-ink-2">{rig.clusters[activeProduct.cluster].name}. Enter atau klik untuk detail.</p>
          </div>
        )}
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Kelompok karakter">
        {rig.clusters.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span className="size-3 rounded-full" style={{ background: CLUSTER_COLORS[c.id % CLUSTER_COLORS.length] }} aria-hidden="true" />
            {c.name} <span className="num text-ink-2">({c.size})</span>
          </li>
        ))}
      </ul>

      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">Lihat sebagai tabel</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="num w-full min-w-[640px] border-collapse text-left">
            <caption className="mb-2 text-left text-ink-2">
              Rata-rata tiap kelompok, dB relatif ke target rig. Silhouette {rig.silhouette.toFixed(3).replace('.', ',')}.
            </caption>
            <thead>
              <tr className="border-b border-line text-ink-2">
                <th className="py-2 pr-3 font-medium">Kelompok</th>
                <th className="py-2 pr-3 font-medium">Model</th>
                {data.meta.bands.map((b) => (
                  <th key={b.key} className="py-2 pr-3 font-medium">
                    {b.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rig.clusters.map((c) => (
                <tr key={c.id} className="border-b border-line/60">
                  <th className="py-2 pr-3 font-medium">{c.name}</th>
                  <td className="py-2 pr-3">{c.size}</td>
                  {data.meta.bands.map((b) => (
                    <td key={b.key} className="py-2 pr-3">
                      {c.bands[b.key].toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
