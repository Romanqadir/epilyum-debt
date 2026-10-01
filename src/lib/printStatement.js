import { dateFmt, monthKey } from './format'
import { cityLabel } from './constants'
import {
  statementStrings, statementCity, statementMoney, statementMonth,
} from './statementLang'

/**
 * A payment statement as a real PDF, in Kurdish, Arabic or English.
 *
 * jsPDF cannot shape Arabic script — letters come out disconnected and in
 * the wrong order — so the statement is handed to the browser as a print
 * document instead. The browser lays out Kurdish correctly, the person
 * chooses "Save as PDF", and the text stays selectable rather than becoming
 * a picture of itself.
 *
 * It renders inside a hidden iframe rather than a popup, which no browser
 * blocks and which leaves the app's own page untouched.
 */

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

const STYLE = `
  @page { size: A4; margin: 14mm 12mm; }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  body {
    font-family: "IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #0b1f4d;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .num {
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    font-variant-numeric: tabular-nums;
    direction: ltr;
    unicode-bidi: isolate;
  }

  .band {
    background: #071a44;
    color: #fff;
    padding: 18px 22px;
    border-radius: 12px 12px 0 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }
  .band .mark { font-size: 20pt; font-weight: 700; letter-spacing: -0.02em; }
  .band .kind { font-size: 10pt; color: #a4c0ff; }

  .who {
    background: #e4ecff;
    padding: 12px 22px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 20px;
  }
  .who .name { font-size: 13pt; font-weight: 600; color: #071a44; }
  .who .meta { font-size: 9.5pt; color: #27478d; }

  .totals {
    display: flex;
    gap: 10px;
    padding: 14px 0 18px;
  }
  .tile {
    flex: 1;
    border: 1px solid #e3e9f5;
    border-radius: 10px;
    padding: 10px 14px;
    text-align: center;
  }
  .tile .k { font-size: 8.5pt; color: #5a6b92; }
  .tile .v { font-size: 13pt; font-weight: 700; margin-top: 2px; }
  .tile .v.pos { color: #067647; }
  .tile .v.neg { color: #b42318; }
  /* The other currency is a peer figure, not a footnote on the first. */
  .tile .v.second { margin-top: 5px; padding-top: 5px; border-top: 1px solid #e3e9f5; }

  h2 {
    font-size: 10.5pt;
    font-weight: 600;
    margin: 16px 0 8px;
    padding-bottom: 5px;
    border-bottom: 1.5px solid #27478d;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  h2 .sum { font-weight: 700; }

  /* Every cell is centred. A Kurdish heading sits right and a Latin figure
     sits left, so edge-aligned they drift to opposite sides of the column
     and a reader lines the amount up with the wrong header. Centring both
     keeps each column reading as one column. */
  table { width: 100%; border-collapse: collapse; }
  thead th {
    background: #27478d;
    color: #fff;
    font-size: 9pt;
    font-weight: 600;
    text-align: center;
    padding: 8px 10px;
  }
  tbody td {
    padding: 9px 10px;
    font-size: 10pt;
    text-align: center;
    border-bottom: 1px solid #e3e9f5;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) td { background: #f7f9fd; }
  tbody td.amount { font-weight: 600; color: #067647; white-space: nowrap; }
  tfoot td {
    padding: 9px 10px;
    font-size: 10pt;
    font-weight: 700;
    text-align: center;
    background: #c6d7ff;
    border-top: 2px solid #27478d;
  }

  .empty {
    padding: 28px;
    text-align: center;
    color: #8494b5;
    border: 1px dashed #ccd6ea;
    border-radius: 10px;
  }

  footer {
    margin-top: 22px;
    padding-top: 10px;
    border-top: 1px solid #e3e9f5;
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    color: #8494b5;
  }

  section { break-inside: avoid; }
  thead { display: table-header-group; }
`

function tile(label, value, tone = '', second = '') {
  return `
    <div class="tile">
      <div class="k">${esc(label)}</div>
      <div class="v ${tone} num">${esc(value)}</div>
      ${second ? `<div class="v ${tone} second num">${esc(second)}</div>` : ''}
    </div>`
}

