import { useMemo, useState } from 'react'
import { CurveChart, formatDb } from '../components/CurveChart'
import { formatRp, rigLabel, SectionHead, useCurves } from '../components/common'
import { productHref } from '../lib/router'
import { BASS_RANGE, QUIZ, rankByTaste, tasteFromAnswers, tasteOffset, TREBLE_RANGE } from '../lib/taste'
import type { CoreData } from '../lib/types'

export function Quiz({ data }: { data: CoreData }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null))
  const [step, setStep] = useState(0)
  const [budget, setBudget] = useState<number | null>(null)
  const done = step >= QUIZ.length
  const taste = useMemo(() => tasteFromAnswers(answers.map((a) => a ?? -1)), [answers])
  const rig = data.meta.rigs.find((r) => r.form === taste.form && r.role === 'default')!
  const curves = useCurves(done ? rig.id : null)
  const priceById = useMemo(() => new Map(data.prices.map((p) => [p.id, p])), [data.prices])

  const recs = useMemo(() => {
    if (!done || !curves) return []
    const all = rankByTaste(
      {
        grid: data.meta.grid,
        target: curves.target,
        raw: curves.raw,
        ids: curves.ids,
        products: data.products,
        indexById: data.indexById,
        clipDb: data.meta.clipDb,
        simMaxHz: data.meta.simMaxHz,
        scoreZeroDb: data.meta.scoreZeroDb,
      },
      taste,
      budget ? 1000 : 5,
    )
    if (!budget) return all
    return all.filter((r) => (priceById.get(data.products[r.index].id)?.hargaRp ?? Infinity) <= budget).slice(0, 5)
  }, [done, curves, data, taste, budget, priceById])

  const q = QUIZ[Math.min(step, QUIZ.length - 1)]
  const current = answers[step] ?? null

  const choose = (opt: number) => setAnswers((a) => a.map((v, i) => (i === step ? opt : v)))

  const restart = () => {
    setAnswers(QUIZ.map(() => null))
    setStep(0)
  }

  const offset = done ? tasteOffset(data.meta.grid, taste) : null
  const tasteCurve = curves && offset ? curves.target.map((t, i) => t + offset[i]) : null

  return (
    <section aria-labelledby="kuis-title" id="kuis" className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28">
        <SectionHead index="02" id="kuis-title" title="Kuis Selera">
          Belum tau mau yang mana? <span className="text-ink-2">Lima pertanyaan, jadi satu kurva selera.</span>
        </SectionHead>

        {!done ? (
          <form
            className="card max-w-2xl p-5 md:p-8"
            onSubmit={(e) => {
              e.preventDefault()
              if (current !== null) setStep((s) => s + 1)
            }}
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="num text-sm text-ink-2">
                {step + 1}/{QUIZ.length}
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal to-violet transition-[width] duration-500"
                  style={{ width: `${((step + (current !== null ? 1 : 0)) / QUIZ.length) * 100}%` }}
                />
              </div>
            </div>
            <fieldset key={q.id}>
              <legend className="mb-4 text-xl font-semibold md:text-2xl">{q.title}</legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {q.options.map((o, i) => {
                  const checked = current === i
                  return (
                    <label
                      key={o.label}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal ${
                        checked ? 'border-teal bg-teal/10' : 'border-line hover:border-ink-2'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        className="sr-only"
                        checked={checked}
                        onChange={() => choose(i)}
                      />
                      <span
                        aria-hidden="true"
                        className={`grid size-5 shrink-0 place-items-center rounded-full border ${checked ? 'border-teal' : 'border-ink-2'}`}
                      >
                        {checked && <span className="size-2.5 rounded-full bg-teal" />}
                      </span>
                      <span className="flex flex-col">
                        <span>{o.label}</span>
                        {o.hint && <span className="text-xs text-ink-2">{o.hint}</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="mt-6 flex justify-between gap-3">
              <button
                type="button"
                className="btn-ghost min-h-11"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                aria-disabled={step === 0}
                style={{ opacity: step === 0 ? 0.4 : 1 }}
              >
                Kembali
              </button>
              <button type="submit" className="btn-primary min-h-11" disabled={current === null} style={{ opacity: current === null ? 0.5 : 1 }}>
                {step === QUIZ.length - 1 ? 'Lihat hasil' : 'Lanjut'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]" aria-live="polite">
            <div className="card p-5 md:p-7">
              <h3 className="text-xl font-semibold">Kurva selera kamu</h3>
              <p className="mt-1 text-sm text-ink-2">
                Target rig {rigLabel(data, rig.id)}, ditambah bass{' '}
                <span className="num text-ink">{formatDb(taste.bassDb)}</span> di bawah 150 Hz dan treble{' '}
                <span className="num text-ink">{formatDb(taste.trebleDb)}</span> di atas 3 kHz.
              </p>
              <div className="mt-4">
                {curves && tasteCurve ? (
                  <CurveChart
                    grid={data.meta.grid}
                    title="Kurva selera dibanding target rig"
                    series={[
                      { label: 'Target rig', values: curves.target, kind: 'target' },
                      { label: 'Selera kamu', values: tasteCurve, kind: 'main' },
                    ]}
                    height={240}
                  />
                ) : (
                  <div className="h-60 animate-pulse rounded-xl bg-surface-2" />
                )}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-2">
                Jujur aja: angka geser tiap jawaban itu asumsi desain, belum hasil riset. Bass dibatasi{' '}
                <span className="num">
                  {BASS_RANGE[0]} sampai +{BASS_RANGE[1]} dB
                </span>
                , treble{' '}
                <span className="num">
                  {TREBLE_RANGE[0]} sampai +{TREBLE_RANGE[1]} dB
                </span>
                . Rencananya dicek lewat user test.
              </p>
            </div>

            <div>
              {data.meta.hasPrices && (
                <div className="mb-4">
                  <label htmlFor="budget" className="mb-2 block text-sm text-ink-2">
                    Budget maksimal
                  </label>
                  <select id="budget" className="field" value={budget ?? ''} onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Semua harga</option>
                    {[500000, 1000000, 2000000, 5000000].map((b) => (
                      <option key={b} value={b}>
                        {formatRp(b)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <h3 className="mb-3 text-xl font-semibold">Lima rekomendasi</h3>
              <ol className="grid gap-3" data-testid="quiz-results">
                {recs.map((r, n) => {
                  const p = data.products[r.index]
                  const price = priceById.get(p.id)
                  return (
                    <li key={p.id} className="card rise flex items-center gap-4 p-4" style={{ animationDelay: `${n * 60}ms` }}>
                      <span className="num display w-12 shrink-0 text-2xl">{r.score}</span>
                      <div className="min-w-0 flex-1">
                        <a href={productHref(p.id)} className="font-semibold underline-offset-4 hover:underline">
                          {p.name}
                        </a>
                        <p className="text-xs text-ink-2">
                          {data.meta.rigs.find((x) => x.id === p.rig)?.clusters[p.cluster]?.name}
                          {price ? ` · ${formatRp(price.hargaRp)}` : ''}
                        </p>
                      </div>
                    </li>
                  )
                })}
                {curves && recs.length === 0 && <li className="text-sm text-ink-2">Ga ada produk yang cocok di budget ini.</li>}
              </ol>
              <p className="mt-3 text-xs text-ink-2">Angka kiri: skor kecocokan 0 sampai 100 terhadap kurva selera kamu.</p>
              <button type="button" className="btn-ghost mt-5 min-h-11" onClick={restart}>
                Ulangi kuis
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
