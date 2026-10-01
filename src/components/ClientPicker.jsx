import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { cityLabel } from '../lib/constants'
import { usd, iqd } from '../lib/format'
import Money from './Money.jsx'
import { IconSearch } from './icons.jsx'

/**
 * Right-hand panel of the invoice screen. Reps pick from the clinics the
 * manager entered; they cannot add one, so there is no "new" button.
 * The five most recent show immediately — typing narrows them.
 */
export default function ClientPicker({ selected, onSelect, onClear }) {
  const [term, setTerm] = useState('')
  const [list, setList] = useState([])
  const [total, setTotal] = useState(null)
  const [loading, setLoading] = useState(true)

  const query = useMemo(() => term.trim(), [term])

  const load = useCallback(async (q) => {
    setLoading(true)
    let req = supabase.from('client_balances').select('*', { count: 'exact' })

    if (q.length >= 1) {
      const escaped = q.replace(/[%_,]/g, '')
      req = req.or(`name.ilike.%${escaped}%,phone.ilike.%${escaped}%`).order('name')
    } else {
      req = req.order('created_at', { ascending: false })
    }

    const { data, count } = await req.limit(5)
    setList(data ?? [])
    if (count != null) setTotal(count)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(query), query ? 250 : 0)
    return () => clearTimeout(t)
  }, [query, load])

  if (selected) {
    return (
      <aside className="h-fit overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
        <div className="bg-navy-900 px-5 py-4">
          <p className="text-[0.75rem] text-accent-300/65">کلینیکی هەڵبژێردراو</p>
          <p className="mt-1 text-[1.05rem] font-semibold text-white">{selected.name}</p>
          <p className="text-[0.8rem] text-accent-300/70">
            {cityLabel(selected.city)}
            {selected.phone ? <> · <span className="num">{selected.phone}</span></> : null}
          </p>
        </div>

        <dl className="space-y-2.5 px-5 py-4 text-[0.88rem]">
          <Row label="کۆی نرخ">
            <Money usd={selected.total_price_usd} iqd={selected.total_price_iqd} />
          </Row>
          <Row label="وەرگیراو" tone="pos">
            <Money usd={selected.received_usd} iqd={selected.received_iqd} tone="pos" />
          </Row>
          <Row label="ماوە" tone="neg">
            <Money usd={selected.remaining_usd} iqd={selected.remaining_iqd} tone="neg" />
          </Row>
        </dl>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-lg border border-line-strong py-2 text-[0.85rem] transition-colors hover:border-brand-600 hover:text-brand-600"
          >
            گۆڕینی کلینیک
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="h-fit overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-baseline justify-between px-5 pt-5">
        <h2 className="head font-semibold">کلینیکەکان</h2>
        <span className="num text-[0.8rem] text-faint">{total ?? '—'}</span>
      </div>

      <div className="relative px-5 py-4">
        <span className="pointer-events-none absolute inset-y-0 end-8 grid place-items-center text-faint">
          <IconSearch />
        </span>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="ناو یان ژمارەی مۆبایل"
          autoComplete="off"
          aria-label="گەڕان بە ناو یان ژمارەی مۆبایل"
          className="w-full rounded-lg border border-line bg-surface py-2.5 pe-10 ps-3 text-[0.9rem] outline-none transition-colors focus:border-brand-600"
        />
      </div>

      <div className="border-t border-line">
        {loading ? (
          <p className="px-5 py-8 text-center text-[0.85rem] text-faint">دەگەڕێت…</p>
        ) : list.length > 0 ? (
          <ul className="divide-y divide-line">
            {list.map((c) => {
              const owingUsd = Number(c.remaining_usd)
              const owingIqd = Number(c.remaining_iqd)
              const owing = owingUsd > 0 || owingIqd > 0
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-start transition-colors hover:bg-canvas"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate text-[0.78rem] text-faint">
                        {cityLabel(c.city)}
                        {c.phone ? <> · <span className="num">{c.phone}</span></> : null}
                      </span>
                    </span>
                    {owing ? (
                      <span className="flex shrink-0 flex-col items-end leading-tight text-neg">
                        {owingUsd > 0 && <span className="num text-[0.82rem] font-semibold">{usd(owingUsd)}</span>}
                        {owingIqd > 0 && <span className="num text-[0.82rem] font-semibold">{iqd(owingIqd)}</span>}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[0.8rem] font-semibold text-pos">تەواو</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-[0.85rem] leading-relaxed text-faint">
            {query
              ? 'هیچ کلینیکێک نەدۆزرایەوە.'
              : 'هێشتا هیچ کلینیکێک تۆمار نەکراوە. بەڕێوەبەر دەیانخاتە ناو سیستەمەوە.'}
          </p>
        )}
      </div>
    </aside>
  )
}

function Row({ label, children, tone }) {
  const color = tone === 'neg' ? 'text-neg' : tone === 'pos' ? 'text-pos' : 'text-ink'
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-end font-semibold ${color}`}>{children}</dd>
    </div>
  )
}
