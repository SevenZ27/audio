import { useEffect, useMemo, useRef, useState } from 'react'
import { CurveChart, formatDb } from '../components/CurveChart'
import { SearchBox } from '../components/SearchBox'
import { curveOf, rigLabel, SectionHead, CurveStatus, useCurves } from '../components/common'
import { productHref } from '../lib/router'
import { diffSentence } from '../lib/curve'
import type { Jam } from '../lib/audio'
import { eqGains, loudnessPreamp, OCTAVE_HZ } from '../lib/eq'
import type { CoreData } from '../lib/types'

export interface Pair {
  a: number
  b: number
}

interface Props {
  data: CoreData
  active: boolean
  onBack?: () => void
  pair: Pair | null
  onPair: (p: Pair) => void
}

const hzLabel = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`)

export function ListenDiff({ data, pair, onPair, active, onBack }: Props) {
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
  const curveState = useCurves(A.rig)
  const { curves } = curveState
  const [mode, setMode] = useState<'A' | 'B'>('A')
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.3)
  const [starting, setStarting] = useState(false)
  const generation = useRef(0)
  const busy = useRef(false)
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
    if (!j) return
    if (!gains) {
      j.stop()
      setPlaying(false)
      setApplied([])
      return
    }
    if (mode === 'B') j.setEq(gains, preamp)
    else j.setEq(OCTAVE_HZ.map(() => 0), 0)
    setApplied(j.appliedGains())
  }, [mode, gains, preamp, playing])

  const stop = () => {
    generation.current++
    busy.current = false
    jam.current?.stop()
    setStarting(false)
    setPlaying(false)
  }

  useEffect(() => {
    stop()
    setMode('A')
    setError(null)
    if (!active) { jam.current?.close(); jam.current = null }
  }, [a, b, active])

  useEffect(() => {
    const pause = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', pause)
    window.addEventListener('pagehide', stop)
    return () => {
      generation.current++
      jam.current?.close()
      document.removeEventListener('visibilitychange', pause)
      window.removeEventListener('pagehide', stop)
    }
  }, [])

  const toggle = async () => {
    if (busy.current || playing) { stop(); return }
    if (!active || !gains) return
    busy.current = true
    setStarting(true)
    setError(null)
    const token = ++generation.current
    try {
      if (!jam.current) {
        const { Jam } = await import('../lib/audio')
        if (generation.current !== token) return
        const j = new Jam()
        jam.current = j
        j.ctx.addEventListener('statechange', () => {
          if (jam.current === j && j.ctx.state !== 'running') stop()
        })
      }
      const j = jam.current
      j.setVolume(volume)
      j.setEq(mode === 'B' ? gains : OCTAVE_HZ.map(() => 0), mode === 'B' ? preamp : 0)
      const started = await j.start()
      if (generation.current !== token) return
      setApplied(j.appliedGains())
      setPlaying(started)
    } catch {
      if (generation.current !== token) return
      jam.current?.close()
      jam.current = null
      setError('Audio belum bisa diputar. Coba lagi, atau gunakan browser yang mendukung Web Audio.')
    } finally {
      if (generation.current === token) { busy.current = false; setStarting(false) }
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

        {onBack && <button type="button" className="btn-ghost mb-6 min-h-11" onClick={() => { stop(); onBack() }}>Kembali ke hasil sebelumnya</button>}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div className="grid content-start gap-5">
            <div className="card p-4">
              <p className="text-xs text-ink-2">A (patokan)</p>
              <p className="font-semibold" data-testid="compare-a">{A.name}</p>
              <a className="inline-block py-2 text-sm text-teal" href={productHref(A.id)}>Detail produk A</a>
              <div className="mt-3">
                <SearchBox products={products} rigs={meta.rigs} label="Ganti A" placeholder="Cari produk A" onPick={(i) => onPair({ a: i, b: neighbors[i][0][0] })} />
              </div>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-2">B (yang disimulasikan)</p>
              <p className="font-semibold" data-testid="compare-b">{B.name}</p>
              <a className="inline-block py-2 text-sm text-teal" href={productHref(B.id)}>Detail produk B</a>
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
            <button type="button" className="btn-ghost min-h-11" onClick={() => onPair({ a: b, b: a })}>Tukar A dan B</button>
            <p className="text-xs text-ink-2">Keduanya diukur di {rigLabel(data, A.rig)}.</p>
          </div>

          <div className="card min-w-0 p-5 md:p-7" data-testid="listen" data-playing={playing} data-mode={mode} data-starting={starting} data-preamp={preamp} data-applied={applied.join(',')} data-expected={gains?.join(',') ?? ''}>
            <CurveStatus {...curveState} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary min-w-32" onClick={toggle} disabled={!gains && !playing} aria-pressed={playing}>
                {starting ? 'Batalkan' : playing ? 'Stop' : 'Putar musik'}
              </button>
              <div role="group" aria-label="Pilih suara" className="inline-flex rounded-full border border-line p-1">
                {(['A', 'B'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    disabled={starting}
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
                  disabled={starting}
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
              {starting ? 'Menyiapkan audio…' : `${playing ? 'Memutar' : 'Siap diputar'}: ${mode === 'A' ? 'A, musik tanpa EQ pembanding.' : `B, ilustrasi selisih kurva terhadap ${B.name}.`}`}
            </p>

            {curves && curveOf(curves, A) && curveOf(curves, B) && (
              <div className="mt-6">
                <CurveChart grid={meta.grid} title="Perbandingan kurva A dan B" series={[
                  { label: `A: ${A.name}`, values: curveOf(curves, A)!, kind: 'main' },
                  { label: `B: ${B.name}`, values: curveOf(curves, B)!, kind: 'compare' },
                ]} />
                <p className="mt-2 text-sm text-ink-2">{a === b ? 'A dan B adalah pengukuran yang sama; tidak ada selisih EQ.' : diffSentence(meta.grid, curveOf(curves, A)!, curveOf(curves, B)!)}</p>
              </div>
            )}
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
                    <td className="py-1">Preamp (perkiraan kompensasi level)</td>
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
              peaking di tiap oktaf (31,5 Hz sampai 16 kHz), dibatasi ±12 dB, dengan perkiraan kompensasi level. Ini bukan penyamaan loudness yang terukur dan tidak mereproduksi bunyi headphone secara utuh. Musiknya dibuat langsung di browser, jadi aman soal hak cipta.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
