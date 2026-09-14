import { useEffect, useState } from 'react'

export type Route = { page: 'home'; section?: string } | { page: 'product'; id: string }

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '')
  if (h.startsWith('produk/')) {
    return { page: 'product', id: decodeURIComponent(h.slice('produk/'.length)) }
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
