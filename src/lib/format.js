/**
 * Money is never converted here. Every amount travels with the currency it
 * was recorded in, and the two are only ever shown side by side.
 */

export const CURRENCY = {
  usd: { label: 'دۆلار', short: '$',    decimals: 2 },
  iqd: { label: 'دینار', short: 'د.ع', decimals: 0 },
}

const group = (n, decimals) =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

export const usd = (n) => '$' + group(n, 2)
export const iqd = (n) => group(n, 0) + ' د.ع'

/** One amount in its own currency. */
export const money = (n, currency = 'usd') => (currency === 'iqd' ? iqd(n) : usd(n))

/** A zero still deserves the right symbol. */
export const moneyOrDash = (n, currency) => (Number(n) ? money(n, currency) : '—')

export const currencyLabel = (c) => CURRENCY[c]?.label ?? c

export const dateFmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

/** '2026-09' — the key used for grouping and filtering by month. */
export const monthKey = (d) => (d ? String(d).slice(0, 7) : '')

export const monthLabel = (key) => {
  if (!key) return ''
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export const thisMonth = () => monthKey(new Date().toISOString())
export const todayISO = () => new Date().toISOString().slice(0, 10)

/** Blank, junk and grouped input all read as a plain number. */
export const num = (v) => {
  if (v === '' || v == null) return 0
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Thousands separators while the field is being typed into.
 * Keeps a trailing '.' and any decimals the person is mid-way through.
 */
export const groupInput = (raw, decimals = 2) => {
  const cleaned = String(raw ?? '').replace(/[^\d.]/g, '')
  if (cleaned === '') return ''
  const [whole, ...rest] = cleaned.split('.')
  const head = whole === '' ? '' : Number(whole).toLocaleString('en-US')
  if (decimals === 0 || rest.length === 0) return head
  return `${head}.${rest.join('').slice(0, decimals)}`
}
