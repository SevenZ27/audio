import { useEffect, useRef } from 'react'
import { CurveChart, formatDb } from '../components/CurveChart'
import { curveOf, formatRp, rigLabel, ScoreBadge, useCurves } from '../components/common'
import { productHref } from '../lib/router'
import type { CoreData } from '../lib/types'
import { CLUSTER_COLORS } from './SoundMap'
import type { Pair } from './ListenDiff'

interface Props {
  data: CoreData
  id: string
  onListen: (p: Pair) => void
}

export function ProductPage({ data, id, onListen }: Props) {
  const { products, neighbors, meta } = data
  const index = data.indexById.get(id)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    headingRef.current?.focus()
  }, [id])

  const product = index !== undefined ? products[index] : null
  const curves = useCurves(product?.rig)

  if (!product || index === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-5 pt-32 pb-24">
        <h1 className="display text-4xl" tabIndex={-1} ref={headingRef}>
          Produk tidak ditemukan
        </h1>
        <a href="#kembaran" className="btn-ghost mt-6">
          Kembali ke pencarian
        </a>
      </main>
    )
  }

  const rig = meta.rigs.find((r) => r.id === product.rig)!
  const cluster = rig.clusters[product.cluster]
  const variants = products.map((p, i) => ({ p, i })).filter((x) => x.p.rig === product.rig && x.p.base === product.base)
  const twins = neighbors[index].slice(0, 5)
  const raw = curves ? curveOf(curves, product) : null
  const price = data.prices.find((p) => p.id === product.id)

  return (
    <main className="mx-auto max-w-6xl px-5 pt-28 pb-24 sm:px-8">
      <a href="#kembaran" className="text-sm text-ink-2 hover:text-ink">
        ← Kembali
      </a>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow">{rig.formLabel}</p>
          <h1 ref={headingRef} tabIndex={-1} className="display mt-2 text-[40px] outline-none md:text-[64px]">
            {product.name}
          </h1>
          <p className="mt-3 text-ink-2">
            Diukur oleh{' '}
            {rig.sourceUrl ? (
              <a href={rig.sourceUrl} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
                {rig.source}
              </a>
            ) : (
              rig.source
            )}{' '}
            pakai rig {rig.rig}. Data diambil lewat AutoEq.
          </p>
          {variants.length > 1 && (
            <div className="mt-5 max-w-sm">
              <label htmlFor="variant" className="mb-2 block text-sm text-ink-2">
                Varian pengukuran
              </label>
              <select
                id="variant"
                className="field"
                value={product.id}
                onChange={(e) => {
                  window.location.hash = productHref(e.target.value)
                }}
              >
                {variants.map(({ p }) => (
                  <option key={p.id} value={p.id}>
                    {p.variant || 'Standar'}
                    {p.isDefault ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="card mt-8 p-4 md:p-6">
            <h2 className="mb-3 font-semibold">Kurva vs target rig</h2>
            {curves && raw ? (
              <CurveChart
                grid={meta.grid}
                title={`Kurva frekuensi ${product.name} dibanding target rig`}
                shadeAboveHz={meta.simMaxHz}
                series={[
                  { label: 'Target rig', values: curves.target, kind: 'target' },
                  { label: product.name, values: raw, kind: 'main' },
                ]}
              />
            ) : (
              <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
            )}
            <p className="mt-2 text-xs text-ink-2">Area agak terang di kanan (di atas 10 kHz) tidak dipakai untuk menghitung kemiripan.</p>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="card p-5">
            <p className="text-sm text-ink-2">Kelompok karakter</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold">
              <span className="size-3 rounded-full" style={{ background: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length] }} aria-hidden="true" />
              {cluster.name}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-ink-2">Skor preferensi (Harman, dari AutoEq)</p>
            {product.pref !== null ? (
              <ScoreBadge score={product.pref} label="skor" />
            ) : (
              <p className="mt-1 text-sm">Tidak tersedia. AutoEq cuma menghitung skor ini untuk rig tertentu, dan {rig.source} bukan salah satunya.</p>
            )}
          </div>
          {price && (
            <div className="card p-5">
              <p className="text-sm text-ink-2">Harga (dicek manual {price.tanggalCek})</p>
              <p className="num mt-1 text-2xl font-semibold">{formatRp(price.hargaRp)}</p>
              {price.url && (
                <a href={price.url} target="_blank" rel="noreferrer" className="text-sm text-teal">
                  {price.toko || 'Sumber harga'}
                </a>
              )}
            </div>
          )}
          <div className="card overflow-x-auto p-5">
            <table className="num w-full text-left text-sm">
              <caption className="mb-2 text-left text-ink-2">Selisih rata-rata terhadap target per band</caption>
              <tbody>
                {meta.bands.map((b) => (
                  <tr key={b.key} className="border-t border-line/60">
                    <th className="py-1.5 pr-3 font-normal text-ink-2">
                      {b.label} <span className="text-xs">{b.lo >= 1000 ? `${b.lo / 1000}k` : b.lo}-{b.hi >= 1000 ? `${b.hi / 1000}k` : b.hi}</span>
                    </th>
                    <td className="py-1.5 text-right">{formatDb(product.bands[b.key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      </div>

      <section aria-labelledby="twins-title" className="mt-14">
        <h2 id="twins-title" className="display text-3xl">
          Lima kembaran
        </h2>
        <p className="mt-1 text-sm text-ink-2">Dari rig yang sama: {rigLabel(data, product.rig)}.</p>
        <ol className="mt-5 grid gap-3 md:grid-cols-2">
          {twins.map(([j, score, dist]) => (
            <li key={products[j].id} className="card flex items-center gap-4 p-4">
              <span className="num display w-12 text-2xl">{score}</span>
              <div className="min-w-0 flex-1">
                <a href={productHref(products[j].id)} className="font-semibold underline-offset-4 hover:underline">
                  {products[j].name}
                </a>
                <p className="num text-xs text-ink-2">selisih {dist.toFixed(1)} dB</p>
              </div>
              <button
                type="button"
                className="btn-ghost min-h-10 px-3 text-sm"
                onClick={() => onListen({ a: index, b: j })}
                aria-label={`Dengar beda ${product.name} dan ${products[j].name}`}
              >
                Dengar
              </button>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
