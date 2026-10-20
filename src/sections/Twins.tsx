import { CurveChart } from '../components/CurveChart'
import { SearchBox } from '../components/SearchBox'
import { curveOf, rigLabel, ScoreBadge, SectionHead, CurveStatus, useCurves } from '../components/common'
import { diffSentence } from '../lib/curve'
import { productHref } from '../lib/router'
import type { CoreData } from '../lib/types'

const SUGGEST = ['Apple Airpods Pro 2', 'Apple AirPods Pro', 'Sony WH-1000XM4', 'Sennheiser HD 600', 'Apple AirPods Max']

interface Props {
  data: CoreData
  selected: number | null
  onSelect: (index: number) => void
}

export function Twins({ data, selected, onSelect }: Props) {
  const { products, neighbors, meta } = data
  const product = selected !== null ? products[selected] : null
  const curveState = useCurves(product?.rig)
  const { curves } = curveState
  const chips = SUGGEST.map((n) => products.findIndex((p) => p.name.toLowerCase() === n.toLowerCase())).filter((i) => i >= 0)

  const twins = selected !== null ? neighbors[selected].slice(0, 5) : []
  const base = product && curves ? curveOf(curves, product) : null

  return (
    <section aria-labelledby="kembaran-title" id="kembaran" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
      <SectionHead index="01" id="kembaran-title" title="Kembaran Suara">
        Ketik headphone yang kamu suka. <span className="text-ink-2">Kami carikan lima yang paling mirip.</span>
      </SectionHead>

      <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_1fr] md:items-end">
        <SearchBox
          products={products}
          rigs={meta.rigs}
          label="Nama headphone atau earphone"
          placeholder="Contoh: airpods, wh-1000xm4, hd 600"
          onPick={onSelect}
          inputId="cari-kembaran"
        />
        <div className="flex flex-wrap gap-2" aria-label="Contoh cepat">
          {chips.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                selected === i ? 'border-teal text-ink' : 'border-line text-ink-2 hover:text-ink'
              }`}
            >
              {products[i].name}
            </button>
          ))}
        </div>
      </div>

      {product && (
        <div className="mt-10" aria-live="polite">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
            <div>
              <p className="text-sm text-ink-2">Kembaran untuk</p>
              <h3 className="display text-2xl md:text-3xl">{product.name}</h3>
              <p className="mt-1 text-sm text-ink-2">
                Dibandingkan hanya dengan hasil ukur dari rig yang sama: {rigLabel(data, product.rig)}
              </p>
            </div>
            <a className="btn-ghost min-h-11 text-sm" href={productHref(product.id)}>
              Buka detail produk
            </a>
          </div>

          <CurveStatus {...curveState} />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {twins.map(([idx, score, dist], n) => {
              const twin = products[idx]
              const tc = curves ? curveOf(curves, twin) : null
              return (
                <li key={twin.id} className="card rise flex flex-col p-5" style={{ animationDelay: `${n * 70}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <ScoreBadge score={score} />
                    <span className="num rounded-full border border-line px-2.5 py-1 text-xs text-ink-2">#{n + 1}</span>
                  </div>
                  <h4 className="mt-3 text-lg leading-snug font-semibold">{twin.name}</h4>
                  <div className="mt-3 rounded-2xl bg-bg/60 p-2">
                    {base && tc && curves ? (
                      <CurveChart
                        compact
                        height={150}
                        grid={meta.grid}
                        title={`Kurva ${product.name} dan ${twin.name}`}
                        series={[
                          { label: twin.name, values: tc, kind: 'compare' },
                          { label: product.name, values: base, kind: 'main' },
                        ]}
                      />
                    ) : (
                      <div className="h-[118px] animate-pulse rounded-xl bg-surface-2" />
                    )}
                  </div>
                  <p className="mt-3 text-[0.95rem] text-ink">
                    {base && tc ? diffSentence(meta.grid, base, tc) : ' '}
                  </p>
                  <p className="num mt-1 text-xs text-ink-2">Selisih rata-rata {dist.toFixed(1)} dB (20 Hz sampai 10 kHz)</p>
                  <a href={productHref(twin.id)} className="mt-4 text-sm font-medium text-teal underline-offset-4 hover:underline">
                    Lihat {twin.name}
                  </a>
                </li>
              )
            })}
          </ol>
          <p className="mt-5 text-sm text-ink-2">
            Garis berwarna: {product.name}. Garis abu: kembarannya. Kalimat di tiap kartu membandingkan kembaran terhadap{' '}
            {product.name}.
          </p>
        </div>
      )}
    </section>
  )
}
