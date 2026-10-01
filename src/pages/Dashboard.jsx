import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, MenuItem, TextField } from '@mui/material'
import { supabase } from '../lib/supabase'
import { ALLOCATIONS, allocationLabel, cityLabel, saleDeviceLabel } from '../lib/constants'
import { money, usd, iqd, dateFmt, monthKey, thisMonth, todayISO, num, currencyLabel } from '../lib/format'
import { exportWorkbook } from '../lib/exportExcel'
import { useAuth } from '../context/AuthContext.jsx'
import ClientPicker from '../components/ClientPicker.jsx'
import MoneyField from '../components/MoneyField.jsx'
import ReceiptCard from '../components/ReceiptCard.jsx'
import Panel from '../components/Panel.jsx'
import Stat from '../components/Stat.jsx'
import ExportButton from '../components/ExportButton.jsx'
import { IconBack } from '../components/icons.jsx'

const RANGES = [
  ['today', 'ئەمڕۆ'],
  ['yesterday', 'دوێنێ'],
  ['week', 'ئەم هەفتەیە'],
  ['month', 'ئەم مانگە'],
  ['all', 'هەموو'],
]

function inRange(iso, range) {
  if (range === 'all') return true
  const d = new Date(iso)
  const now = new Date()
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = 86400000
  if (range === 'today') return d >= t0
  if (range === 'yesterday') return d >= new Date(t0 - day) && d < t0
  if (range === 'week') return d >= new Date(t0 - 6 * day)
  if (range === 'month') return d >= new Date(now.getFullYear(), now.getMonth(), 1)
  return true
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [screen, setScreen] = useState('home')
  const [client, setClient] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [entries, setEntries] = useState([])
  const [range, setRange] = useState('today')

  const loadEntries = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('payments')
      .select('id, date, amount, currency, allocation, invoice_no, note, created_at, clients(name, city)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(300)
    setEntries(data ?? [])
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  const backHome = () => { setReceipt(null); setClient(null); setScreen('home'); loadEntries() }

  const visible = useMemo(() => entries.filter((e) => inRange(e.created_at, range)), [entries, range])
  const rangeLabel = RANGES.find(([v]) => v === range)?.[1] ?? ''
  const todayCount = entries.filter((e) => inRange(e.created_at, 'today')).length

  const sumBy = (list, cur) => list
    .filter((e) => e.currency === cur)
    .reduce((s, e) => s + Number(e.amount), 0)

  const inThisMonth = entries.filter((e) => monthKey(e.date) === thisMonth())
  const monthUsd = sumBy(inThisMonth, 'usd')
  const monthIqd = sumBy(inThisMonth, 'iqd')
  const rangeUsd = sumBy(visible, 'usd')
  const rangeIqd = sumBy(visible, 'iqd')

  const exportXlsx = () => exportWorkbook({
    fileName: `epilyum-my-invoices-${thisMonth()}`,
    title: 'پسوڵەکانی من',
    subtitle: `${rangeLabel}  ·  ${profile?.full_name || profile?.email || ''}`,
    sheets: [{
      name: 'پسوڵەکان',
      columns: [
        { key: 'date',    header: 'بەروار' },
        { key: 'client',  header: 'دکتۆر/کلینیک' },
        { key: 'city',    header: 'شار' },
        { key: 'invoice', header: 'ژمارەی پسوڵە' },
        { key: 'usd',     header: 'دۆلار', type: 'money', tone: 'pos', total: true },
        { key: 'iqd',     header: 'دینار', type: 'iqd', tone: 'pos', total: true },
        { key: 'alloc',   header: 'درا بە' },
        { key: 'note',    header: 'تێبینی', width: 30 },
      ],
      rows: visible.map((e) => ({
        date: dateFmt(e.date),
        client: e.clients?.name ?? '',
        city: cityLabel(e.clients?.city),
        invoice: e.invoice_no ?? '',
        usd: e.currency === 'usd' ? Number(e.amount) : 0,
        iqd: e.currency === 'iqd' ? Number(e.amount) : 0,
        alloc: allocationLabel(e.allocation),
        note: e.note ?? '',
      })),
    }],
  })

  if (receipt) return <ReceiptCard receipt={receipt} onDone={backHome} />

  /* ---------------- home ---------------- */
  if (screen === 'home') {
    return (
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-navy-900 px-7 py-9 sm:px-10 sm:py-11">
          <span
            aria-hidden
            className="pointer-events-none absolute -end-28 -top-28 size-[26rem] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(39,71,141,.6) 0%, rgba(7,26,68,0) 70%)' }}
          />
          <div className="relative flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-md">
              <p className="text-[0.85rem] text-accent-300/70">
                سڵاو، {profile?.full_name || profile?.email}
              </p>
              <h1 className="head mt-1.5 text-[2.1rem] font-bold leading-tight text-white">
                پسوڵەی مانگانە
              </h1>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-accent-300/75">
                کلینیکێک هەڵبژێرە، ئەو بڕەی وەرتگرتووە بنووسە، و دیاری بکە درایە بە کێ.
              </p>
              <button
                type="button"
                onClick={() => setScreen('form')}
                className="mt-6 rounded-full bg-white px-7 py-3 text-[0.95rem] font-semibold text-navy-900 transition-transform hover:scale-[1.02]"
              >
                دەستپێکردن
              </button>
            </div>

            <dl className="flex gap-10">
              <div>
                <dd className="num text-[2.6rem] font-bold leading-none text-white">{todayCount}</dd>
                <dt className="mt-1.5 text-[0.82rem] text-accent-300/65">پسوڵەی ئەمڕۆ</dt>
              </div>
              <div>
                <dd className="text-accent-300">
                  {monthUsd === 0 && monthIqd === 0 ? (
                    <span className="num text-[2.6rem] font-bold leading-none">—</span>
                  ) : (
                    <>
                      {monthUsd > 0 && (
                        <span className="num block text-[2.2rem] font-bold leading-none">{usd(monthUsd)}</span>
                      )}
                      {monthIqd > 0 && (
                        <span className="num block text-[1.4rem] font-bold leading-tight opacity-85">{iqd(monthIqd)}</span>
                      )}
                    </>
                  )}
                </dd>
                <dt className="mt-1.5 text-[0.82rem] text-accent-300/65">کۆی ئەم مانگە</dt>
              </div>
            </dl>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={`کۆی ${rangeLabel} — دۆلار`} value={usd(rangeUsd)} tone="pos" />
          <Stat label={`کۆی ${rangeLabel} — دینار`} value={iqd(rangeIqd)} tone="pos" />
          <Stat label="ژمارەی پسوڵە" value={String(visible.length)} tone="accent" />
        </div>

        <Panel
          title="پسوڵەکانی تۆ"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap rounded-xl border border-line p-1">
                {RANGES.map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setRange(v)}
                    className={`rounded-lg px-3 py-1.5 text-[0.82rem] transition-colors ${
                      range === v ? 'bg-navy-900 text-white' : 'text-muted hover:bg-canvas'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <ExportButton onExport={exportXlsx} disabled={visible.length === 0} />
            </div>
          }
          flush
        >
          {visible.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-medium">هیچ پسوڵەیەک لەم ماوەیەدا نییە</p>
              <p className="mt-1 text-[0.85rem] text-muted">
                ماوەیەکی فراوانتر هەڵبژێرە، یان پسوڵەیەکی نوێ تۆمار بکە.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{e.clients?.name ?? '—'}</p>
                    <p className="text-[0.8rem] text-faint">
                      <span className="num">{dateFmt(e.date)}</span>
                      {e.clients?.city ? <> · {cityLabel(e.clients.city)}</> : null}
                      {' · '}{allocationLabel(e.allocation)}
                      {e.invoice_no ? <> · پسوڵە <span className="num">{e.invoice_no}</span></> : null}
                    </p>
                  </div>
                  <p className="num font-semibold text-pos">{money(e.amount, e.currency)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    )
  }

  /* ---------------- new invoice ---------------- */
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="head text-[1.7rem] font-bold">پسوڵەی نوێ</h1>
        <button type="button" onClick={backHome}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[0.88rem] text-muted transition-colors hover:bg-surface hover:text-ink">
          <IconBack />
          گەڕانەوە
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <div>
          {!client ? (
            <div className="grid h-full min-h-72 place-items-center rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
              <div>
                <p className="text-[1.1rem] font-semibold">کلینیکێک هەڵبژێرە بۆ دەستپێکردن</p>
                <p className="mt-2 text-[0.9rem] text-muted">لە لیستەکەی لای ڕاست هەڵیبژێرە.</p>
              </div>
            </div>
          ) : (
            <PaymentForm client={client} onSaved={setReceipt} />
          )}
        </div>

        <ClientPicker selected={client} onSelect={setClient} onClear={() => setClient(null)} />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- */

function PaymentForm({ client, onSaved }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    sale_id: '',
    date: todayISO(),
    invoice_no: '',
    amount: '',
    allocation: 'ibo',
    note: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      const [{ data: saleRows }, { data: past }] = await Promise.all([
        supabase.from('sale_balances').select('*')
          .eq('client_id', client.id).order('sale_date', { ascending: false }),
        supabase.from('payments').select('invoice_no').eq('client_id', client.id),
      ])
      if (!active) return

      const list = saleRows ?? []
      setSales(list)

      // Invoice numbers run per clinic: the first one is 1, and after that
      // the next number carries on from the highest already used. Falling
      // back to the count keeps it sensible if someone typed a name instead.
      const used = (past ?? [])
        .map((p) => parseInt(String(p.invoice_no ?? '').replace(/\D/g, ''), 10))
        .filter(Number.isFinite)
      const next = used.length ? Math.max(...used) + 1 : (past?.length ?? 0) + 1

      // default to the oldest deal still owing — that is what gets paid next
      const owing = [...list].reverse().find((s) => Number(s.remaining) > 0)
      setForm((f) => ({
        ...f,
        sale_id: (owing ?? list[0])?.id ?? '',
        invoice_no: String(next),
      }))
      setLoading(false)
    })()
    return () => { active = false }
  }, [client.id])

  const sale = sales.find((s) => s.id === form.sale_id)
  const currency = sale?.currency ?? 'usd'
  const amount = num(form.amount)
  const remainingAfter = sale ? Number(sale.remaining) - amount : 0

  // the amount belongs to the deal's currency, so re-group it on a switch
  useEffect(() => {
    setForm((f) => ({ ...f, amount: f.amount ? String(f.amount) : '' }))
  }, [currency])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.sale_id) { setError('کڕینێک هەڵبژێرە.'); return }
    if (amount <= 0) { setError('بڕی وەرگیراو بنووسە.'); return }
    if (remainingAfter < -0.01) { setError('بڕی وەرگیراو زیاترە لە قەرزی ماوە.'); return }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase.from('payments').insert({
        sale_id: form.sale_id,
        client_id: client.id,
        date: form.date,
        amount,
        allocation: form.allocation,
        invoice_no: form.invoice_no.trim() || null,
        note: form.note || null,
        user_id: user.id,
      })
      if (err) { setError(`تۆمارکردنی پسوڵە سەرکەوتوو نەبوو — ${err.message}`); return }

      onSaved({
        client,
        currency,
        devices: sale ? saleDeviceLabel(sale).split('، ') : [],
        date: form.date,
        amount,
        invoice_no: form.invoice_no,
        total_price: Number(sale?.total_price ?? 0),
        received: Number(sale?.received ?? 0) + amount,
        remaining: Math.max(0, remainingAfter),
        note: form.note,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="py-12 text-center text-[0.9rem] text-faint">بارکردن…</p>

  if (sales.length === 0) {
    return (
      <Alert severity="info">
        ئەم کلینیکە هیچ کڕینێکی تۆمارکراوی نییە. بەڕێوەبەر دەبێت سەرەتا ئامێرەکان زیاد بکات.
      </Alert>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Panel title="کڕینەکە">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField label="کڕین" select className="sm:col-span-2"
            value={form.sale_id} onChange={set('sale_id')}>
            {sales.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {saleDeviceLabel(s)} — ماوە {money(s.remaining, s.currency)}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="بەروار" type="date" InputLabelProps={{ shrink: true }}
            value={form.date} onChange={set('date')} />
          <TextField label="ژمارەی پسوڵە" inputProps={{ dir: 'ltr' }}
            value={form.invoice_no} onChange={set('invoice_no')}
            helperText="خۆکارانە دادەنرێت — دەتوانیت بیگۆڕیت" />
        </div>

        {sale && (
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <Mini label="کۆی نرخ" value={money(sale.total_price, currency)} />
            <Mini label="وەرگیراو" value={money(sale.received, currency)} tone="pos" />
            <Mini label="ماوە" value={money(sale.remaining, currency)} tone="neg" />
          </dl>
        )}
      </Panel>

      <Panel title={`بڕی وەرگیراو — ${currencyLabel(currency)}`}>
        <div className="flex flex-col gap-7">
          <p className="text-[0.82rem] text-faint">
            ئەم کڕینە بە {currencyLabel(currency)} تۆمارکراوە، بۆیە قیستەکەش بە هەمان دراو دەبێت.
          </p>

          <MoneyField label="بڕ" fullWidth currency={currency}
            value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />

          <fieldset>
            <legend className="mb-2 text-[0.85rem] text-muted">پارەکە درا بە</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {ALLOCATIONS.map((a) => {
                const on = form.allocation === a.value
                return (
                  <label key={a.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-[0.9rem] transition-colors ${
                      on ? 'border-brand-600 bg-accent-100 font-medium text-brand-600' : 'border-line hover:bg-canvas'
                    }`}>
                    <input type="radio" name="allocation" value={a.value}
                      checked={on} onChange={set('allocation')} className="accent-brand-600" />
                    {a.label}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <TextField label="تێبینی" multiline rows={3} fullWidth
            value={form.note} onChange={set('note')} />

          <div className="flex items-center justify-between rounded-xl bg-pos-soft px-5 py-4">
            <span className="text-[0.85rem] font-medium text-pos">کۆی ئەم پسوڵەیە</span>
            <span className="num text-[1.35rem] font-bold text-pos">{money(amount, currency)}</span>
          </div>

          {sale && amount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-neg-soft px-5 py-4">
              <span className="text-[0.85rem] font-medium text-neg">ماوە دوای ئەم پسوڵەیە</span>
              <span className="num text-[1.35rem] font-bold text-neg">
                {money(Math.max(0, remainingAfter), currency)}
              </span>
            </div>
          )}
        </div>
      </Panel>

      {error && <Alert severity="error">{error}</Alert>}

      <Button type="submit" variant="contained" size="large" disabled={saving}
        sx={{ paddingBlock: 1.3, paddingInline: 4 }}>
        تۆمارکردنی پسوڵە
      </Button>
    </form>
  )
}

function Mini({ label, value, tone }) {
  const color = tone === 'neg' ? 'text-neg' : tone === 'pos' ? 'text-pos' : 'text-ink'
  return (
    <div>
      <dt className="text-[0.75rem] text-faint">{label}</dt>
      <dd className={`num mt-0.5 font-bold ${color}`}>{value}</dd>
    </div>
  )
}
