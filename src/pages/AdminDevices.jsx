import { useEffect, useMemo, useState } from 'react'
import { Button, MenuItem, TextField } from '@mui/material'
import { supabase } from '../lib/supabase'
import { CITIES, DEVICES, allocationLabel, cityLabel, saleDevices, saleUnits } from '../lib/constants'
import { usd, iqd, dateFmt } from '../lib/format'
import { exportWorkbook } from '../lib/exportExcel'
import Stat from '../components/Stat.jsx'
import Panel from '../components/Panel.jsx'
import Filters from '../components/Filters.jsx'
import ExportButton from '../components/ExportButton.jsx'
import Money from '../components/Money.jsx'
import PurchaseCard from '../components/PurchaseCard.jsx'

const PAGE = 8

export default function AdminDevices() {
  const [sales, setSales] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('all')
  const [device, setDevice] = useState('all')
  const [clientId, setClientId] = useState('all')
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    let active = true
    ;(async () => {
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from('sale_balances').select('*').order('sale_date', { ascending: false }),
        supabase.from('clients').select('id, name, city, phone'),
      ])
      if (!active) return
      setSales(s ?? [])
      setClients(c ?? [])
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const byId = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  // only clinics that actually bought something, narrowed by the city filter
  const clientOptions = useMemo(() => {
    const seen = new Map()
    for (const s of sales) {
      const c = byId.get(s.client_id)
      if (!c) continue
      if (city !== 'all' && c.city !== city) continue
      seen.set(c.id, c.name)
    }
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [sales, byId, city])

  // a clinic picked under one city must not stay selected under another
  useEffect(() => {
    if (clientId !== 'all' && !clientOptions.some((c) => c.id === clientId)) setClientId('all')
  }, [clientOptions, clientId])

  // a narrower filter yields a shorter list; start it from the top again
  useEffect(() => { setShown(PAGE) }, [city, device, clientId])

  const rows = useMemo(() => sales
    .map((s) => ({ ...s, client: byId.get(s.client_id) }))
    .filter((s) => {
      if (city !== 'all' && s.client?.city !== city) return false
      if (clientId !== 'all' && s.client_id !== clientId) return false
      if (device !== 'all' && !(s.devices ?? []).includes(device)) return false
      return true
    }), [sales, byId, city, device, clientId])

  const totals = useMemo(() => {
    const by = (field, cur) => rows
      .filter((s) => s.currency === cur)
      .reduce((t, s) => t + Number(s[field]), 0)
    return {
      devices: rows.reduce((t, s) => t + saleUnits(s).paid, 0),
      gifts: rows.reduce((t, s) => t + saleUnits(s).gift, 0),
      priceUsd: by('total_price', 'usd'), priceIqd: by('total_price', 'iqd'),
      receivedUsd: by('received', 'usd'), receivedIqd: by('received', 'iqd'),
      remainingUsd: by('remaining', 'usd'), remainingIqd: by('remaining', 'iqd'),
    }
  }, [rows])

  const perDevice = useMemo(() => {
    const units = new Map()
    const value = new Map()
    const valueIqd = new Map()
    const gifts = new Map()
    for (const s of rows) {
      const items = saleDevices(s)
      // the price covers the paid models only; gifts take no share of it
      const paidUnits = items.filter((i) => !i.gift).reduce((t, i) => t + i.qty, 0) || 1
      const bucket = s.currency === 'iqd' ? valueIqd : value
      for (const { device: d, qty, gift } of items) {
        if (gift) {
          gifts.set(d, (gifts.get(d) ?? 0) + qty)
        } else {
          units.set(d, (units.get(d) ?? 0) + qty)
          bucket.set(d, (bucket.get(d) ?? 0) + (Number(s.total_price) * qty) / paidUnits)
        }
      }
    }
    return DEVICES
      .map((d) => ({
        device: d,
        units: units.get(d) ?? 0,
        gifts: gifts.get(d) ?? 0,
        valueUsd: value.get(d) ?? 0,
        valueIqd: valueIqd.get(d) ?? 0,
      }))
      .filter((x) => x.units > 0 || x.gifts > 0)
      .sort((a, b) => (b.units + b.gifts) - (a.units + a.gifts))
  }, [rows])

  const maxUnits = Math.max(1, ...perDevice.map((d) => d.units + d.gifts))

  const scope = [
    city === 'all' ? 'هەموو شارەکان' : cityLabel(city),
    clientId === 'all' ? null : clientOptions.find((c) => c.id === clientId)?.name,
    device === 'all' ? 'هەموو ئامێرەکان' : device,
  ].filter(Boolean).join('  ·  ')

  const exportXlsx = () => exportWorkbook({
    fileName: 'epilyum-devices',
    title: 'ئامێری فرۆشراو و دۆخی پارەدان',
    subtitle: scope,
    sheets: [
      {
        name: 'کڕینەکان',
        columns: [
          { key: 'client',    header: 'دکتۆر/کلینیک' },
          { key: 'city',      header: 'شار' },
          { key: 'devices',   header: 'ئامێرەکان', width: 38 },
          { key: 'count',     header: 'دانەی فرۆشراو', type: 'int', total: true },
          { key: 'gifts',     header: 'دیاری', type: 'int', total: true },
          { key: 'date',      header: 'بەروار' },
          { key: 'cur',       header: 'دراو' },
          { key: 'priceUsd',     header: 'نرخ — دۆلار', type: 'money', total: true },
          { key: 'priceIqd',     header: 'نرخ — دینار', type: 'iqd', total: true },
          { key: 'prepaidUsd',   header: 'پێشەکی — دۆلار', type: 'money', total: true },
          { key: 'prepaidIqd',   header: 'پێشەکی — دینار', type: 'iqd', total: true },
          { key: 'prepaidTo',    header: 'پێشەکی درا بە' },
          { key: 'remainingUsd', header: 'ماوە — دۆلار', type: 'money', tone: 'neg', strong: true, total: true },
          { key: 'remainingIqd', header: 'ماوە — دینار', type: 'iqd', tone: 'neg', strong: true, total: true },
        ],
        rows: rows.map((s) => ({
          client: s.client?.name ?? '—',
          city: cityLabel(s.client?.city),
          devices: saleDeviceLabel(s),
          count: saleUnits(s).paid,
          gifts: saleUnits(s).gift,
          date: dateFmt(s.sale_date),
          cur: currencyLabel(s.currency),
          priceUsd: s.currency === 'usd' ? Number(s.total_price) : 0,
          priceIqd: s.currency === 'iqd' ? Number(s.total_price) : 0,
          prepaidUsd: s.currency === 'usd' ? Number(s.prepaid) : 0,
          prepaidIqd: s.currency === 'iqd' ? Number(s.prepaid) : 0,
          prepaidTo: s.prepaid_allocation ? allocationLabel(s.prepaid_allocation) : '',
          remainingUsd: s.currency === 'usd' ? Number(s.remaining) : 0,
          remainingIqd: s.currency === 'iqd' ? Number(s.remaining) : 0,
        })),
      },
      {
        name: 'ئامێر بە وردی',
        note: 'هەر ئامێرێک هێڵی خۆی — دیارییەکان بە نرخی سفر',
        columns: [
          { key: 'client', header: 'دکتۆر/کلینیک' },
          { key: 'city',   header: 'شار' },
          { key: 'date',   header: 'بەروار' },
          { key: 'device', header: 'ئامێر', width: 30 },
          { key: 'qty',    header: 'دانە', type: 'int', total: true },
          { key: 'kind',   header: 'جۆر', tone: (r) => (r.kind === 'دیاری' ? 'pos' : undefined) },
          { key: 'priceUsd', header: 'نرخ — دۆلار', type: 'money', total: true },
          { key: 'priceIqd', header: 'نرخ — دینار', type: 'iqd', total: true },
        ],
        rows: rows.flatMap((sale) => {
          const items = saleDevices(sale)
          // the price covers the paid models only, split by unit share
          const paidUnits = items.filter((i) => !i.gift).reduce((t, i) => t + i.qty, 0) || 1
          return items.map(({ device: d, qty, gift }) => {
            const share = gift ? 0 : (Number(sale.total_price) * qty) / paidUnits
            return {
              client: sale.client?.name ?? '—',
              city: cityLabel(sale.client?.city),
              date: dateFmt(sale.sale_date),
              device: d,
              qty,
              kind: gift ? 'دیاری' : 'فرۆشراو',
              priceUsd: sale.currency === 'usd' ? share : 0,
              priceIqd: sale.currency === 'iqd' ? share : 0,
            }
          })
        }),
      },
      {
        name: 'کۆی ئامێرەکان',
        note: 'ژمارەی دانەی فرۆشراو لە هەر مۆدێلێک',
        columns: [
          { key: 'device', header: 'ئامێر', width: 34 },
          { key: 'units',  header: 'دانەی فرۆشراو', type: 'int', strong: true, total: true },
          { key: 'gifts',  header: 'دیاری', type: 'int', tone: 'pos', total: true },
          { key: 'valueUsd', header: 'بەها — دۆلار', type: 'money', total: true },
          { key: 'valueIqd', header: 'بەها — دینار', type: 'iqd', total: true },
        ],
        rows: perDevice.map((d) => ({
          device: d.device, units: d.units, gifts: d.gifts,
          valueUsd: d.valueUsd, valueIqd: d.valueIqd,
        })),
      },
    ],
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="ئامێری فرۆشراو" value={String(totals.devices)} tone="accent"
          hint={`${rows.length} کڕین${totals.gifts > 0 ? ` · ${totals.gifts} دیاری` : ''}`} />
        <Stat label="ماوە — دۆلار" value={usd(totals.remainingUsd)} tone="neg"
          hint={`کۆی نرخ ${usd(totals.priceUsd)} · وەرگیراو ${usd(totals.receivedUsd)}`} />
        <Stat label="ماوە — دینار" value={iqd(totals.remainingIqd)} tone="neg"
          hint={`کۆی نرخ ${iqd(totals.priceIqd)} · وەرگیراو ${iqd(totals.receivedIqd)}`} />
        <Stat label="دیاری دراو" value={String(totals.gifts)} tone="pos"
          hint="UPS و Hydra" />
      </div>

      <Filters>
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
        <TextField select size="small" label="ئامێر" value={device}
          onChange={(e) => setDevice(e.target.value)} sx={{ minWidth: 225 }}>
          <MenuItem value="all">هەموو ئامێرەکان</MenuItem>
          {DEVICES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <div className="ms-auto">
          <ExportButton onExport={exportXlsx} disabled={loading || rows.length === 0} />
        </div>
      </Filters>

      {perDevice.length > 0 && (
        <Panel title="بەپێی ئامێر" description="ژمارەی دانەی فرۆشراو، و بە سەوز ئەوانەی دیاری دراون">
          <ul className="space-y-3">
            {perDevice.map(({ device: d, units, gifts, valueUsd, valueIqd }) => (
              <li key={d} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
                <span className="truncate text-[0.9rem]">{d}</span>
                <span className="num text-[0.9rem] font-semibold">
                  {units}
                  {gifts > 0 && <span className="text-pos"> +{gifts}</span>}
                </span>
                <span className="col-span-2 flex items-center gap-3">
                  <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-accent-100">
                    <span className="block h-full bg-brand-600"
                      style={{ width: `${(units / maxUnits) * 100}%` }} />
                    <span className="block h-full bg-pos"
                      style={{ width: `${(gifts / maxUnits) * 100}%` }} />
                  </span>
                  <Money usd={valueUsd} iqd={valueIqd} className="shrink-0 text-[0.75rem] text-faint" />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="head text-[1.05rem] font-semibold">کڕینەکان</h2>
          <p className="text-[0.8rem] text-faint">
            <span className="num">{rows.length}</span> کڕین · نوێترین لە سەرەوە
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Panel>
            <div className="py-12 text-center">
              <p className="font-medium">هێشتا هیچ فرۆشتنێک تۆمار نەکراوە</p>
              <p className="mt-1 text-[0.85rem] text-muted">پاڵاوتنەکان بگۆڕە، یان کڕینێک زیاد بکە.</p>
            </div>
          </Panel>
        ) : (
          <>
            <div className="grid gap-3 xl:grid-cols-2">
              {rows.slice(0, shown).map((s) => <PurchaseCard key={s.id} sale={s} />)}
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
    </div>
  )
}
