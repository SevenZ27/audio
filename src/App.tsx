import { useEffect, useState } from 'react'
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
  const [selected, setSelected] = useState<number | null>(null)
  const [pair, setPair] = useState<Pair | null>(null)

  useEffect(() => {
    loadCore()
      .then((d) => {
        setData(d)
        const start = d.products.findIndex((p) => p.name === 'Apple Airpods Pro 2')
        setSelected(start >= 0 ? start : 0)
      })
      .catch(() => setFailed(true))
  }, [])

  // scroll to a section after coming back from a product page
  useEffect(() => {
    if (route.page === 'home' && route.section && data) {
      requestAnimationFrame(() => document.getElementById(route.section!)?.scrollIntoView())
    }
  }, [route, data])

  const listen = (p: Pair) => {
    setPair(p)
    window.location.hash = '#dengar'
  }

  return (
    <>
      <a href="#konten" className="fixed top-3 left-3 z-50 -translate-y-20 rounded-full bg-ink px-4 py-2 text-bg focus:translate-y-0">
        Lompat ke konten
      </a>
      <nav aria-label="Utama" className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="AudioMatch, ke atas">
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
          <ul className="flex items-center gap-0.5 overflow-x-auto text-sm">
            {NAV.map(([href, label], i) => (
              <li key={href} className={i > 2 ? 'hidden sm:block' : ''}>
                <a href={href} className="block rounded-full px-3 py-2 text-ink-2 hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {route.page === 'product' && data ? (
        <div id="konten">
          <ProductPage data={data} id={route.id} onListen={listen} />
        </div>
      ) : (
        <>
          <Hero models={data?.meta.totals.models ?? null} />
          <main id="konten">
            {failed && (
              <p role="alert" className="mx-auto max-w-6xl px-5 py-10 text-[#F5C06B]">
                Data gagal dimuat. Coba muat ulang halaman.
              </p>
            )}
            {data ? (
              <>
                <Twins data={data} selected={selected} onSelect={setSelected} />
                <Quiz data={data} />
                <SoundMap data={data} />
                <ListenDiff data={data} pair={pair} onPair={setPair} />
                <HowItWorks data={data} />
              </>
            ) : (
              !failed && <div className="mx-auto h-96 max-w-6xl px-5" aria-busy="true" aria-label="Memuat data" />
            )}
          </main>
        </>
      )}

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
    </>
  )
}
