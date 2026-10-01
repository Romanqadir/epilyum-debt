import { useEffect, useMemo, useState } from 'react'
import { Button, MenuItem, TextField } from '@mui/material'
import { supabase } from '../lib/supabase'
import { CITIES, ALLOCATION_COLORS, allocationLabel, cityLabel } from '../lib/constants'
import { usd, iqd, dateFmt, monthKey, monthLabel, thisMonth } from '../lib/format'
import { exportWorkbook } from '../lib/exportExcel'
import Stat from '../components/Stat.jsx'
import Panel from '../components/Panel.jsx'
import Filters from '../components/Filters.jsx'
import ExportButton from '../components/ExportButton.jsx'
import MonthlyClinicCard from '../components/MonthlyClinicCard.jsx'

const PAGE = 8

export default function AdminMonthly() {
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [sales, setSales] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  const [month, setMonth] = useState(thisMonth())
  const [city, setCity] = useState('all')
  const [clientId, setClientId] = useState('all')
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    let active = true
    ;(async () => {
      const [{ data: p }, { data: e }, { data: s }, { data: c }] = await Promise.all([
        supabase
          .from('payments')
          .select('id, client_id, sale_id, date, amount, currency, allocation, invoice_no, note, clients(name, city, phone), profiles(full_name, email)')
          .order('date', { ascending: false })
          .limit(5000),
        supabase.from('expenses').select('*, profiles(full_name, email)').order('date', { ascending: false }).limit(2000),
        supabase.from('sale_balances').select('*'),
        supabase.from('clients').select('id, name, city'),
      ])
      if (!active) return
      setPayments(p ?? [])
      setExpenses(e ?? [])
      setSales(s ?? [])
      setClients(c ?? [])
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const months = useMemo(() => {
    const keys = new Set([
      ...payments.map((p) => monthKey(p.date)),
      ...expenses.map((e) => monthKey(e.date)),
      thisMonth(),
    ])
    return [...keys].filter(Boolean).sort().reverse()
  }, [payments, expenses])

  const cityOf = useMemo(() => new Map(clients.map((c) => [c.id, c.city])), [clients])

  const clientOptions = useMemo(() => clients
    .filter((c) => city === 'all' || c.city === city)
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name)), [clients, city])

  // a clinic picked under one city must not stay selected under another
  useEffect(() => {
    if (clientId !== 'all' && !clientOptions.some((c) => c.id === clientId)) setClientId('all')
  }, [clientOptions, clientId])

  // a narrower filter yields a shorter list; start it from the top again
  useEffect(() => { setShown(PAGE) }, [month, city, clientId])

  const scoped = useMemo(() => payments.filter((p) => {
    if (month !== 'all' && monthKey(p.date) !== month) return false
    if (city !== 'all' && p.clients?.city !== city) return false
    if (clientId !== 'all' && p.client_id !== clientId) return false
    return true
  }), [payments, month, city, clientId])

  const scopedExpenses = useMemo(
    () => expenses.filter((e) => month === 'all' || monthKey(e.date) === month),
    [expenses, month]
  )

  // dollars and dinars are tallied apart and never added together
  const sum = (list, cur) => list
    .filter((x) => x.currency === cur)
    .reduce((t, x) => t + Number(x.amount), 0)

  const byAlloc = (who, cur) => sum(scoped.filter((p) => p.allocation === who), cur)

  const totals = useMemo(() => ({
    monthUsd: sum(scoped, 'usd'), monthIqd: sum(scoped, 'iqd'),
    allUsd: sum(payments, 'usd'), allIqd: sum(payments, 'iqd'),
    iboUsd: byAlloc('ibo', 'usd'), iboIqd: byAlloc('ibo', 'iqd'),
    rastyUsd: byAlloc('rasty', 'usd'), rastyIqd: byAlloc('rasty', 'iqd'),
    expensesUsd: byAlloc('expenses', 'usd'), expensesIqd: byAlloc('expenses', 'iqd'),
    clinics: new Set(scoped.map((p) => p.client_id)).size,
    spentUsd: sum(scopedExpenses, 'usd'), spentIqd: sum(scopedExpenses, 'iqd'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [scoped, payments, scopedExpenses])

  const prepaid = useMemo(() => {
    const inScope = sales.filter((s) => {
      if (Number(s.prepaid) <= 0) return false
      if (month !== 'all' && monthKey(s.sale_date) !== month) return false
      if (city !== 'all' && cityOf.get(s.client_id) !== city) return false
      if (clientId !== 'all' && s.client_id !== clientId) return false
      return true
    })
    const by = (who, cur) => inScope
      .filter((s) => (who ? s.prepaid_allocation === who : true) && s.currency === cur)
      .reduce((t, s) => t + Number(s.prepaid), 0)
    return {
      totalUsd: by(null, 'usd'), totalIqd: by(null, 'iqd'),
      iboUsd: by('ibo', 'usd'), iboIqd: by('ibo', 'iqd'),
      rastyUsd: by('rasty', 'usd'), rastyIqd: by('rasty', 'iqd'),
      count: inScope.length,
    }
  }, [sales, month, city, clientId, cityOf])

  const deal = useMemo(() => {
    const by = (field, cur) => sales
      .filter((s) => s.currency === cur)
      .reduce((t, s) => t + Number(s[field]), 0)
    return {
      devices: sales.reduce((t, s) => t + Number(s.device_count), 0),
      priceUsd: by('total_price', 'usd'), priceIqd: by('total_price', 'iqd'),
      receivedUsd: by('received', 'usd'), receivedIqd: by('received', 'iqd'),
      remainingUsd: by('remaining', 'usd'), remainingIqd: by('remaining', 'iqd'),
    }
  }, [sales])

  const rows = useMemo(() => {
    const m = new Map()
    for (const p of scoped) {
      const r = m.get(p.client_id) ?? {
        id: p.client_id,
        name: p.clients?.name ?? '—',
        city: p.clients?.city,
        phone: p.clients?.phone,
        usd: 0, iqd: 0, count: 0,
        iboUsd: 0, iboIqd: 0, rastyUsd: 0, rastyIqd: 0, expensesUsd: 0, expensesIqd: 0,
        last: null,
      }
      const cur = p.currency === 'iqd' ? 'Iqd' : 'Usd'
      r[p.currency] += Number(p.amount)
      r[`${p.allocation}${cur}`] += Number(p.amount)
      r.count += 1
      if (!r.last || p.date > r.last) r.last = p.date
      m.set(p.client_id, r)
    }
    return [...m.values()].sort((a, b) => (b.usd + b.iqd / 1000) - (a.usd + a.iqd / 1000))
  }, [scoped])

  const scopeLabel = month === 'all' ? 'هەموو کاتەکان' : monthLabel(month)
  const scope = [
    scopeLabel,
    city === 'all' ? 'هەموو شارەکان' : cityLabel(city),
    clientId === 'all' ? null : clientOptions.find((c) => c.id === clientId)?.name,
  ].filter(Boolean).join('  ·  ')

  // shares are computed inside a currency, never across the two
  const share = (v, cur) => {
    const base = cur === 'iqd' ? totals.monthIqd : totals.monthUsd
    return base > 0 ? Math.round((v / base) * 100) : 0
  }

  const exportXlsx = () => exportWorkbook({
    fileName: `epilyum-${month === 'all' ? 'all' : month}`,
    title: `کۆی مانگانە — ${scopeLabel}`,
    subtitle: scope,
    sheets: [
      {
        name: 'کورتە',
        columns: [
          { key: 'label', header: 'ڕیزبەندی', width: 32 },
          { key: 'usd',   header: 'دۆلار', type: 'money', strong: true },
          { key: 'iqd',   header: 'دینار', type: 'iqd', strong: true },
        ],
        rows: [
          { label: 'کۆی وەرگیراو لەم ماوەیە', usd: totals.monthUsd, iqd: totals.monthIqd },
          { label: allocationLabel('ibo'), usd: totals.iboUsd, iqd: totals.iboIqd },
          { label: allocationLabel('rasty'), usd: totals.rastyUsd, iqd: totals.rastyIqd },
          { label: allocationLabel('expenses'), usd: totals.expensesUsd, iqd: totals.expensesIqd },
          { label: 'خەرجکراو لەم ماوەیە', usd: totals.spentUsd, iqd: totals.spentIqd },
          { label: 'پێشەکی وەرگیراو لەم ماوەیە', usd: prepaid.totalUsd, iqd: prepaid.totalIqd },
          { label: `پێشەکی — ${allocationLabel('ibo')}`, usd: prepaid.iboUsd, iqd: prepaid.iboIqd },
          { label: `پێشەکی — ${allocationLabel('rasty')}`, usd: prepaid.rastyUsd, iqd: prepaid.rastyIqd },
          { label: 'کۆی نرخی گشتی فرۆشتن', usd: deal.priceUsd, iqd: deal.priceIqd },
          { label: 'کۆی وەرگیراوی گشتی', usd: deal.receivedUsd, iqd: deal.receivedIqd },
          { label: 'ماوەی گشتی', usd: deal.remainingUsd, iqd: deal.remainingIqd },
        ],
      },
      {
        name: 'کۆی کلینیکەکان',
        columns: [
          { key: 'name',  header: 'دکتۆر/کلینیک' },
          { key: 'city',  header: 'شار' },
          { key: 'phone', header: 'مۆبایل' },
          { key: 'usd',   header: 'کۆ — دۆلار', type: 'money', tone: 'pos', strong: true, total: true },
          { key: 'iqd',   header: 'کۆ — دینار', type: 'iqd', tone: 'pos', strong: true, total: true },
          { key: 'count', header: 'قیست', type: 'int', total: true },
          { key: 'iboUsd',   header: `${allocationLabel('ibo')} — دۆلار`, type: 'money', total: true },
          { key: 'iboIqd',   header: `${allocationLabel('ibo')} — دینار`, type: 'iqd', total: true },
          { key: 'rastyUsd', header: `${allocationLabel('rasty')} — دۆلار`, type: 'money', total: true },
          { key: 'rastyIqd', header: `${allocationLabel('rasty')} — دینار`, type: 'iqd', total: true },
          { key: 'expensesUsd', header: `${allocationLabel('expenses')} — دۆلار`, type: 'money', total: true },
          { key: 'expensesIqd', header: `${allocationLabel('expenses')} — دینار`, type: 'iqd', total: true },
          { key: 'last',  header: 'دوا قیست' },
        ],
        rows: rows.map((r) => ({
          name: r.name, city: cityLabel(r.city), phone: r.phone ?? '',
          usd: r.usd, iqd: r.iqd, count: r.count,
          iboUsd: r.iboUsd, iboIqd: r.iboIqd,
          rastyUsd: r.rastyUsd, rastyIqd: r.rastyIqd,
          expensesUsd: r.expensesUsd, expensesIqd: r.expensesIqd,
          last: r.last ? dateFmt(r.last) : '—',
        })),
      },
      {
        name: 'قیستەکان',
        columns: [
          { key: 'date',    header: 'بەروار' },
          { key: 'client',  header: 'دکتۆر/کلینیک' },
          { key: 'city',    header: 'شار' },
          { key: 'invoice', header: 'ژمارەی پسوڵە' },
          { key: 'usd',     header: 'دۆلار', type: 'money', tone: 'pos', total: true },
          { key: 'iqd',     header: 'دینار', type: 'iqd', tone: 'pos', total: true },
          { key: 'alloc',   header: 'درا بە' },
          { key: 'by',      header: 'تۆمارکەر' },
          { key: 'note',    header: 'تێبینی', width: 30 },
        ],
        rows: scoped.map((p) => ({
          date: dateFmt(p.date),
          client: p.clients?.name ?? '',
          city: cityLabel(p.clients?.city),
          invoice: p.invoice_no ?? '',
          usd: p.currency === 'usd' ? Number(p.amount) : 0,
          iqd: p.currency === 'iqd' ? Number(p.amount) : 0,
          alloc: allocationLabel(p.allocation),
          by: p.profiles?.full_name || p.profiles?.email || '',
          note: p.note ?? '',
        })),
      },
      {
        name: 'خەرجییەکان',
        columns: [
          { key: 'date',  header: 'بەروار' },
          { key: 'cat',   header: 'جۆر' },
          { key: 'who',   header: 'کارمەند' },
          { key: 'usd',   header: 'دۆلار', type: 'money', tone: 'neg', total: true },
          { key: 'iqd',   header: 'دینار', type: 'iqd', tone: 'neg', total: true },
          { key: 'by',    header: 'تۆمارکەر' },
          { key: 'note',  header: 'تێبینی', width: 30 },
        ],
        rows: scopedExpenses.map((e) => ({
          date: dateFmt(e.date),
          cat: e.category,
          who: e.employee ?? '',
          usd: e.currency === 'usd' ? Number(e.amount) : 0,
          iqd: e.currency === 'iqd' ? Number(e.amount) : 0,
          by: e.profiles?.full_name || e.profiles?.email || '',
          note: e.note ?? '',
        })),
      },
    ],
  })

  return (
    <div className="space-y-6">
      <Filters>
        <TextField select size="small" label="مانگ" value={month}
          onChange={(e) => setMonth(e.target.value)} sx={{ minWidth: 185 }}>
          <MenuItem value="all">هەموو کاتەکان</MenuItem>
          {months.map((m) => <MenuItem key={m} value={m}>{monthLabel(m)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="شار" value={city}
          onChange={(e) => setCity(e.target.value)} sx={{ minWidth: 165 }}>
          <MenuItem value="all">هەموو شارەکان</MenuItem>
          {CITIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="دکتۆر/کلینیک" value={clientId}
          onChange={(e) => setClientId(e.target.value)} sx={{ minWidth: 210 }}>
          <MenuItem value="all">هەموویان</MenuItem>
          {clientOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <div className="ms-auto">
          <ExportButton onExport={exportXlsx} disabled={loading} />
        </div>
      </Filters>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={`وەرگیراو — دۆلار`} value={usd(totals.monthUsd)} tone="pos"
          hint={`${totals.clinics} کلینیک · ${scoped.length} قیست`} />
        <Stat label={`وەرگیراو — دینار`} value={iqd(totals.monthIqd)} tone="pos"
          hint={scopeLabel} />
        <Stat label={`${allocationLabel('ibo')} + ${allocationLabel('rasty')}`}
          value={usd(totals.iboUsd + totals.rastyUsd)} tone="accent"
          second={iqd(totals.iboIqd + totals.rastyIqd)} />
        <Stat label={allocationLabel('expenses')} value={usd(totals.expensesUsd)}
          second={iqd(totals.expensesIqd)}
          hint={`خەرجکراو ${usd(totals.spentUsd)}`} />
      </div>

      <Panel title="دابەشکردنی پارەی وەرگیراو" description={scopeLabel}>
        {totals.monthUsd === 0 && totals.monthIqd === 0 ? (
          <p className="py-6 text-center text-[0.9rem] text-faint">
            هیچ قیستێک لەم ماوەیەدا نییە.
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {[
              ['usd', 'دۆلار', totals.monthUsd, totals.iboUsd, totals.rastyUsd, totals.expensesUsd, usd],
              ['iqd', 'دینار', totals.monthIqd, totals.iboIqd, totals.rastyIqd, totals.expensesIqd, iqd],
            ].map(([cur, label, month, ibo, rasty, exp, fmt]) => (
              <div key={cur}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="text-[0.9rem] font-semibold">{label}</h3>
                  <span className="num text-[0.9rem] font-semibold">{fmt(month)}</span>
                </div>

                {month === 0 ? (
                  <p className="text-[0.85rem] text-faint">هیچ قیستێک بەم دراوە نییە.</p>
                ) : (
                  <>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-accent-100">
                      <span className={ALLOCATION_COLORS.ibo} style={{ width: `${share(ibo, cur)}%` }} />
                      <span className={ALLOCATION_COLORS.rasty} style={{ width: `${share(rasty, cur)}%` }} />
                      <span className={ALLOCATION_COLORS.expenses} style={{ width: `${share(exp, cur)}%` }} />
                    </div>
                    <ul className="mt-4 space-y-2">
                      {[
                        ['ibo', ALLOCATION_COLORS.ibo, ibo],
                        ['rasty', ALLOCATION_COLORS.rasty, rasty],
                        ['expenses', ALLOCATION_COLORS.expenses, exp],
                      ].map(([key, dot, value]) => (
                        <li key={key} className="flex items-center gap-2.5">
                          <span className={`size-2.5 shrink-0 rounded-full ${dot}`} />
                          <span className="text-[0.85rem] text-muted">{allocationLabel(key)}</span>
                          <span className="num ms-auto text-[0.9rem] font-semibold">{fmt(value)}</span>
                          <span className="num w-10 text-end text-[0.78rem] text-faint">
                            {share(value, cur)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="پێشەکی وەرگیراو" description={`${scopeLabel} · لە کاتی فرۆشتن`}>
        {prepaid.totalUsd === 0 && prepaid.totalIqd === 0 ? (
          <p className="py-6 text-center text-[0.9rem] text-faint">
            هیچ پێشەکییەک لەم ماوەیەدا وەرنەگیراوە.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="کۆی پێشەکی" value={usd(prepaid.totalUsd)} tone="pos"
              second={iqd(prepaid.totalIqd)}
              hint={`${prepaid.count} کڕین`} />
            <Stat label={allocationLabel('ibo')} value={usd(prepaid.iboUsd)}
              second={iqd(prepaid.iboIqd)} />
            <Stat label={allocationLabel('rasty')} value={usd(prepaid.rastyUsd)}
              second={iqd(prepaid.rastyIqd)} />
          </div>
        )}
      </Panel>

      <Panel title="وێنەی گشتی فرۆشتن" description="هەموو کاتەکان، بێ پاڵاوتن">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="ئامێری فرۆشراو" value={String(deal.devices)} tone="accent" />
          <Stat label="کۆی نرخ" value={usd(deal.priceUsd)} second={iqd(deal.priceIqd)} />
          <Stat label="وەرگیراو" value={usd(deal.receivedUsd)} tone="pos"
            second={iqd(deal.receivedIqd)} />
          <Stat label="ماوە" value={usd(deal.remainingUsd)} tone="neg"
            second={iqd(deal.remainingIqd)} />
        </div>
      </Panel>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="head text-[1.05rem] font-semibold">کۆی هەر کلینیکێک</h2>
          <p className="text-[0.8rem] text-faint">
            {scopeLabel} · کلیک لەسەر کارتێک بۆ پاڵاوتنی ئەو کلینیکە
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-line bg-surface" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Panel>
            <div className="py-12 text-center">
              <p className="font-medium">هیچ قیستێک لەم ماوەیەدا نییە</p>
              <p className="mt-1 text-[0.85rem] text-muted">ماوە یان پاڵاوتنەکان بگۆڕە.</p>
            </div>
          </Panel>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.slice(0, shown).map((r) => (
                <MonthlyClinicCard
                  key={r.id}
                  row={r}
                  active={clientId === r.id}
                  onSelect={setClientId}
                />
              ))}
            </div>

            {shown < rows.length && (
              <div className="pt-1 text-center">
                <Button variant="outlined" color="inherit" onClick={() => setShown((n) => n + PAGE)}>
                  پیشاندانی زیاتر ({rows.length - shown})
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <p className="text-[0.85rem] text-muted">
        کۆی گشتی هەموو کاتەکان:{' '}
        <span className="num font-semibold text-ink">{usd(totals.allUsd)}</span>
        {totals.allIqd > 0 && <> · <span className="num font-semibold text-ink">{iqd(totals.allIqd)}</span></>}
      </p>
    </div>
  )
}
