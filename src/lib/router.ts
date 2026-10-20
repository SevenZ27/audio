import { useEffect, useState } from 'react'

export type Route = { page: 'home'; section?: string } | { page: 'product'; id: string }

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
  if (h.startsWith('produk/')) {
    try {
      return { page: 'product', id: decodeURIComponent(h.slice('produk/'.length)) }
    } catch {
      // Keep malformed shared links inside the existing not-found UI.
      return { page: 'product', id: '' }
    }
  }
  return { page: 'home', section: h || undefined }
}

export function productHref(id: string): string {
  return `#/produk/${encodeURIComponent(id)}`
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
