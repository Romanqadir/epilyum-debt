import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Menu, MenuItem, TextField,
} from '@mui/material'
import { statementHtml, printHtml } from '../lib/printStatement'
import { STATEMENT_LANGS } from '../lib/statementLang'
import { supabase } from '../lib/supabase'
import { CITIES, SPECIALITIES, allocationLabel, saleDeviceLabel, saleUnits } from '../lib/constants'
import { money, dateFmt, currencyLabel, monthKey, monthLabel } from '../lib/format'
import SaleForm from './SaleForm.jsx'

/**
 * The admin's one place for a clinic: its details, every purchase it made,
 * and the instalments collected against each. Reps never open this.
 */
export default function ClientDialog({ open, client, onClose, onSaved }) {
  const isNew = !client?.id

  const [details, setDetails] = useState({
    name: '', phone: '', city: 'Erbil', speciality: 'Dermatologist', note: '',
  })
  const [sales, setSales] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingSale, setEditingSale] = useState(null)   // sale row, or 'new'
  const [month, setMonth] = useState('all')
  const [printing, setPrinting] = useState(false)
  const [langMenu, setLangMenu] = useState(null)
  const [error, setError] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  const load = useCallback(async (id) => {
    setLoading(true)
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('sale_balances').select('*').eq('client_id', id).order('sale_date', { ascending: false }),
      supabase.from('payments').select('*, profiles(full_name, email)').eq('client_id', id).order('date', { ascending: false }).limit(1000),
    ])
    setSales(s ?? [])
    setPayments(p ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    setError('')
    setEditingSale(isNew ? 'new' : null)
    setMonth('all')
    setDetails({
      name: client?.name ?? '',
      phone: client?.phone ?? '',
      city: client?.city ?? 'Erbil',
      speciality: client?.speciality ?? 'Dermatologist',
      note: client?.note ?? '',
    })
    if (client?.id) load(client.id)
    else { setSales([]); setPayments([]) }
  }, [open, client, isNew, load])

  const set = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }))

  const months = useMemo(() => {
    const keys = new Set(payments.map((p) => monthKey(p.date)).filter(Boolean))
    return [...keys].sort().reverse()
  }, [payments])

  const shownPayments = useMemo(
    () => (month === 'all' ? payments : payments.filter((p) => monthKey(p.date) === month)),
    [payments, month]
  )

  /**
   * The statement is the one thing here that leaves the company, so the
   * admin picks the language the clinic actually reads. Everything else in
   * the app stays Kurdish.
   */
  const downloadPdf = async (lang) => {
    setLangMenu(null)
    setPrinting(true)
    try {
      await printHtml(statementHtml({
        client: { name: details.name, city: details.city, phone: details.phone },
        payments: shownPayments,
        month,
        lang,
        summary: {
          remainingUsd: sales.filter((x) => x.currency === 'usd')
            .reduce((t, x) => t + Number(x.remaining), 0),
          remainingIqd: sales.filter((x) => x.currency === 'iqd')
            .reduce((t, x) => t + Number(x.remaining), 0),
        },
      }))
    } finally {
      setPrinting(false)
    }
  }

  const saveDetails = async () => {
    setError('')
    if (!details.name.trim()) { setError('ناوی کلینیک بنووسە.'); return null }
    setSavingDetails(true)
    try {
      const row = {
        name: details.name.trim(),
        phone: details.phone.trim() || null,
        city: details.city,
        speciality: details.speciality,
        note: details.note || null,
      }
      const q = client?.id
        ? supabase.from('clients').update(row).eq('id', client.id).select().single()
        : supabase.from('clients').insert(row).select().single()
      const { data, error: err } = await q
      if (err) {
        setError(err.code === '23505'
          ? 'ئەم ژمارە مۆبایلە پێشتر تۆمارکراوە.'
          : `پاشەکەوتکردن سەرکەوتوو نەبوو — ${err.message}`)
        return null
      }
      onSaved?.()
      return data
    } finally {
      setSavingDetails(false)
    }
  }

  const submitSale = async (values) => {
    // A brand-new clinic is created together with its first purchase.
    let id = client?.id
    if (!id) {
      const created = await saveDetails()
      if (!created) throw new Error('زانیاری کلینیک تەواو نەبوو — سەیری پەیامی سەرەوە بکە.')
      id = created.id
    }

    const q = editingSale && editingSale !== 'new'
      ? supabase.from('sales').update(values).eq('id', editingSale.id)
      : supabase.from('sales').insert({ ...values, client_id: id })

    const { error: err } = await q
    if (err) throw new Error(`تۆمارکردنی فرۆشتن سەرکەوتوو نەبوو — ${err.message}`)

    setEditingSale(null)
    await load(id)
    onSaved?.()
    if (isNew) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isNew ? 'کلینیکی نوێ' : details.name || 'کلینیک'}</DialogTitle>

      <DialogContent dividers className="space-y-6">
        {/* ---- details ---- */}
        <section className="space-y-4">
          <h3 className="font-semibold">زانیاری کلینیک</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="ناوی دکتۆر/کلینیک" className="sm:col-span-2"
              value={details.name} onChange={set('name')} autoFocus={isNew} />
            <TextField label="ژمارەی مۆبایل" inputProps={{ dir: 'ltr' }}
              value={details.phone} onChange={set('phone')} />
            <TextField label="شار" select value={details.city} onChange={set('city')}>
              {CITIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
            <TextField label="پسپۆڕی" select value={details.speciality} onChange={set('speciality')}>
              {SPECIALITIES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
            <TextField label="تێبینی" value={details.note} onChange={set('note')} />
          </div>

          {!isNew && (
            <Button variant="outlined" color="inherit" onClick={saveDetails} disabled={savingDetails}>
              پاشەکەوتکردنی زانیاری
            </Button>
          )}
        </section>

        {error && <Alert severity="error">{error}</Alert>}

        {/* ---- purchases ---- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{isNew ? 'کڕینی یەکەم' : 'کڕینەکان'}</h3>
            {!isNew && !editingSale && (
              <Button size="small" variant="contained" onClick={() => setEditingSale('new')}>
                زیادکردنی ئامێری نوێ
              </Button>
            )}
          </div>

          {editingSale ? (
            <SaleForm
              initial={editingSale === 'new' ? null : editingSale}
              onSubmit={submitSale}
              onCancel={isNew ? null : () => setEditingSale(null)}
              submitLabel={editingSale === 'new' ? 'تۆمارکردنی کڕین' : 'نوێکردنەوە'}
            />
          ) : loading ? (
            <div className="grid place-items-center py-8"><CircularProgress size={24} /></div>
          ) : sales.length === 0 ? (
            <p className="rounded-xl bg-canvas px-4 py-6 text-center text-sm text-muted">
              هیچ کڕینێک تۆمار نەکراوە.
            </p>
          ) : (
            <ul className="space-y-3">
              {sales.map((s) => {
                const done = Number(s.remaining) <= 0
                return (
                  <li key={s.id} className="rounded-xl border border-line">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          <span>{saleDeviceLabel(s)}</span>
                          <span className="shrink-0 rounded-md bg-accent-100 px-1.5 py-0.5 text-[0.72rem] font-medium text-brand-600">
                            {currencyLabel(s.currency)}
                          </span>
                        </p>
                        <p className="text-sm text-muted">
                          <span className="num">{dateFmt(s.sale_date)}</span> ·{' '}
                          <span className="num">{saleUnits(s).paid}</span> ئامێری فرۆشراو
                          {saleUnits(s).gift > 0 && (
                            <> · <span className="num">{saleUnits(s).gift}</span> دیاری</>
                          )}
                        </p>
                      </div>
                      <Button size="small" color="inherit" onClick={() => setEditingSale(s)}>
                        دەستکاری
                      </Button>
                    </div>

                    <dl className="grid grid-cols-2 gap-2.5 p-4 text-sm sm:grid-cols-4">
                      <Cell label="کۆی نرخ" value={money(s.total_price, s.currency)} />
                      <Cell
                        label="پێشەکی"
                        value={money(s.prepaid, s.currency)}
                        note={s.prepaid_allocation ? allocationLabel(s.prepaid_allocation) : null}
                      />
                      <Cell label="قیستەکان" value={money(s.collected, s.currency)} />
                      <Cell label="ماوە" value={money(s.remaining, s.currency)}
                        tone={done ? 'settled' : 'owed'} />
                    </dl>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ---- instalment history ---- */}
        {!isNew && payments.length > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">قیستە وەرگیراوەکان</h3>
              <div className="flex flex-wrap items-center gap-2">
                <TextField select size="small" label="مانگ" value={month}
                  onChange={(e) => setMonth(e.target.value)} sx={{ minWidth: 175 }}>
                  <MenuItem value="all">هەموو مانگەکان</MenuItem>
                  {months.map((m) => <MenuItem key={m} value={m}>{monthLabel(m)}</MenuItem>)}
                </TextField>
                <Button variant="outlined" color="inherit"
                  onClick={(e) => setLangMenu(e.currentTarget)}
                  disabled={printing || shownPayments.length === 0}>
                  {printing ? 'ئامادە دەکرێت…' : 'داگرتنی PDF'}
                </Button>
                <Menu
                  anchorEl={langMenu}
                  open={Boolean(langMenu)}
                  onClose={() => setLangMenu(null)}
                >
                  {STATEMENT_LANGS.map((l) => (
                    <MenuItem key={l.value} onClick={() => downloadPdf(l.value)}>
                      {l.label}
                    </MenuItem>
                  ))}
                </Menu>
              </div>
            </div>

            {shownPayments.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2 text-start font-normal">بەروار</th>
                    <th className="px-4 py-2 text-start font-normal">بڕ</th>
                    <th className="px-4 py-2 text-start font-normal">درا بە</th>
                    <th className="px-4 py-2 text-start font-normal">تۆمارکەر</th>
                  </tr>
                </thead>
                <tbody>
                  {shownPayments.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2"><span className="num">{dateFmt(p.date)}</span></td>
                      <td className="px-4 py-2"><span className="num">{money(p.amount, p.currency)}</span></td>
                      <td className="px-4 py-2">{allocationLabel(p.allocation)}</td>
                      <td className="px-4 py-2 text-muted">
                        {p.profiles?.full_name || p.profiles?.email || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {shownPayments.length === 0 && (
              <p className="rounded-xl bg-canvas px-4 py-6 text-center text-sm text-faint">
                هیچ قیستێک لەم مانگەدا نییە.
              </p>
            )}

            <p className="text-[0.78rem] text-faint">
              PDF-ەکە لە دیالۆگی چاپکردنی وێبگەڕەوە دەردەچێت — «Save as PDF» هەڵبژێرە.
            </p>
          </section>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">داخستن</Button>
      </DialogActions>
    </Dialog>
  )
}

/**
 * A Kurdish label reads right-to-left and a Latin figure left-to-right, so
 * stacked and edge-aligned they drift to opposite sides of the tile and the
 * pair stops reading as one fact. Centring both settles them.
 */
function Cell({ label, value, note, tone }) {
  const color = tone === 'owed' ? 'text-neg' : tone === 'settled' ? 'text-pos' : 'text-ink'
  return (
    <div className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-center">
      <dt className="text-[0.72rem] text-muted">{label}</dt>
      <dd className={`num mt-1 font-semibold ${color}`}>{value}</dd>
      {note && <dd className="mt-0.5 text-[0.7rem] text-faint">{note}</dd>}
    </div>
  )
}
