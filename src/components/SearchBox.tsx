import { useId, useMemo, useState } from 'react'
import { searchProducts } from '../lib/search'
import type { Product, RigMeta } from '../lib/types'

interface Props {
  products: Product[]
  rigs: RigMeta[]
  label: string
  placeholder?: string
  onPick: (index: number) => void
  /** only search inside this rig */
  rig?: string
  inputId?: string
}

export function SearchBox({ products, rigs, label, placeholder, onPick, rig, inputId }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const uid = useId()
  const listId = `${uid}-list`
  const id = inputId ?? `${uid}-input`

  const pool = useMemo(() => (rig ? products.map((p, i) => ({ p, i })).filter((x) => x.p.rig === rig) : null), [products, rig])
  const results = useMemo(() => {
    if (!pool) return searchProducts(products, query, 8)
    const sub = searchProducts(
      pool.map((x) => x.p),
      query,
      8,
    )
    return sub.map((k) => pool[k].i)
  }, [products, pool, query])

  const rigName = (id: string) => {
    const r = rigs.find((x) => x.id === id)
    return r ? `${r.source}, ${r.formLabel}` : id
  }

  const pick = (i: number) => {
    onPick(i)
    setQuery(products[i].name)
    setOpen(false)
  }

  const expanded = open && query.trim().length > 0

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-sm text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="field"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && results[active] !== undefined ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            setOpen(true)
            setActive((a) => Math.max(0, Math.min(results.length - 1, a + 1)))
            e.preventDefault()
          } else if (e.key === 'ArrowUp') {
            setActive((a) => Math.max(0, a - 1))
            e.preventDefault()
          } else if (e.key === 'Enter' && expanded && results[active] !== undefined) {
            pick(results[active])
            e.preventDefault()
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={`Hasil pencarian ${label}`}
        hidden={!expanded}
        className="card absolute right-0 left-0 z-30 mt-2 max-h-80 overflow-auto p-1.5 shadow-2xl shadow-black/60"
      >
        {results.length === 0 && <li className="px-3 py-3 text-sm text-ink-2">Belum ketemu. Coba ketik merek atau sebagian nama.</li>}
        {results.map((idx, n) => {
          const p = products[idx]
          return (
            <li
              key={p.id}
              id={`${listId}-${n}`}
              role="option"
              aria-selected={n === active}
              className={`flex cursor-pointer flex-col rounded-xl px-3 py-2.5 ${n === active ? 'bg-surface-2' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(n)}
              onClick={() => pick(idx)}
            >
              <span className="text-[0.95rem] text-ink">{p.name}</span>
              <span className="text-xs text-ink-2">{rigName(p.rig)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
