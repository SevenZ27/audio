import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDb } from '../components/CurveChart'
import { SearchBox } from '../components/SearchBox'
import { curveOf, rigLabel, SectionHead, useCurves } from '../components/common'
import type { Jam } from '../lib/audio'
import { eqGains, loudnessPreamp, OCTAVE_HZ } from '../lib/eq'
import type { CoreData } from '../lib/types'

export interface Pair {
  a: number
  b: number
}

interface Props {
  data: CoreData
  pair: Pair | null
  onPair: (p: Pair) => void
}

const hzLabel = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`)

export function ListenDiff({ data, pair, onPair }: Props) {
  const { products, neighbors, meta } = data
  const fallback = useMemo<Pair>(() => {
    const a = Math.max(
      0,
      products.findIndex((p) => p.name === 'Apple Airpods Pro 2'),
    )
    return { a, b: neighbors[a][0][0] }
  }, [products, neighbors])
  const { a, b } = pair ?? fallback
  const A = products[a]
  const B = products[b]
  const curves = useCurves(A.rig)
  const [mode, setMode] = useState<'A' | 'B'>('A')
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [applied, setApplied] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const jam = useRef<Jam | null>(null)

  const gains = useMemo(() => {
    if (!curves) return null
    const ca = curveOf(curves, A)
    const cb = curveOf(curves, B)
    return ca && cb ? eqGains(meta.grid, ca, cb) : null
  }, [curves, A, B, meta.grid])
  const preamp = gains ? loudnessPreamp(gains) : 0

  useEffect(() => {
    const j = jam.current
    if (!j || !gains) return
    if (mode === 'B') j.setEq(gains, preamp)
    else j.setEq(OCTAVE_HZ.map(() => 0), 0)
    setApplied(j.appliedGains())
  }, [mode, gains, preamp, playing])

  useEffect(() => () => jam.current?.close(), [])

  const toggle = async () => {
    setError(null)
    try {
      if (!jam.current) {
        const { Jam } = await import('../lib/audio')
        jam.current = new Jam()
        jam.current.setVolume(volume)
      }
      if (jam.current.running) {
        jam.current.stop()
        setPlaying(false)
      } else {
        await jam.current.start()
        setPlaying(true)
      }
    } catch (e) {
      setError(`Audio tidak bisa jalan di browser ini (${(e as Error).message}).`)
    }
  }

  const W = 640
  const H = 200
  const bw = W / OCTAVE_HZ.length
  const barMax = Math.max(6, ...(gains ?? [0]).map(Math.abs))

  return (
    <section aria-labelledby="dengar-title" id="dengar" className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
        <SectionHead index="04" id="dengar-title" title="Dengar Bedanya">
          Bandingkan dua produk <span className="text-ink-2">lewat simulasi EQ di browser.</span>
        </SectionHead>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div className="grid content-start gap-5">
            <div className="card p-4">
              <p className="text-xs text-ink-2">A (patokan)</p>
              <p className="font-semibold">{A.name}</p>
              <div className="mt-3">
                <SearchBox products={products} rigs={meta.rigs} label="Ganti A" placeholder="Cari produk A" onPick={(i) => onPair({ a: i, b: neighbors[i][0][0] })} />
              </div>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-2">B (yang disimulasikan)</p>
              <p className="font-semibold">{B.name}</p>
              <div className="mt-3">
                <SearchBox
                  products={products}
                  rigs={meta.rigs}
                  rig={A.rig}
                  label="Ganti B (rig yang sama dengan A)"
                  placeholder="Cari produk B"
                  onPick={(i) => onPair({ a, b: i })}
                />
              </div>
            </div>
            <p className="text-xs text-ink-2">Keduanya diukur di {rigLabel(data, A.rig)}.</p>
          </div>

          <div className="card p-5 md:p-7" data-testid="listen" data-playing={playing} data-mode={mode} data-applied={applied.join(',')} data-expected={gains?.join(',') ?? ''}>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary min-w-32" onClick={toggle} aria-pressed={playing}>
                {playing ? 'Stop' : 'Putar musik'}
              </button>
              <div role="group" aria-label="Pilih suara" className="inline-flex rounded-full border border-line p-1">
                {(['A', 'B'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={`min-h-10 min-w-14 rounded-full px-4 text-sm font-semibold transition-colors ${
                      mode === m ? 'bg-ink text-bg' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <label className="ml-auto flex items-center gap-2 text-sm text-ink-2">
                Volume
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setVolume(v)
                    jam.current?.setVolume(v)
                  }}
                  className="w-24 accent-teal"
                />
              </label>
            </div>

            <p className="mt-4 text-sm text-ink" aria-live="polite">
              {mode === 'A'
                ? `Sekarang: A, musik apa adanya.`
                : `Sekarang: B, musik dibentuk ulang supaya headphone A kedengaran seperti ${B.name}.`}
            </p>

            <svg viewBox={`0 0 ${W} ${H + 26}`} className="mt-5 block h-auto w-full" role="img" aria-label="Gain tiap filter oktaf untuk mode B">
              <text x={4} y={14} fontSize="11" fill="#A1A1A6" className="num">
                +{Math.round(barMax)} dB
              </text>
              <text x={4} y={H - 4} fontSize="11" fill="#A1A1A6" className="num">
                -{Math.round(barMax)} dB
              </text>
              <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#26272E" />
              {OCTAVE_HZ.map((f, i) => {
                const g = gains?.[i] ?? 0
                const h = (Math.abs(g) / barMax) * (H / 2 - 6)
                const on = mode === 'B'
                return (
                  <g key={f}>
                    <rect
                      x={i * bw + bw * 0.22}
                      width={bw * 0.56}
                      y={g >= 0 ? H / 2 - h : H / 2}
                      height={Math.max(1, h)}
                      rx={4}
                      fill={g >= 0 ? '#2DD4BF' : '#8B5CF6'}
                      opacity={on ? 0.95 : 0.35}
                    />
                    <text x={i * bw + bw / 2} y={H + 18} textAnchor="middle" fontSize="12" fill="#A1A1A6" className="num">
                      {hzLabel(f)}
                    </text>
                  </g>
                )
              })}
            </svg>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-ink-2 hover:text-ink">Angka tiap filter</summary>
              <table className="num mt-2 w-full text-left">
                <caption className="sr-only">Gain filter peaking per frekuensi oktaf</caption>
                <thead>
                  <tr className="text-ink-2">
                    <th className="py-1 font-medium">Frekuensi</th>
                    <th className="py-1 font-medium">Gain di mode B</th>
                  </tr>
                </thead>
                <tbody>
                  {OCTAVE_HZ.map((f, i) => (
                    <tr key={f} className="border-t border-line/60">
                      <td className="py-1">{hzLabel(f)} Hz</td>
                      <td className="py-1">{gains ? formatDb(gains[i]) : '-'}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-line/60">
                    <td className="py-1">Preamp (loudness disamakan)</td>
                    <td className="py-1">{formatDb(preamp)}</td>
                  </tr>
                </tbody>
              </table>
            </details>

            {error && (
              <p className="mt-3 text-sm text-[#F5C06B]" role="alert">
                {error}
              </p>
            )}
            <p className="mt-5 rounded-2xl border border-line bg-bg/50 p-4 text-sm leading-relaxed text-ink-2">
              Simulasi kasar, tetap diwarnai headphone yang lagi kamu pakai. Selisih kurva B dikurangi A diubah jadi 10 filter
              peaking di tiap oktaf (31,5 Hz sampai 16 kHz), dibatasi ±12 dB, lalu volume B diturunkan atau dinaikkan supaya
              kerasnya kira-kira sama dengan A. Musiknya dibuat langsung di browser, jadi aman soal hak cipta.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