function monthSection(key, list, lang) {
  const t = statementStrings(lang)
  const perCurrency = list.reduce((acc, p) => {
    acc[p.currency] = (acc[p.currency] ?? 0) + Number(p.amount)
    return acc
  }, {})
  const sums = Object.entries(perCurrency)
    .map(([cur, total]) => statementMoney(total, cur, lang))
    .join('  ·  ')

  // The statement goes to the clinic, so it carries only what they paid —
  // who the cash was handed to and the rep's notes stay internal.
  const rows = list.map((p) => `
    <tr>
      <td class="num">${esc(dateFmt(p.date))}</td>
      <td class="num">${esc(p.invoice_no || '—')}</td>
      <td class="amount num">${esc(statementMoney(p.amount, p.currency, lang))}</td>
    </tr>`).join('')

  return `
    <section>
      <h2><span>${esc(statementMonth(key, lang))}</span><span class="sum num">${esc(sums)}</span></h2>
      <table>
        <thead>
          <tr>
            <th style="width:30%">${esc(t.date)}</th>
            <th style="width:32%">${esc(t.invoice)}</th>
            <th style="width:38%">${esc(t.amount)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`
}

/**
 * @param {object} data
 * @param {object} data.client   name, city, phone
 * @param {Array}  data.payments the instalments to list, newest first
 * @param {string} data.month    '2026-09' or 'all' — the period covered
 * @param {object} data.summary  { remainingUsd, remainingIqd }
 * @param {string} data.lang     'ku' | 'ar' | 'en'
 */
export function statementHtml({ client, payments, month = 'all', summary, lang = 'ku' }) {
  const t = statementStrings(lang)
  const cash = (n, cur) => statementMoney(n, cur, lang)

  // newest first on screen reads better; a statement reads forward in time
  const ordered = [...payments].sort((a, b) => String(a.date).localeCompare(String(b.date)))

  const groups = new Map()
  for (const p of ordered) {
    const k = monthKey(p.date)
    groups.set(k, [...(groups.get(k) ?? []), p])
  }

  const totalUsd = ordered.filter((p) => p.currency === 'usd').reduce((s, p) => s + Number(p.amount), 0)
  const totalIqd = ordered.filter((p) => p.currency === 'iqd').reduce((s, p) => s + Number(p.amount), 0)

  const scope = month === 'all' ? t.allPeriods : statementMonth(month, lang)
  const city = statementCity(client.city, lang) ?? cityLabel(client.city)

  const body = groups.size === 0
    ? `<p class="empty">${esc(t.empty)}</p>`
    : [...groups].map(([k, list]) => monthSection(k, list, lang)).join('')

  const stamp = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return `<!doctype html>
<html lang="${t.htmlLang}" dir="${t.dir}">
<head>
<meta charset="utf-8" />
<title>${esc(client.name)} — ${esc(t.kind)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>${STYLE}</style>
</head>
<body>
  <div class="band">
    <div class="mark">EPILYUM</div>
    <div class="kind">${esc(t.kind)}<br />${esc(scope)}</div>
  </div>

  <div class="who">
    <div class="name">${esc(client.name)}</div>
    <div class="meta">${esc(city)}${client.phone ? ` · <span class="num">${esc(client.phone)}</span>` : ''}</div>
  </div>

  <div class="totals">
    ${tile(t.totalPaid,
        totalUsd > 0 || totalIqd === 0 ? cash(totalUsd, 'usd') : cash(totalIqd, 'iqd'),
        'pos',
        totalUsd > 0 && totalIqd > 0 ? cash(totalIqd, 'iqd') : '')}
    ${tile(t.count, String(ordered.length))}
    ${tile(t.remaining,
        Number(summary?.remainingUsd) > 0 || !Number(summary?.remainingIqd)
          ? cash(summary?.remainingUsd ?? 0, 'usd')
          : cash(summary?.remainingIqd ?? 0, 'iqd'),
        'neg',
        Number(summary?.remainingUsd) > 0 && Number(summary?.remainingIqd) > 0
          ? cash(summary.remainingIqd, 'iqd') : '')}
  </div>

  ${body}

  <footer>
    <span>Epilyum · Discover the convenience</span>
    <span class="num">${esc(stamp)}</span>
  </footer>
</body>
</html>`
}

/** Writes the document into a hidden frame and opens the print dialog. */
export async function printHtml(html) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;'
  document.body.appendChild(frame)

  const doc = frame.contentDocument
  doc.open()
  doc.write(html)
  doc.close()

  const win = frame.contentWindow

  await new Promise((resolve) => {
    if (doc.readyState === 'complete') resolve()
    else frame.addEventListener('load', resolve, { once: true })
  })

  // webfonts must be in before layout, or the statement prints in a fallback
  try { await doc.fonts?.ready } catch { /* older browsers */ }
  await new Promise((r) => setTimeout(r, 250))

  const cleanup = () => setTimeout(() => frame.remove(), 500)
  win.addEventListener('afterprint', cleanup, { once: true })

  win.focus()
  win.print()

  // a browser that never fires afterprint should not leak the frame
  setTimeout(cleanup, 60000)
}
