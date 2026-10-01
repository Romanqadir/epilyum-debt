import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Autocomplete, Button, MenuItem, TextField } from '@mui/material'
import { supabase } from '../lib/supabase'
import { EXPENSE_CATEGORIES, COMMISSION_CATEGORY, EMPLOYEES } from '../lib/constants'
import { money, usd, iqd, dateFmt, monthKey, monthLabel, thisMonth, todayISO, num } from '../lib/format'
import { exportWorkbook } from '../lib/exportExcel'
import Stat from './Stat.jsx'
import Panel from './Panel.jsx'
import Filters from './Filters.jsx'
import ExportButton from './ExportButton.jsx'
import MoneyField from './MoneyField.jsx'
import CurrencyToggle from './CurrencyToggle.jsx'

/**
 * The expenses pot: money reps routed to "خەرجی" when collecting an
 * instalment, minus everything spent from it. Dollars and dinars are kept
 * in separate pots — nothing is converted between them.
 *
 * Recording a spend is the rep's job, so the admin gets the same panel with
 * `canAdd` off: every figure, every filter and every export, but no form.
 */
export default function ExpensesPanel({ showCommissions = false, canAdd = true }) {
  const [fund, setFund] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(thisMonth())
  const [employee, setEmployee] = useState('all')
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: f }, { data: e }] = await Promise.all([
      supabase.from('expense_fund').select('*'),
      supabase.from('expenses').select('*, profiles(full_name, email)').order('date', { ascending: false }).limit(1000),
    ])
    setFund(f ?? [])
    setRows(e ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pot = (cur) => fund.find((f) => f.currency === cur) ?? { fund_in: 0, spent: 0, remaining: 0 }
  const potUsd = pot('usd')
  const potIqd = pot('iqd')

  const months = useMemo(() => {
    const keys = new Set([...rows.map((r) => monthKey(r.date)), thisMonth()])
    return [...keys].filter(Boolean).sort().reverse()
  }, [rows])

  // Everyone who has ever been paid a نسبە, so the picker stays stable while
  // the month changes underneath it.
  const commissionPeople = useMemo(() => {
    const s = new Set(
      rows.filter((r) => r.category === COMMISSION_CATEGORY && r.employee).map((r) => r.employee)
    )
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [rows])

  /**
   * Picking an employee narrows the whole page to that person's نسبە — the
   * totals, the breakdowns and both exports — so "Zhinar" means Zhinar
   * everywhere rather than in one panel while the rest stays global. The two
   * pot tiles are deliberately left out: the fund belongs to nobody.
   */
  const visible = useMemo(() => {
    const byMonth = month === 'all' ? rows : rows.filter((r) => monthKey(r.date) === month)
    if (employee === 'all') return byMonth
    return byMonth.filter((r) => r.category === COMMISSION_CATEGORY && r.employee === employee)
  }, [rows, month, employee])
  const spentUsd = visible.filter((r) => r.currency === 'usd').reduce((t, r) => t + Number(r.amount), 0)
  const spentIqd = visible.filter((r) => r.currency === 'iqd').reduce((t, r) => t + Number(r.amount), 0)

  // what the money went on, biggest first, per currency
  const byCategory = useMemo(() => {
    const m = new Map()
    for (const r of visible) {
      const k = r.category
      const e = m.get(k) ?? { category: k, usd: 0, iqd: 0 }
      e[r.currency] += Number(r.amount)
      m.set(k, e)
    }
    return [...m.values()].sort((a, b) => (b.usd + b.iqd / 1000) - (a.usd + a.iqd / 1000))
  }, [visible])

  // نسبە, gathered per person — how many and how much each one was paid
  const commissions = useMemo(() => {
    const m = new Map()
    for (const r of visible) {
      if (r.category !== COMMISSION_CATEGORY) continue
      const who = r.employee || '—'
      const e = m.get(who) ?? { employee: who, count: 0, usd: 0, iqd: 0 }
      e.count += 1
      e[r.currency] += Number(r.amount)
      m.set(who, e)
    }
    return [...m.values()].sort((a, b) => (b.usd + b.iqd / 1000) - (a.usd + a.iqd / 1000))
  }, [visible])

  const commissionRows = useMemo(
    () => visible.filter((r) => r.category === COMMISSION_CATEGORY),
    [visible]
  )

  const monthScope = month === 'all' ? 'هەموو کاتەکان' : monthLabel(month)
  const scopeLabel = employee === 'all' ? monthScope : `${employee} — ${monthScope}`
  const fileScope = `${employee === 'all' ? '' : `${employee.toLowerCase().replace(/\s+/g, '-')}-`}${month === 'all' ? 'all' : month}`

  const exportXlsx = () => exportWorkbook({
    fileName: `epilyum-expenses-${fileScope}`,
    title: `خەرجییەکان — ${scopeLabel}`,
    subtitle: `ماوە لە سندوق: ${usd(potUsd.remaining)}  ·  ${iqd(potIqd.remaining)}`,
    sheets: [
      {
        name: 'خەرجییەکان',
        columns: [
          { key: 'date', header: 'بەروار' },
          { key: 'cat',  header: 'جۆر' },
          { key: 'who',  header: 'کارمەند' },
          { key: 'usd',  header: 'دۆلار', type: 'money', tone: 'neg', total: true },
          { key: 'iqd',  header: 'دینار', type: 'iqd', tone: 'neg', total: true },
          { key: 'by',   header: 'تۆمارکەر' },
          { key: 'note', header: 'تێبینی', width: 34 },
        ],
        rows: visible.map((r) => ({
          date: dateFmt(r.date),
          cat: r.category,
          who: r.employee ?? '',
          usd: r.currency === 'usd' ? Number(r.amount) : 0,
          iqd: r.currency === 'iqd' ? Number(r.amount) : 0,
          by: r.profiles?.full_name || r.profiles?.email || '',
          note: r.note ?? '',
        })),
      },
      {
        name: 'بەپێی جۆر',
        columns: [
          { key: 'cat', header: 'جۆر', width: 32 },
          { key: 'usd', header: 'دۆلار', type: 'money', tone: 'neg', strong: true, total: true },
          { key: 'iqd', header: 'دینار', type: 'iqd', tone: 'neg', strong: true, total: true },
        ],
        rows: byCategory.map((c) => ({ cat: c.category, usd: c.usd, iqd: c.iqd })),
      },
      {
        name: 'سندوق',
        columns: [
          { key: 'label', header: 'ڕیزبەندی', width: 26 },
          { key: 'usd',   header: 'دۆلار', type: 'money', strong: true },
          { key: 'iqd',   header: 'دینار', type: 'iqd', strong: true },
        ],
        rows: [
          { label: 'هاتووە بۆ سندوق', usd: Number(potUsd.fund_in), iqd: Number(potIqd.fund_in) },
          { label: 'خەرجکراو', usd: Number(potUsd.spent), iqd: Number(potIqd.spent) },
          { label: 'ماوە', usd: Number(potUsd.remaining), iqd: Number(potIqd.remaining) },
        ],
      },
    ],
  })

  const exportCommissions = () => exportWorkbook({
    fileName: `epilyum-commissions-${fileScope}`,
    title: employee === 'all' ? `نسبەی کارمەندان — ${scopeLabel}` : `نسبەی ${employee} — ${monthScope}`,
    subtitle: employee === 'all'
      ? `${commissionRows.length} تۆمار  ·  ${commissions.length} کارمەند`
      : `${commissionRows.length} تۆمار  ·  ${usd(spentUsd)}  ·  ${iqd(spentIqd)}`,
    sheets: [
      {
        name: 'بەپێی کارمەند',
        columns: [
          { key: 'employee', header: 'کارمەند', width: 24 },
          { key: 'count',    header: 'ژمارەی نسبە', type: 'int', strong: true, total: true },
          { key: 'usd',      header: 'دۆلار', type: 'money', tone: 'neg', strong: true, total: true },
          { key: 'iqd',      header: 'دینار', type: 'iqd', tone: 'neg', strong: true, total: true },
        ],
        rows: commissions.map((c) => ({
          employee: c.employee, count: c.count, usd: c.usd, iqd: c.iqd,
        })),
      },
      {
        name: 'نسبەکان',
        columns: [
          { key: 'date',     header: 'بەروار' },
          { key: 'employee', header: 'کارمەند' },
          { key: 'usd',      header: 'دۆلار', type: 'money', tone: 'neg', total: true },
          { key: 'iqd',      header: 'دینار', type: 'iqd', tone: 'neg', total: true },
          { key: 'by',       header: 'تۆمارکەر' },
          { key: 'note',     header: 'تێبینی', width: 34 },
        ],
        rows: commissionRows.map((r) => ({
          date: dateFmt(r.date),
          employee: r.employee ?? '—',
          usd: r.currency === 'usd' ? Number(r.amount) : 0,
          iqd: r.currency === 'iqd' ? Number(r.amount) : 0,
          by: r.profiles?.full_name || r.profiles?.email || '',
          note: r.note ?? '',
        })),
      },
    ],
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="سندوقی خەرجی — دۆلار" value={usd(potUsd.remaining)} tone="pos"
          hint={`هاتوو ${usd(potUsd.fund_in)} · خەرجکراو ${usd(potUsd.spent)}`} />
        <Stat label="سندوقی خەرجی — دینار" value={iqd(potIqd.remaining)} tone="pos"
          hint={`هاتوو ${iqd(potIqd.fund_in)} · خەرجکراو ${iqd(potIqd.spent)}`} />
        <Stat label={`خەرجی ${scopeLabel}`} value={usd(spentUsd)} tone="neg"
          second={iqd(spentIqd)} />
      </div>

      <Filters>
        <TextField select size="small" label="مانگ" value={month}
          onChange={(e) => setMonth(e.target.value)} sx={{ minWidth: 185 }}>
          <MenuItem value="all">هەموو کاتەکان</MenuItem>
          {months.map((m) => <MenuItem key={m} value={m}>{monthLabel(m)}</MenuItem>)}
        </TextField>

        {showCommissions && commissionPeople.length > 0 && (
          <TextField select size="small" label="نسبەی کارمەند" value={employee}
            onChange={(e) => setEmployee(e.target.value)} sx={{ minWidth: 185 }}>
            <MenuItem value="all">هەموو خەرجییەکان</MenuItem>
            {commissionPeople.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        )}

        <div className="ms-auto flex flex-wrap items-center gap-2">
          {showCommissions && (
            <ExportButton onExport={exportCommissions} label="داگرتنی نسبە"
              disabled={loading || commissionRows.length === 0} />
          )}
          <ExportButton onExport={exportXlsx} disabled={loading || visible.length === 0} />
          {canAdd && (
            <Button variant="contained" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'داخستنی فۆڕم' : 'خەرجی نوێ'}
            </Button>
          )}
        </div>
      </Filters>

      {canAdd && showForm && <ExpenseForm onSaved={() => { setShowForm(false); load() }} />}

      {showCommissions && commissions.length > 0 && (
        <Panel title="نسبە بەپێی کارمەند" description={scopeLabel} flush>
          <ul className="divide-y divide-line">
            {commissions.map(({ employee: person, count, usd: u, iqd: i }) => {
              const only = employee === person
              return (
                <li key={person}>
                  {/* Clicking a name is the short way to the same filter the
                      picker above sets; clicking it again clears it. */}
                  <button
                    type="button"
                    onClick={() => setEmployee(only ? 'all' : person)}
                    className={`flex w-full items-center justify-between gap-4 px-5 py-3.5 text-start transition-colors ${
                      only ? 'bg-accent-100/60' : 'hover:bg-canvas'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-100 text-[0.85rem] font-bold text-brand-600">
                        {person.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{person}</span>
                        <span className="block text-[0.78rem] text-faint">
                          <span className="num">{count}</span> نسبە
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end leading-tight text-neg">
                      {u > 0 && <span className="num font-semibold">{usd(u)}</span>}
                      {i > 0 && <span className="num font-semibold">{iqd(i)}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {byCategory.length > 1 && (
        <Panel title="بەپێی جۆر" description={scopeLabel}>
          <ul className="divide-y divide-line">
            {byCategory.map(({ category, usd: u, iqd: i }) => (
              <li key={category} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <span className="truncate text-[0.9rem]">{category}</span>
                <span className="flex shrink-0 flex-col items-end leading-tight">
                  {u > 0 && <span className="num text-[0.9rem] font-semibold text-neg">{usd(u)}</span>}
                  {i > 0 && <span className="num text-[0.9rem] font-semibold text-neg">{iqd(i)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={`خەرجییەکانی ${scopeLabel}`} flush>
        {loading ? (
          <p className="px-5 py-12 text-center text-[0.9rem] text-faint">بارکردن…</p>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium">
              {employee === 'all'
                ? 'هیچ خەرجییەک لەم ماوەیەدا نییە'
                : `هیچ نسبەیەک بۆ ${employee} لەم ماوەیەدا نییە`}
            </p>
            <p className="mt-1 text-[0.85rem] text-muted">
              {employee !== 'all'
                ? 'ماوەیەکی فراوانتر هەڵبژێرە، یان پاڵاوتنی کارمەند لابدە.'
                : canAdd
                  ? 'ماوەیەکی فراوانتر هەڵبژێرە، یان خەرجییەکی نوێ تۆمار بکە.'
                  : 'ماوەیەکی فراوانتر هەڵبژێرە.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {r.category}
                    {r.employee && (
                      <span className="ms-2 rounded-md bg-accent-100 px-1.5 py-0.5 text-[0.72rem] font-medium text-brand-600">
                        {r.employee}
                      </span>
                    )}
                  </p>
                  <p className="text-[0.8rem] text-faint">
                    <span className="num">{dateFmt(r.date)}</span>
                    {r.note ? <> · {r.note}</> : null}
                    {' · '}{r.profiles?.full_name || r.profiles?.email || '—'}
                  </p>
                </div>
                <p className="num font-semibold text-neg">{money(r.amount, r.currency)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function ExpenseForm({ onSaved }) {
  const [currency, setCurrency] = useState('usd')
  const [form, setForm] = useState({
    date: todayISO(),
    category: '',
    employee: '',
    amount: '',
    note: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const amount = num(form.amount)
  const isCommission = form.category.trim() === COMMISSION_CATEGORY

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.category.trim()) { setError('جۆری خەرجی بنووسە.'); return }
    if (isCommission && !form.employee) { setError('کارمەندەکە هەڵبژێرە.'); return }
    if (amount <= 0) { setError('بڕی خەرجی بنووسە.'); return }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase.from('expenses').insert({
        date: form.date,
        category: form.category.trim(),
        employee: isCommission ? form.employee : null,
        currency,
        amount,
        note: form.note || null,
        user_id: user.id,
      })
      if (err) { setError(`تۆمارکردنی خەرجی سەرکەوتوو نەبوو — ${err.message}`); return }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title="خەرجی نوێ">
      <form onSubmit={submit} className="flex flex-col gap-7">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField label="بەروار" type="date" InputLabelProps={{ shrink: true }}
            value={form.date} onChange={set('date')} />
          <Autocomplete
            freeSolo
            options={EXPENSE_CATEGORIES}
            value={form.category}
            onInputChange={(_e, v) => setForm((f) => ({ ...f, category: v }))}
            renderInput={(params) => <TextField {...params} label="جۆری خەرجی" />}
          />
        </div>

        {/* a commission is owed to a person, so name them before anything else */}
        {isCommission && (
          <fieldset>
            <legend className="mb-2.5 text-[0.85rem] text-muted">نسبە بۆ کام کارمەند</legend>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {EMPLOYEES.map((name) => {
                const on = form.employee === name
                return (
                  <label key={name}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[0.88rem] transition-colors ${
                      on ? 'border-brand-600 bg-accent-100 font-medium text-brand-600' : 'border-line hover:bg-canvas'
                    }`}>
                    <input type="radio" name="employee" value={name}
                      checked={on} onChange={set('employee')} className="accent-brand-600" />
                    <span className="truncate">{name}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-7 border-t border-line pt-7">
          <CurrencyToggle value={currency} onChange={setCurrency} label="خەرجی بە" />

          <MoneyField label="بڕ" fullWidth currency={currency}
            value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />

          <TextField label="تێبینی" multiline rows={2} fullWidth
            placeholder="بۆ نموونە: مووچەی ئەم مانگی کارمەند"
            value={form.note} onChange={set('note')} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-neg-soft px-5 py-4">
          <span className="text-[0.85rem] font-medium text-neg">
            کۆی ئەم خەرجییە{isCommission && form.employee ? ` — ${form.employee}` : ''}
          </span>
          <span className="num text-[1.3rem] font-bold text-neg">{money(amount, currency)}</span>
        </div>

        {error && <Alert severity="error">{error}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={saving}>
          تۆمارکردنی خەرجی
        </Button>
      </form>
    </Panel>
  )
}
