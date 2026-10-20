import { useEffect, useRef, useState } from 'react'
import { loadCore } from './lib/data'
import { useRoute } from './lib/router'
import type { CoreData } from './lib/types'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { ListenDiff, type Pair } from './sections/ListenDiff'
import { ProductPage } from './sections/ProductPage'
import { Quiz } from './sections/Quiz'
import { SoundMap } from './sections/SoundMap'
import { Twins } from './sections/Twins'

const NAV = [
  ['#kembaran', 'Kembaran'],
  ['#kuis', 'Kuis'],
  ['#peta', 'Peta'],
  ['#dengar', 'Dengar'],
  ['#data', 'Data'],
]

export default function App() {
  const route = useRoute()
  const [data, setData] = useState<CoreData | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [pair, setPair] = useState<Pair | null>(null)

  useEffect(() => {
    let alive = true
    setFailed(false)
    loadCore()
      .then((d) => {
        if (!alive) return
        setData(d)
        const start = d.products.findIndex((p) => p.name === 'Apple Airpods Pro 2')
        setSelected(start >= 0 ? start : 0)
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [attempt])

  type ReturnPoint = { hash: string; y: number; element: HTMLElement | null }
  const homeReturn = useRef<ReturnPoint | null>(null)
  const comparisonReturn = useRef<ReturnPoint | null>(null)
  const pendingReturn = useRef<ReturnPoint | null>(null)
  const lastClick = useRef<HTMLElement | null>(null)
  const previousPage = useRef(route.page)
  const capture = () => ({ hash: window.location.hash || '#kembaran', y: window.scrollY, element: lastClick.current })
  const restore = (point: ReturnPoint) => requestAnimationFrame(() => {
    window.scrollTo({ top: point.y, behavior: 'instant' })
    if (point.element?.isConnected) point.element.focus({ preventScroll: true })
  })
  const goBack = (point: ReturnPoint | null) => {
    if (!point) { window.location.hash = '#kembaran'; return }
    if (window.location.hash === point.hash) restore(point)
    else { pendingReturn.current = point; window.location.hash = point.hash }
  }

  // Preserve local section state and restore the initiating control/scroll position.
  useEffect(() => {
    const point = pendingReturn.current ?? (previousPage.current === 'product' && route.page === 'home' && homeReturn.current?.hash === window.location.hash ? homeReturn.current : null)
    pendingReturn.current = null
    if (point) restore(point)
    else if (route.page === 'home' && route.section && data) {
      requestAnimationFrame(() => document.getElementById(route.section!)?.scrollIntoView())
    }
    previousPage.current = route.page
  }, [route, data])

  const listen = (p: Pair) => {
    comparisonReturn.current = capture()
    setPair(p)
    window.location.hash = '#dengar'
  }

  return (
    <div onKeyDownCapture={(event) => {
      if (route.page === 'home' && event.key === 'Enter') {
        lastClick.current = event.target as HTMLElement
        homeReturn.current = capture()
      }
    }} onClickCapture={(event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('a,button')
      lastClick.current = target
      if (route.page === 'home') {
        homeReturn.current = capture()
      }
    }}>
      <a onClick={(event) => { event.preventDefault(); const content = document.getElementById(route.page === 'product' ? 'product-content' : 'konten'); content?.focus({ preventScroll: true }); content?.scrollIntoView() }} href={route.page === 'product' ? '#product-content' : '#konten'} className="fixed top-3 left-3 z-50 -translate-y-20 rounded-full bg-ink px-4 py-2 text-bg focus:translate-y-0">
        Lompat ke konten
      </a>
      <nav aria-label="Utama" className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight" aria-label="AudioMatch, ke atas">
            <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
              <defs>
                <linearGradient id="navg" x1="0" x2="1">
                  <stop offset="0" stopColor="#2DD4BF" />
                  <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <path d="M6 40 C16 40 18 18 27 18 S35 46 43 38 S53 24 58 24" fill="none" stroke="url(#navg)" strokeWidth="7" strokeLinecap="round" />
            </svg>
            AudioMatch
          </a>
          <ul className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <a href={href} className="block rounded-full px-3 py-2 text-ink-2 hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {route.page === 'product' && data && (
        <div id="product-content" tabIndex={-1}>
          <ProductPage data={data} id={route.id} onListen={listen} onBack={() => goBack(homeReturn.current)} />
        </div>
      )}
        <div hidden={route.page === 'product' && Boolean(data)}>
          <Hero measurements={data?.meta.totals.measurements ?? null} />
          <main id="konten" tabIndex={-1}>
            {failed && (
              <div role="alert" className="mx-auto max-w-6xl px-5 py-10">
                <p>Data belum bisa dimuat. Periksa koneksi lalu coba lagi.</p>
                <button type="button" className="btn-ghost mt-3 min-h-11" onClick={() => setAttempt((n) => n + 1)}>Muat ulang data</button>
              </div>
            )}
            {data ? (
              <>
                <Twins data={data} selected={selected} onSelect={setSelected} onListen={listen} />
                <Quiz data={data} />
                <SoundMap data={data} />
                <ListenDiff data={data} pair={pair} onPair={setPair} active={route.page === 'home'} onBack={comparisonReturn.current ? () => goBack(comparisonReturn.current) : undefined} />
                <HowItWorks data={data} />
              </>
            ) : (
              !failed && <div className="mx-auto h-96 max-w-6xl px-5" aria-busy="true" aria-label="Memuat data" />
            )}
          </main>
        </div>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-sm text-ink-2 sm:px-8 md:flex-row md:justify-between">
          <p>
            Data pengukuran:{' '}
            <a href="https://github.com/jaakkopasanen/AutoEq" className="text-ink underline underline-offset-4" target="_blank" rel="noreferrer">
              AutoEq
            </a>{' '}
            (MIT) dan para pengukurnya. Harga tidak ditampilkan tanpa sumber yang bisa dicek.
          </p>
          <p>Tanpa cookie, tanpa analytics.</p>
        </div>
      </footer>
    </div>
  )
}
