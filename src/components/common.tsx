import { useEffect, useState, type ReactNode } from 'react'
import { loadCurves, type DecodedCurves } from '../lib/data'
import type { CoreData, Product } from '../lib/types'

export function useCurves(rig: string | null | undefined) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ rig: string; attempt: number; curves: DecodedCurves | null; failed: boolean } | null>(null)
  useEffect(() => {
    let alive = true
    if (!rig) return
    loadCurves(rig).then(
      (curves) => { if (alive) setState({ rig, attempt, curves, failed: false }) },
      () => { if (alive) setState({ rig, attempt, curves: null, failed: true }) },
    )
    return () => {
      alive = false
    }
  }, [rig, attempt])
  const current = state && state.rig === rig && state.attempt === attempt ? state : null
  return { curves: current?.curves ?? null, failed: current?.failed ?? false, loading: Boolean(rig && !current), retry: () => setAttempt((n) => n + 1) }
}

export function CurveStatus({ loading, failed, retry }: ReturnType<typeof useCurves>) {
  if (failed) return (
    <div role="alert" className="my-4 rounded-xl border border-line p-4 text-sm">
      <p>Kurva belum bisa dimuat. Periksa koneksi lalu coba lagi.</p>
      <button type="button" onClick={retry} className="btn-ghost mt-3 min-h-11">Coba lagi</button>
    </div>
  )
  return loading ? <p role="status" className="my-4 text-sm text-ink-2">Memuat kurva…</p> : null
}

export function curveOf(curves: DecodedCurves, p: Product): number[] | null {
  const row = curves.rowById.get(p.id)
  return row === undefined ? null : curves.raw[row]
}

export function SectionHead({ index, id, title, children }: { index: string; id: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 max-w-3xl md:mb-12">
      <p className="eyebrow mb-3">
        <span className="num text-teal">{index}</span> <span aria-hidden="true">/</span> {title}
      </p>
      <h2 id={id} className="display text-[34px] md:text-[56px]">
        {children}
      </h2>
    </div>
  )
}

export function rigLabel(data: CoreData, rigId: string): string {
  const r = data.meta.rigs.find((x) => x.id === rigId)
  return r ? `${r.source} (${r.rig}, ${r.formLabel.toLowerCase()})` : rigId
}

export function formatRp(n: number): string {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function ScoreBadge({ score, label = 'mirip' }: { score: number; label?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="num display text-4xl">{score}</span>
      <span className="text-sm text-ink-2">/100 {label}</span>
    </div>
  )
}
