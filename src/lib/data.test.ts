import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const payload = { rig: 'test', ids: ['one'], raw: [[0, 10]], target: [0, 0], targetSpreadDb: 0 }
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

beforeEach(() => vi.resetModules())
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('curve request recovery', () => {
  it('shares a pending request and retries after HTTP failure', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(json(payload))
    vi.stubGlobal('fetch', fetch)
    const { loadCurves } = await import('./data')
    const first = loadCurves('test')
    expect(loadCurves('test')).toBe(first)
    await expect(first).rejects.toThrow('503')
    expect((await loadCurves('test')).raw).toEqual([[0, 1]])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('rejects malformed curves and allows a clean retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ ...payload, raw: [[0]] })).mockResolvedValueOnce(json(payload)))
    const { loadCurves } = await import('./data')
    await expect(loadCurves('test')).rejects.toThrow('Invalid curve data')
    expect((await loadCurves('test')).ids).toEqual(['one'])
  })

  it('times out a stalled fetch and evicts the failed promise', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn().mockImplementationOnce((_url, { signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })).mockResolvedValueOnce(json(payload))
    vi.stubGlobal('fetch', fetch)
    const { loadCurves } = await import('./data')
    const rejected = expect(loadCurves('test')).rejects.toThrow('Aborted')
    await vi.advanceTimersByTimeAsync(12_000)
    await rejected
    expect((await loadCurves('test')).rig).toBe('test')
  })

  it('allows the core catalog to recover after an initial failure', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetch)
    const { loadCore } = await import('./data')
    await expect(loadCore()).rejects.toThrow('503')
    fetch.mockImplementation((url: string) => Promise.resolve(json(url.includes('products') ? [{ id: 'one' }] : url.includes('meta') ? { schemaVersion: 2, totals: { measurements: 1, modelRigPairs: 1, distinctBaseNames: 1 } } : {})))
    expect((await loadCore()).indexById.get('one')).toBe(0)
  })
})
