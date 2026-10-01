import { cityLabel, allocationLabel, saleDevices } from '../lib/constants'
import { money, dateFmt, currencyLabel } from '../lib/format'

/**
 * One purchase, as a card rather than a table row.
 *
 * The table gave price, prepayment, instalments and remainder four separate
 * columns, so "how far along is this sale" meant reading four numbers and
 * subtracting in your head. Here a single bar answers it, and the devices
 * become chips — a gift reads as a gift instead of a word buried in a comma
 * list.
 */
export default function PurchaseCard({ sale }) {
  const price = Number(sale.total_price)
  const prepaid = Number(sale.prepaid)
  const collected = Number(sale.collected)
  const remaining = Number(sale.remaining)
  const settled = remaining <= 0

  const cur = sale.currency
  const cash = (n) => money(n, cur)
  const pct = (n) => (price > 0 ? Math.max(0, Math.min(100, (n / price) * 100)) : 0)
  const paidPct = Math.round(pct(prepaid + collected))

  const initial = (sale.client?.name || '?').trim().charAt(0).toUpperCase()

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
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
            <span className="block truncate text-[1.02rem] font-semibold">
              {sale.client?.name ?? '—'}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8rem] text-faint">
              <span>{cityLabel(sale.client?.city)}</span>
              <span aria-hidden>·</span>
              <span className="num">{dateFmt(sale.sale_date)}</span>
              <span aria-hidden>·</span>
              <span>{currencyLabel(cur)}</span>
            </span>
          </span>
        </div>

        <div className="text-end">
          <p className="text-[0.72rem] text-faint">ماوە</p>
          {settled ? (
            <p className="text-[1.05rem] font-bold text-pos">تەواو</p>
          ) : (
            <p className="num text-[1.3rem] font-bold leading-tight text-neg">{cash(remaining)}</p>
          )}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {saleDevices(sale).map(({ device, qty, gift }) => (
          <li
            key={`${device}-${gift}`}
            className={`rounded-lg px-2.5 py-1 text-[0.8rem] font-medium ${
              gift ? 'bg-pos-soft text-pos' : 'bg-accent-100 text-brand-600'
            }`}
          >
            {/* The model name and its count are one Latin phrase. Left as two
                runs inside an RTL line, the ×2 is reordered to the far side
                and reads as part of the previous chip. */}
            <span dir="ltr">{device}{qty > 1 && ` ×${qty}`}</span>
            {gift && <span className="ms-1.5 text-[0.72rem]">دیاری</span>}
          </li>
        ))}
      </ul>

      {/* Prepayment and instalments are stacked in one bar, because what the
          clinic owes depends on their sum, not on either one alone. */}
      <div className="mt-4">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-accent-100">
          <span className="bg-navy-900" style={{ width: `${pct(prepaid)}%` }} />
          <span className="bg-pos" style={{ width: `${pct(collected)}%` }} />
        </div>
        <p className="mt-1.5 text-[0.75rem] text-faint">
          <span className="num font-semibold text-ink">{paidPct}%</span> دراوە
        </p>
      </div>

      {/* The remainder is already the headline figure above, so it is left out
          here: three wider tiles hold a nine-digit dinar amount on one line,
          where four would break it across two. */}
      <dl className="mt-4 grid grid-cols-1 gap-2.5 border-t border-line pt-4 text-sm sm:grid-cols-3">
        <Cell label="کۆی نرخ" value={cash(price)} />
        <Cell
          label="پێشەکی"
          value={cash(prepaid)}
          note={sale.prepaid_allocation ? allocationLabel(sale.prepaid_allocation) : null}
          dot="bg-navy-900"
        />
        <Cell label="قیستەکان" value={cash(collected)} tone="pos" dot="bg-pos" />
      </dl>
    </article>
  )
}

/**
 * A Kurdish label reads right-to-left and a Latin figure left-to-right, so
 * edge-aligned they drift to opposite sides of the tile. Centring settles them.
 */
function Cell({ label, value, note, tone, dot }) {
  const color = tone === 'neg' ? 'text-neg' : tone === 'pos' ? 'text-pos' : 'text-ink'
  return (
    <div className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-center">
      <dt className="flex items-center justify-center gap-1.5 text-[0.72rem] text-muted">
        {dot && <span className={`size-2 shrink-0 rounded-full ${dot}`} />}
        {label}
      </dt>
      <dd className={`num mt-1 font-semibold ${color}`}>{value}</dd>
      {note && <dd className="mt-0.5 text-[0.7rem] text-faint">{note}</dd>}
    </div>
  )
}
