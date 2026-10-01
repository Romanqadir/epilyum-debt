import { cityLabel, allocationLabel, ALLOCATION_COLORS } from '../lib/constants'
import { usd, iqd, dateFmt } from '../lib/format'

const DESTINATIONS = ['ibo', 'rasty', 'expenses']

const share = (value, total) => {
  const t = Number(total)
  if (t <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((Number(value) / t) * 100)))
}

/**
 * What one clinic paid during the selected period.
 *
 * The table this replaces gave each destination its own column, so reading
 * "most of Dr Zana's money went to خەرجی" meant comparing four cells by eye
 * and doing the arithmetic yourself. A bar says it at a glance, and because
 * dollars and dinars are never summed, a clinic paying in both gets one bar
 * per currency instead of a single misleading total.
 */
export default function MonthlyClinicCard({ row, active = false, onSelect }) {
  const initial = (row.name || '?').trim().charAt(0).toUpperCase()

  const books = [
    { key: 'usd', label: 'دۆلار', fmt: usd, total: Number(row.usd),
      parts: { ibo: Number(row.iboUsd), rasty: Number(row.rastyUsd), expenses: Number(row.expensesUsd) } },
    { key: 'iqd', label: 'دینار', fmt: iqd, total: Number(row.iqd),
      parts: { ibo: Number(row.iboIqd), rasty: Number(row.rastyIqd), expenses: Number(row.expensesIqd) } },
  ].filter((b) => b.total > 0)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(active ? 'all' : row.id)}
      className={`group w-full rounded-2xl border bg-surface p-5 text-start shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] ${
        active ? 'border-brand-600 ring-1 ring-brand-600' : 'border-line hover:border-accent-300'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-[1.05rem] font-bold text-brand-600"
            aria-hidden
          >
            {initial}
          </span>

          <span className="min-w-0">
            <span className="block truncate text-[1.02rem] font-semibold">{row.name}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8rem] text-faint">
              <span>{cityLabel(row.city)}</span>
              <span aria-hidden>·</span>
              <span><span className="num">{row.count}</span> قیست</span>
              {row.phone && <><span aria-hidden>·</span><span className="num">{row.phone}</span></>}
            </span>
          </span>
        </div>

        <div className="text-end">
          <p className="text-[0.72rem] text-faint">کۆی ئەم ماوەیە</p>
          {books.map((b) => (
            <p key={b.key} className="num text-[1.3rem] font-bold leading-tight text-pos">
              {b.fmt(b.total)}
            </p>
          ))}
        </div>
      </div>

      {books.map((b) => (
        <div key={b.key} className="mt-4 border-t border-line pt-4">
          {books.length > 1 && (
            <p className="mb-2 text-[0.75rem] font-medium text-muted">{b.label}</p>
          )}

          <span className="flex h-2 w-full overflow-hidden rounded-full bg-accent-100">
            {DESTINATIONS.map((key) => (
              <span
                key={key}
                className={ALLOCATION_COLORS[key]}
                style={{ width: `${share(b.parts[key], b.total)}%` }}
              />
            ))}
          </span>

          <ul className="mt-3 space-y-1.5">
            {DESTINATIONS.filter((key) => b.parts[key] > 0).map((key) => (
              <li key={key} className="flex items-center gap-2.5">
                <span className={`size-2.5 shrink-0 rounded-full ${ALLOCATION_COLORS[key]}`} />
                <span className="text-[0.8rem] text-muted">{allocationLabel(key)}</span>
                <span className="num ms-auto text-[0.85rem] font-semibold">{b.fmt(b.parts[key])}</span>
                <span className="num w-9 text-end text-[0.75rem] text-faint">
                  {share(b.parts[key], b.total)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {row.last && (
        <p className="mt-3.5 text-[0.75rem] text-faint">
          دوا قیست <span className="num">{dateFmt(row.last)}</span>
        </p>
      )}
    </button>
  )
}
