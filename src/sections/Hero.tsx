import { useEffect, useState } from 'react'
import { loadManifest } from '../lib/data'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export function Hero({ models }: { models: number | null }) {
  const [hasVideo, setHasVideo] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    loadManifest().then((m) => setHasVideo(Boolean(m.hero)))
  }, [])

  const base = import.meta.env.BASE_URL
  const wide = typeof window !== 'undefined' && window.innerWidth >= 1100

  return (
    <header className="relative isolate flex min-h-[100svh] items-end overflow-hidden" aria-labelledby="hero-title">
      <div className="absolute inset-0 -z-10">
        {hasVideo ? (
          reduced ? (
            <img src={`${base}media/hero-poster.jpg`} alt="" className="h-full w-full object-cover" />
          ) : (
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={`${base}media/hero-poster.jpg`}
              src={`${base}media/${wide ? 'hero-1920.mp4' : 'hero-1080.mp4'}`}
              aria-hidden="true"
            />
          )
        ) : (
          <HeroPlaceholder />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg/70 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pt-28 pb-14 sm:px-8 md:pb-20">
        <p className="eyebrow rise mb-4">AudioMatch</p>
        <h1 id="hero-title" className="display rise max-w-4xl text-[min(56px,12.4vw)] md:text-[96px]" style={{ animationDelay: '80ms' }}>
          Suka suaranya?
          <br />
          <span className="grad-text">Cari kembarannya.</span>
        </h1>
        <p className="rise mt-5 max-w-xl text-lg text-ink-2 md:text-xl" style={{ animationDelay: '160ms' }}>
          Headphone dan earphone yang karakternya paling mirip sama yang kamu suka, dihitung dari data pengukuran
          {models ? <span className="num"> {models.toLocaleString('id-ID')} model</span> : null}, bukan dari iklan.
        </p>
        <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '240ms' }}>
          <a className="btn-primary" href="#kembaran">
            Cari yang mirip
          </a>
          <a className="btn-ghost" href="#kuis">
            Belum tau? Ikut kuis
          </a>
        </div>
      </div>
    </header>
  )
}

function HeroPlaceholder() {
  return (
    <div className="hero-glow grain absolute inset-0" data-testid="hero-placeholder">
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="rim" x1="0" x2="1">
            <stop offset="0" stopColor="#2DD4BF" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <radialGradient id="cup" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#1B1D24" />
            <stop offset="1" stopColor="#0B0C10" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <g transform="translate(800 400)">
          {[0, 2, 4].map((d) => (
            <circle
              key={d}
              className="ring"
              r="330"
              fill="none"
              stroke="url(#rim)"
              strokeWidth="1.2"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
          <g className="float">
            <path d="M-210 20 C-210 -250 210 -250 210 20" fill="none" stroke="url(#rim)" strokeWidth="26" opacity="0.35" filter="url(#soft)" />
            <path d="M-210 20 C-210 -250 210 -250 210 20" fill="none" stroke="#15161B" strokeWidth="20" strokeLinecap="round" />
            <path d="M-210 20 C-210 -250 210 -250 210 20" fill="none" stroke="url(#rim)" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <rect x="-268" y="-10" width="112" height="190" rx="52" fill="url(#cup)" stroke="#2DD4BF" strokeOpacity="0.55" strokeWidth="2" />
            <rect x="156" y="-10" width="112" height="190" rx="52" fill="url(#cup)" stroke="#8B5CF6" strokeOpacity="0.6" strokeWidth="2" />
          </g>
        </g>
        <path
          d="M0 700 C200 690 300 640 420 650 S640 720 800 690 S1040 610 1180 640 S1440 700 1600 680"
          fill="none"
          stroke="url(#rim)"
          strokeWidth="2"
          opacity="0.45"
        />
      </svg>
    </div>
  )
}
