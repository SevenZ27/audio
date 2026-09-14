import { scaleLinear, scaleLog } from 'd3-scale'
import { line, curveMonotoneX } from 'd3-shape'
import { useId, useMemo, useRef, useState } from 'react'

export interface Series {
  label: string
  values: number[]
  kind: 'main' | 'compare' | 'target' | 'soft'
}

interface Props {
  grid: number[]
  series: Series[]
  height?: number
  title: string
  compact?: boolean
  /** shade the region the similarity ignores */
  shadeAboveHz?: number
}

const TICKS = [20, 100, 1000, 10000, 20000]
const tickLabel = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`)

export function CurveChart({ grid, series, height = 260, title, compact = false, shadeAboveHz }: Props) {
  const width = 640
  const m = compact ? { t: 8, r: 8, b: 8, l: 8 } : { t: 16, r: 14, b: 30, l: 40 }
  const gid = useId().replace(/:/g, '')
  const [cursor, setCursor] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { x, y, paths, yTicks } = useMemo(() => {
    // compact cards only look at the range used for similarity, so the roll-off above 10 kHz does not flatten the rest
    const inRange = (i: number) => !compact || grid[i] <= 10000
    const all = series.flatMap((s) => s.values.filter((_, i) => inRange(i)))
    let lo = Math.min(...all)
    let hi = Math.max(...all)
    lo = compact ? Math.max(-15, lo - 1) : Math.max(-24, Math.floor((lo - 2) / 5) * 5)
    hi = compact ? Math.min(15, hi + 1) : Math.min(20, Math.ceil((hi + 2) / 5) * 5)
    const n = compact ? grid.filter((f) => f <= 10000).length : grid.length
    const x = scaleLog().domain([20, compact ? grid[n - 1] : 20000]).range([m.l, width - m.r])
    const y = scaleLinear().domain([lo, hi]).range([height - m.b, m.t])
    const gen = line<number>()
      .x((_, i) => x(grid[i]))
      .y((v) => y(Math.max(lo, Math.min(hi, v))))
      .curve(curveMonotoneX)
    return { x, y, paths: series.map((s) => gen(s.values.slice(0, n)) ?? ''), yTicks: y.ticks(compact ? 3 : 5) }
  }, [grid, series, height, compact, m.l, m.r, m.t, m.b])

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const f = x.invert(Math.max(m.l, Math.min(width - m.r, px)))
    let best = 0
    grid.forEach((g, i) => {
      if (Math.abs(Math.log(g / f)) < Math.abs(Math.log(grid[best] / f))) best = i
    })
    setCursor(best)
  }

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 8 : 1
    if (e.key === 'ArrowRight') setCursor((c) => Math.min(grid.length - 1, (c ?? -1) + step))
    else if (e.key === 'ArrowLeft') setCursor((c) => Math.max(0, (c ?? grid.length) - step))
    else if (e.key === 'Home') setCursor(0)
    else if (e.key === 'End') setCursor(grid.length - 1)
    else if (e.key === 'Escape') setCursor(null)
    else return
    e.preventDefault()
  }

  const readout =
    cursor !== null
      ? `${formatHz(grid[cursor])}: ` +
        series.map((s) => `${s.label} ${formatDb(s.values[cursor])}`).join(', ')
      : ''

  return (
    <figure className="relative m-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full touch-pan-y select-none"
        role={compact ? 'img' : 'application'}
        aria-label={`${title}. ${compact ? '' : 'Pakai panah kiri kanan untuk membaca nilai tiap frekuensi.'}`}
        aria-roledescription={compact ? undefined : 'grafik kurva frekuensi'}
        tabIndex={compact ? -1 : 0}
        onPointerMove={compact ? undefined : onMove}
        onPointerLeave={compact ? undefined : () => setCursor(null)}
        onKeyDown={compact ? undefined : onKey}
        onBlur={() => setCursor(null)}
      >
        <defs>
          <linearGradient id={`g${gid}`} x1="0" x2="1">
            <stop offset="0" stopColor="#2DD4BF" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        {shadeAboveHz && (
          <rect
            x={x(shadeAboveHz)}
            y={m.t}
            width={width - m.r - x(shadeAboveHz)}
            height={height - m.t - m.b}
            fill="rgb(245 245 247 / 0.035)"
          />
        )}
        {!compact &&
          yTicks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="#26272E" strokeWidth={t === 0 ? 1.2 : 0.7} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#A1A1A6" className="num">
                {t}
              </text>
            </g>
          ))}
        {!compact &&
          TICKS.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={m.t} y2={height - m.b} stroke="#26272E" strokeWidth={0.7} />
              <text x={x(t)} y={height - 10} textAnchor="middle" fontSize="11" fill="#A1A1A6" className="num">
                {tickLabel(t)}
              </text>
            </g>
          ))}
        {series.map((s, i) => (
          <path
            key={s.label + i}
            d={paths[i]}
            fill="none"
            pathLength={1}
            className={s.kind === 'main' ? 'draw' : undefined}
            stroke={
              s.kind === 'main' ? `url(#g${gid})` : s.kind === 'target' ? '#A1A1A6' : s.kind === 'soft' ? '#8B5CF6' : '#6E6E73'
            }
            strokeWidth={s.kind === 'main' ? (compact ? 2.6 : 2.4) : compact ? 1.8 : 1.6}
            strokeDasharray={s.kind === 'target' ? '0.012 0.01' : undefined}
            strokeLinecap="round"
            opacity={s.kind === 'soft' ? 0.7 : 1}
          />
        ))}
        {cursor !== null && !compact && (
          <g>
            <line x1={x(grid[cursor])} x2={x(grid[cursor])} y1={m.t} y2={height - m.b} stroke="#F5F5F7" strokeOpacity={0.4} />
            {series.map((s, i) => (
              <circle key={i} cx={x(grid[cursor])} cy={y(s.values[cursor])} r={3.5} fill={s.kind === 'main' ? '#2DD4BF' : '#A1A1A6'} />
            ))}
          </g>
        )}
      </svg>
      {!compact && (
        <>
          <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2" aria-hidden="true">
            {series.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-5 rounded"
                  style={{
                    background:
                      s.kind === 'main'
                        ? 'linear-gradient(90deg,#2DD4BF,#8B5CF6)'
                        : s.kind === 'target'
                          ? 'repeating-linear-gradient(90deg,#A1A1A6 0 4px,transparent 4px 7px)'
                          : s.kind === 'soft'
                            ? '#8B5CF6'
                            : '#6E6E73',
                  }}
                />
                {s.label}
              </span>
            ))}
          </div>
          <p className="num mt-1 min-h-5 text-xs text-ink" aria-live="polite">
            {readout}
          </p>
        </>
      )}
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  )
}

export function formatHz(f: number): string {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 1 : 2)} kHz` : `${Math.round(f)} Hz`
}

export function formatDb(v: number): string {
  const r = Math.round(v * 10) / 10
  return `${r > 0 ? '+' : r < 0 ? '-' : ''}${Math.abs(r).toFixed(1)} dB`
}
