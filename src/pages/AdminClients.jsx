import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, MenuItem, TextField } from '@mui/material'
import { supabase } from '../lib/supabase'
import { CITIES, cityLabel, specialityLabel, saleDeviceLabel } from '../lib/constants'
import { usd, iqd, dateFmt } from '../lib/format'
import { exportWorkbook } from '../lib/exportExcel'
import Stat from '../components/Stat.jsx'
import Panel from '../components/Panel.jsx'
import Filters from '../components/Filters.jsx'
import ExportButton from '../components/ExportButton.jsx'
import ClientDialog from '../components/ClientDialog.jsx'
import ClinicCard from '../components/ClinicCard.jsx'
import { IconSearch } from '../components/icons.jsx'

const SORTS = [
  { value: 'remaining', label: 'زۆرترین ماوە' },
  { value: 'name',      label: 'ناو' },
  { value: 'recent',    label: 'دوا قیست' },
  { value: 'devices',   label: 'زۆرترین ئامێر' },
]

const PAGE = 12

export default function AdminClients() {
  const [rows, setRows] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('remaining')
  const [term, setTerm] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [dialog, setDialog] = useState({ open: false, client: null })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: s }] = await Promise.all([
      supabase.from('client_balances').select('*'),
      supabase.from('sale_balances').select('client_id, devices, device_qty, gift_devices, device_count'),
    ])
    setRows(data ?? [])
    setSales(s ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setShown(PAGE) }, [city, status, term, sort])

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (city !== 'all' && r.city !== city) return false
      const settled = Number(r.remaining_usd) <= 0 && Number(r.remaining_iqd) <= 0
      if (status === 'owing' && settled) return false
      if (status === 'settled' && !settled) return false
      if (q && !`${r.name} ${r.phone ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })

    // dinars are compared on a rough scale only to order the list; no
    // conversion is ever shown or stored
    const weight = (r) => Number(r.remaining_usd) + Number(r.remaining_iqd) / 1000
    const by = {
      remaining: (a, b) => weight(b) - weight(a),
      name: (a, b) => a.name.localeCompare(b.name),
      devices: (a, b) => Number(b.device_count) - Number(a.device_count),
      recent: (a, b) => String(b.last_payment_date ?? '').localeCompare(String(a.last_payment_date ?? '')),
    }
    return [...list].sort(by[sort] ?? by.remaining)
  }, [rows, city, status, term, sort])

  const sum = (key) => filtered.reduce((t, r) => t + Number(r[key]), 0)
  const totals = useMemo(() => ({
    priceUsd: sum('total_price_usd'), priceIqd: sum('total_price_iqd'),
    receivedUsd: sum('received_usd'), receivedIqd: sum('received_iqd'),
    remainingUsd: sum('remaining_usd'), remainingIqd: sum('remaining_iqd'),
    devices: sum('device_count'),
    owing: filtered.filter((r) => Number(r.remaining_usd) > 0 || Number(r.remaining_iqd) > 0).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [filtered])

  // every model a clinic holds, gifts marked, on one line
  const devicesOf = useMemo(() => {
    const m = new Map()
    for (const sale of sales) {
      const line = saleDeviceLabel(sale)
      m.set(sale.client_id, m.has(sale.client_id) ? `${m.get(sale.client_id)}، ${line}` : line)
    }
    return m
  }, [sales])

  const scope = [
    city === 'all' ? 'هەموو شارەکان' : cityLabel(city),
    status === 'owing' ? 'تەنیا قەرزدار' : status === 'settled' ? 'تەنیا تەواوکراو' : null,
  ].filter(Boolean).join('  ·  ')

  const exportXlsx = () => exportWorkbook({
    fileName: 'epilyum-clinics',
    title: 'کلینیکەکان و دۆخی حساب',
    subtitle: scope,
    sheets: [{
      name: 'کلینیکەکان',
      columns: [
        { key: 'name',       header: 'دکتۆر/کلینیک' },
        { key: 'city',       header: 'شار' },
        { key: 'phone',      header: 'مۆبایل' },
        { key: 'speciality', header: 'پسپۆڕی' },
        { key: 'deviceList', header: 'ئامێرەکان', width: 40 },
        { key: 'devices',    header: 'دانە', type: 'int', total: true },
        { key: 'sales',      header: 'کڕین', type: 'int', total: true },
        { key: 'priceUsd',     header: 'کۆی نرخ — دۆلار', type: 'money', total: true },
        { key: 'priceIqd',     header: 'کۆی نرخ — دینار', type: 'iqd', total: true },
        { key: 'receivedUsd',  header: 'وەرگیراو — دۆلار', type: 'money', tone: 'pos', total: true },
        { key: 'receivedIqd',  header: 'وەرگیراو — دینار', type: 'iqd', tone: 'pos', total: true },
        { key: 'remainingUsd', header: 'ماوە — دۆلار', type: 'money', tone: 'neg', strong: true, total: true },
        { key: 'remainingIqd', header: 'ماوە — دینار', type: 'iqd', tone: 'neg', strong: true, total: true },
        { key: 'last',       header: 'دوا قیست' },
      ],
      rows: filtered.map((r) => ({
        name: r.name,
        city: cityLabel(r.city),
        phone: r.phone ?? '',
        speciality: specialityLabel(r.speciality) ?? '',
        deviceList: devicesOf.get(r.id) ?? '—',
        devices: Number(r.device_count),
        sales: Number(r.sale_count),
        priceUsd: Number(r.total_price_usd),
        priceIqd: Number(r.total_price_iqd),
        receivedUsd: Number(r.received_usd),
        receivedIqd: Number(r.received_iqd),
        remainingUsd: Number(r.remaining_usd),
        remainingIqd: Number(r.remaining_iqd),
        last: r.last_payment_date ? dateFmt(r.last_payment_date) : '—',
      })),
    }],
  })

  const visible = filtered.slice(0, shown)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="ماوە — دۆلار" value={usd(totals.remainingUsd)} tone="neg"
          hint={`کۆی نرخ ${usd(totals.priceUsd)} · وەرگیراو ${usd(totals.receivedUsd)}`} />
        <Stat label="ماوە — دینار" value={iqd(totals.remainingIqd)} tone="neg"
          hint={`کۆی نرخ ${iqd(totals.priceIqd)} · وەرگیراو ${iqd(totals.receivedIqd)}`} />
        <Stat label="کلینیکی قەرزدار" value={String(totals.owing)}
          hint={`لە ${filtered.length} کلینیک`} />
        <Stat label="ژمارەی ئامێر" value={String(totals.devices)} tone="accent" />
      </div>

      <Filters>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-faint">
            <IconSearch />
          </span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="گەڕان بە ناو یان مۆبایل"
            aria-label="گەڕان"
            className="w-60 rounded-lg border border-line bg-surface py-2.5 pe-10 ps-3 text-[0.9rem] outline-none transition-colors focus:border-brand-600"
          />
        </div>

        <TextField select size="small" label="شار" value={city}
          onChange={(e) => setCity(e.target.value)} sx={{ minWidth: 155 }}>
          <MenuItem value="all">هەموو شارەکان</MenuItem>
          {CITIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
        </TextField>

        <TextField select size="small" label="دۆخ" value={status}
          onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 135 }}>
          <MenuItem value="all">هەموو</MenuItem>
          <MenuItem value="owing">قەرزدار</MenuItem>
          <MenuItem value="settled">تەواوکراو</MenuItem>
        </TextField>

        <TextField select size="small" label="ڕیزکردن" value={sort}
          onChange={(e) => setSort(e.target.value)} sx={{ minWidth: 155 }}>
          {SORTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </TextField>

        <div className="ms-auto flex items-center gap-2">
          <ExportButton onExport={exportXlsx} disabled={loading || filtered.length === 0} />
          <Button variant="contained" onClick={() => setDialog({ open: true, client: null })}>
            کلینیکی نوێ
          </Button>
        </div>
      </Filters>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="head text-[1.05rem] font-semibold">لیستی کلینیکەکان</h2>
          <p className="text-[0.8rem] text-faint">
            کلیک لەسەر کارتێک بۆ دەستکاری و بینینی قیستەکان
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Panel>
            <div className="py-12 text-center">
              <p className="font-medium">هیچ کلینیکێک نەدۆزرایەوە</p>
              <p className="mt-1 text-[0.85rem] text-muted">
                پاڵاوتنەکان بگۆڕە، یان کلینیکێکی نوێ زیاد بکە.
              </p>
            </div>
          </Panel>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {visible.map((r) => (
                <ClinicCard key={r.id} row={r}
                  onOpen={(client) => setDialog({ open: true, client })} />
              ))}
            </div>

            {shown < filtered.length && (
              <div className="pt-1 text-center">
                <Button variant="outlined" color="inherit" onClick={() => setShown((n) => n + PAGE)}>
                  پیشاندانی زیاتر ({filtered.length - shown})
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <ClientDialog
        open={dialog.open}
        client={dialog.client}
        onClose={() => setDialog({ open: false, client: null })}
        onSaved={load}
      />
    </div>
  )
}
