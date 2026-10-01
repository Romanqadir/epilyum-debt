import { useEffect, useState } from 'react'
import { Alert, Button, TextField } from '@mui/material'
import DeviceSelect from './DeviceSelect.jsx'
import MoneyField from './MoneyField.jsx'
import CurrencyToggle from './CurrencyToggle.jsx'
import { PREPAID_ALLOCATIONS, saleDevices } from '../lib/constants'
import { money, num, todayISO, groupInput, CURRENCY } from '../lib/format'

/**
 * One purchase: what was taken, what it cost, and what was paid up front.
 *
 * The whole deal lives in a single currency — nothing is converted — so the
 * remainder comes back in whatever the price was quoted in. Total and
 * prepaid are stored; the remainder is derived, but the manager can type it
 * directly because that is how a deal is quoted ("23,000 total, 15,000
 * still owed") and the prepayment adjusts to match.
 */
export default function SaleForm({ initial, onSubmit, onCancel, submitLabel = 'تۆمارکردن' }) {
  const [devices, setDevices] = useState(
    () => Object.fromEntries(saleDevices(initial).map(({ device, qty }) => [device, qty]))
  )
  const [gifts, setGifts] = useState(() => initial?.gift_devices ?? [])
  const [currency, setCurrency] = useState(initial?.currency ?? 'usd')

  const decimals = (CURRENCY[currency] ?? CURRENCY.usd).decimals
  const fmt = (v) => (v == null || v === '' ? '' : groupInput(String(v), decimals))

  const [form, setForm] = useState({
    sale_date: initial?.sale_date ?? todayISO(),
    total_price: initial?.total_price != null ? String(initial.total_price) : '',
    prepaid: initial?.prepaid != null ? String(initial.prepaid) : '',
    prepaid_allocation: initial?.prepaid_allocation ?? 'ibo',
    note: initial?.note ?? '',
  })
  const [remainingText, setRemainingText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setMoney = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const giftSet = new Set(gifts)
  const paidUnits = Object.entries(devices)
    .reduce((t, [d, n]) => t + (giftSet.has(d) ? 0 : Number(n || 0)), 0)
  const giftUnits = Object.entries(devices)
    .reduce((t, [d, n]) => t + (giftSet.has(d) ? Number(n || 0) : 0), 0)

  const total = num(form.total_price)
  const prepaid = num(form.prepaid)
  const remaining = Math.max(0, total - prepaid)

  // switching currency re-groups what is already typed
  useEffect(() => {
    setForm((f) => ({
      ...f,
      total_price: fmt(num(f.total_price) || ''),
      prepaid: fmt(num(f.prepaid) || ''),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency])

  useEffect(() => {
    setRemainingText(fmt(Math.max(0, total - prepaid)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, prepaid, currency])

  const onRemaining = (v) => {
    setRemainingText(v)
    setForm((f) => ({ ...f, prepaid: fmt(Math.max(0, num(f.total_price) - num(v))) }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (paidUnits + giftUnits === 0) { setError('لانیکەم یەک ئامێر هەڵبژێرە.'); return }
    if (paidUnits === 0) { setError('لانیکەم یەک ئامێر دەبێت فرۆشراو بێت، نەک هەمووی دیاری.'); return }
    if (total <= 0) { setError('کۆی نرخ بنووسە.'); return }
    if (prepaid > total) { setError('پێشەکی ناتوانێت زیاتر بێت لە کۆی نرخ.'); return }

    setSaving(true)
    try {
      await onSubmit({
        currency,
        devices: Object.keys(devices),
        device_qty: devices,
        gift_devices: gifts,
        device_count: paidUnits + giftUnits,
        total_price: total,
        prepaid,
        prepaid_allocation: prepaid > 0 ? form.prepaid_allocation : null,
        sale_date: form.sale_date,
        note: form.note || null,
      })
    } catch (err) {
      setError(err?.message || 'تۆمارکردن سەرکەوتوو نەبوو.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DeviceSelect
        value={devices} onChange={setDevices}
        gifts={gifts} onGiftsChange={setGifts}
      />

      <div className="grid gap-6 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-2">
        <TextField label="بەرواری فرۆشتن" type="date" InputLabelProps={{ shrink: true }}
          value={form.sale_date} onChange={set('sale_date')} />
        <TextField label="ژمارەی ئامێری فرۆشراو" value={paidUnits} disabled
          inputProps={{ dir: 'ltr' }}
          helperText={giftUnits > 0 ? `لەگەڵ ${giftUnits} دیاری` : 'لە سەرەوە دادەنرێت'} />

        <div className="sm:col-span-2">
          <CurrencyToggle value={currency} onChange={setCurrency} label="نرخ بە" />
          <p className="mt-2 text-[0.78rem] text-faint">
            هەموو قیستەکانی ئەم کڕینە بە هەمان دراو دەبن. هیچ گۆڕینێک ئەنجام نادرێت.
          </p>
        </div>

        <MoneyField label="کۆی نرخ" className="sm:col-span-2" currency={currency}
          value={form.total_price} onChange={setMoney('total_price')} />
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6">
        <p className="text-[0.85rem] text-muted">پێشەکی دراو</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <MoneyField label="پێشەکی" currency={currency}
            value={form.prepaid} onChange={setMoney('prepaid')} />
          <MoneyField label="ماوە" currency={currency}
            value={remainingText} onChange={onRemaining}
            helperText="بنووسە، پێشەکی خۆی دادەنرێت" />
        </div>

        {prepaid > 0 && (
          <fieldset className="border-t border-line pt-4">
            <legend className="mb-2 text-[0.85rem] text-muted">پێشەکی درا بە</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PREPAID_ALLOCATIONS.map((a) => {
                const on = form.prepaid_allocation === a.value
                return (
                  <label key={a.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-[0.9rem] transition-colors ${
                      on ? 'border-brand-600 bg-accent-100 font-medium text-brand-600' : 'border-line hover:bg-canvas'
                    }`}>
                    <input type="radio" name="prepaid_allocation" value={a.value}
                      checked={on} onChange={set('prepaid_allocation')} className="accent-brand-600" />
                    {a.label}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        <TextField label="تێبینی" multiline rows={2} fullWidth
          value={form.note} onChange={set('note')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Mini label="کۆی نرخ" value={money(total, currency)} />
        <Mini label="پێشەکی" value={money(prepaid, currency)} tone="pos" />
        <Mini label="ماوە" value={money(remaining, currency)} tone="neg" />
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      <div className="flex gap-2">
        <Button type="submit" variant="contained" disabled={saving}>{submitLabel}</Button>
        {onCancel && <Button color="inherit" onClick={onCancel}>پاشگەزبوونەوە</Button>}
      </div>
    </form>
  )
}

function Mini({ label, value, tone }) {
  const color = tone === 'neg' ? 'text-neg' : tone === 'pos' ? 'text-pos' : 'text-ink'
  return (
    <div className="rounded-xl border border-line bg-canvas px-4 py-3">
      <p className="text-[0.75rem] text-faint">{label}</p>
      <p className={`num mt-0.5 font-bold ${color}`}>{value}</p>
    </div>
  )
}
