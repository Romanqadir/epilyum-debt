import { cityLabel } from '../lib/constants'
import { usd, iqd, dateFmt } from '../lib/format'

const pct = (received, total) => {
  const t = Number(total)
  if (t <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((Number(received) / t) * 100)))
}

/**
 * One clinic, as a card rather than a table row.
 *
 * A table forces two currencies into one column and hides how far along a
 * clinic is. Here each currency gets its own progress line, so "how much is
 * still owed" and "how close are they" are both readable at a glance.
 */
export default function ClinicCard({ row, onOpen }) {
  const remUsd = Number(row.remaining_usd)
  const remIqd = Number(row.remaining_iqd)
  const settled = remUsd <= 0 && remIqd <= 0
  const initial = (row.name || '?').trim().charAt(0).toUpperCase()

  const lines = [
    { key: 'usd', label: 'دۆلار', fmt: usd,
      total: Number(row.total_price_usd), received: Number(row.received_usd) },
    { key: 'iqd', label: 'دینار', fmt: iqd,
      total: Number(row.total_price_iqd), received: Number(row.received_iqd) },
  ].filter((l) => l.total > 0)

  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="group w-full rounded-2xl border border-line bg-surface p-5 text-start shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-[var(--shadow-pop)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl text-[1.05rem] font-bold ${
              settled ? 'bg-pos-soft text-pos' : 'bg-accent-100 text-brand-600'
            }`}
            aria-hidden
          >
            {initial}
          </span>

          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate text-[1.02rem] font-semibold">{row.name}</span>
              {settled && (
                <span className="shrink-0 rounded-full bg-pos-soft px-2 py-0.5 text-[0.7rem] font-medium text-pos">
                  تەواو
                </span>
              )}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8rem] text-faint">
              <span>{cityLabel(row.city)}</span>
              {row.phone && <><span aria-hidden>·</span><span className="num">{row.phone}</span></>}
              <span aria-hidden>·</span>
              <span><span className="num">{row.device_count}</span> ئامێر</span>
              {Number(row.sale_count) > 1 && (
                <><span aria-hidden>·</span><span><span className="num">{row.sale_count}</span> کڕین</span></>
              )}
            </span>
          </span>
        </div>

        <div className="text-end">
          <p className="text-[0.72rem] text-faint">ماوە</p>
          {settled ? (
            <p className="num text-[1.3rem] font-bold text-pos">—</p>
          ) : (
            <>
              {remUsd > 0 && <p className="num text-[1.3rem] font-bold leading-tight text-neg">{usd(remUsd)}</p>}
              {remIqd > 0 && <p className="num text-[1.3rem] font-bold leading-tight text-neg">{iqd(remIqd)}</p>}
            </>
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <div className="mt-4 space-y-2.5 border-t border-line pt-4">
          {lines.map(({ key, label, fmt, total, received }) => {
            const p = pct(received, total)
            return (
              <div key={key} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                <span className="text-[0.75rem] text-faint">{label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-accent-100">
                  <span
                    className={`block h-full rounded-full transition-[width] ${p >= 100 ? 'bg-pos' : 'bg-brand-600'}`}
                    style={{ width: `${p}%` }}
                  />
                </span>
                <span className="num shrink-0 text-[0.75rem] text-muted">
                  {fmt(received)} <span className="text-faint">لە {fmt(total)}</span>
                  <span className="ms-2 inline-block w-8 text-end font-semibold text-ink">{p}%</span>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {row.last_payment_date && (
        <p className="mt-3 text-[0.75rem] text-faint">
          دوا قیست <span className="num">{dateFmt(row.last_payment_date)}</span>
        </p>
      )}
    </button>
  )
}
