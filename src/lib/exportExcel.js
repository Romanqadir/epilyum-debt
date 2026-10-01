/**
 * Styled workbook export.
 *
 * SheetJS's community build cannot write cell styles, so the files it makes
 * are unreadable walls of text. ExcelJS can, and it is loaded on demand so
 * its weight never lands in the first paint.
 */

const C = {
  navy:    'FF071A44',
  brand:   'FF27478D',
  accent:  'FFC6D7FF',
  tint:    'FFE4ECFF',
  zebra:   'FFF7F9FD',
  line:    'FFE3E9F5',
  ink:     'FF0B1F4D',
  muted:   'FF5A6B92',
  white:   'FFFFFFFF',
  pos:     'FF067647',
  neg:     'FFB42318',
}

const FMT = {
  money: '"$"#,##0.00',
  iqd:   '#,##0 "د.ع"',
  int:   '#,##0',
  date:  'dd/mm/yyyy',
  text:  '@',
}

const thin = { style: 'thin', color: { argb: C.line } }
const BORDER = { top: thin, left: thin, bottom: thin, right: thin }

const isNumeric = (t) => t === 'money' || t === 'iqd' || t === 'int'

async function loadExcelJS() {
  const mod = await import('exceljs/dist/exceljs.min.js')
  return mod.default ?? mod.ExcelJS ?? mod
}

function colLetter(n) {
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** What a cell will actually read as once Excel applies its number format. */
function rendered(value, type) {
  if (value == null || value === '') return ''
  if (type === 'money') {
    return '$' + Number(value).toLocaleString('en-US',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (type === 'iqd') return Number(value).toLocaleString('en-US') + ' د.ع'
  if (type === 'int') return Number(value).toLocaleString('en-US')
  return String(value)
}

// A text column longer than this wraps instead of running off the edge.
const WRAP_AT = 26

/**
 * Width and wrapping are decided together, before anything is written.
 *
 * Width is measured against the formatted text, not the raw number: 20000000
 * is eight characters but "20,000,000 د.ع" is fourteen, and a column sized
 * for the first shows ### for the second. Long prose gets a generous column
 * and wraps; the row is then left without an explicit height so Excel grows
 * it to fit, which is the only way wrapped text stays readable.
 */
function planColumns(columns, rows) {
  return columns.map((col) => {
    const type = col.type ?? 'text'
    const numeric = isNumeric(type)

    let longest = 0
    for (const r of rows) longest = Math.max(longest, rendered(r[col.key], type).length)
    if (col.total) {
      const sum = rows.reduce((t, r) => t + (Number(r[col.key]) || 0), 0)
      longest = Math.max(longest, rendered(sum, type).length)
    }

    const header = String(col.header ?? '').length
    const wrap = col.wrap ?? (!numeric && longest > WRAP_AT)

    let width
    if (col.width) width = col.width
    else if (numeric) width = Math.min(28, Math.max(16, header + 5, longest + 5))
    else if (wrap) width = Math.min(46, Math.max(24, header + 5, Math.ceil(longest / 2) + 8))
    else width = Math.min(36, Math.max(14, header + 5, longest + 5))

    return { ...col, type, numeric, wrap, width, longest }
  })
}

/** Roughly how many lines a row will need once its text wraps. */
function linesNeeded(plan, row) {
  let lines = 1
  for (const col of plan) {
    if (!col.wrap) continue
    const text = rendered(row[col.key], col.type)
    if (!text) continue
    lines = Math.max(lines, Math.ceil(text.length / Math.max(8, col.width - 3)))
  }
  return lines
}

function buildSheet(wb, { name, columns, rows, note }, meta) {
  const plan = planColumns(columns, rows)
  const n = plan.length
  const lastCol = colLetter(n)

  const ws = wb.addWorksheet(name, {
    // No defaultRowHeight: ExcelJS marks a custom one on the sheet format,
    // and Excel then stops auto-fitting the rows that wrap. Single-line rows
    // get their height set explicitly below instead.
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 4, showGridLines: false }],
    pageSetup: {
      orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.55, bottom: 0.55, header: 0.3, footer: 0.3 },
    },
  })

  plan.forEach((col, i) => { ws.getColumn(i + 1).width = col.width })

  // --- title band -------------------------------------------------------
  ws.mergeCells(`A1:${lastCol}1`)
  const title = ws.getCell('A1')
  title.value = meta.title
  title.font = { name: 'IBM Plex Sans', size: 16, bold: true, color: { argb: C.white } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
  title.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
  ws.getRow(1).height = 42

  ws.mergeCells(`A2:${lastCol}2`)
  const sub = ws.getCell('A2')
  sub.value = [meta.subtitle, note].filter(Boolean).join('   ·   ')
  sub.font = { name: 'IBM Plex Sans', size: 10.5, color: { argb: C.brand } }
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tint } }
  sub.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
  ws.getRow(2).height = 26

  ws.getRow(3).height = 10

  // --- header row -------------------------------------------------------
  const head = ws.getRow(4)
  plan.forEach((col, i) => {
    const cell = head.getCell(i + 1)
    cell.value = col.header
    cell.font = { name: 'IBM Plex Sans', size: 11, bold: true, color: { argb: C.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.brand } }
    cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true, indent: 1 }
    cell.border = BORDER
  })
  head.height = 34

  // --- body -------------------------------------------------------------
  if (rows.length === 0) {
    ws.mergeCells(`A5:${lastCol}5`)
    const empty = ws.getCell('A5')
    empty.value = 'هیچ تۆمارێک لەم ماوەیەدا نییە'
    empty.font = { size: 11, italic: true, color: { argb: C.muted } }
    empty.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(5).height = 34
    return ws
  }

  rows.forEach((row, r) => {
    const line = ws.getRow(5 + r)
    const striped = r % 2 === 1

    plan.forEach((col, i) => {
      const cell = line.getCell(i + 1)
      const raw = row[col.key]

      cell.value = raw == null || raw === '' ? (col.numeric ? 0 : '') : raw
      cell.numFmt = FMT[col.type] ?? FMT.text
      cell.border = BORDER
      cell.alignment = {
        vertical: col.wrap ? 'top' : 'middle',
        horizontal: 'right',
        wrapText: col.wrap,
        indent: 1,
      }

      const tone = typeof col.tone === 'function' ? col.tone(row) : col.tone
      cell.font = {
        name: col.numeric ? 'IBM Plex Sans' : 'IBM Plex Sans Arabic',
        size: 11,
        bold: Boolean(col.strong),
        color: { argb: tone === 'pos' ? C.pos : tone === 'neg' ? C.neg : C.ink },
      }
      if (striped) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } }
      }
    })

    // Excel only auto-fits a row whose height was never set, so a row that
    // wraps is left alone and a single-line row gets its breathing room.
    if (linesNeeded(plan, row) === 1) line.height = 24
  })

  // --- totals -----------------------------------------------------------
  const totalCols = plan.filter((c) => c.total)
  if (totalCols.length > 0) {
    const line = ws.getRow(5 + rows.length)
    plan.forEach((col, i) => {
      const cell = line.getCell(i + 1)
      if (i === 0) cell.value = 'کۆی گشتی'
      else if (col.total) {
        cell.value = rows.reduce((t, r) => t + (Number(r[col.key]) || 0), 0)
        cell.numFmt = FMT[col.type] ?? FMT.int
      }
      cell.font = {
        name: col.total ? 'IBM Plex Sans' : 'IBM Plex Sans Arabic',
        size: 11, bold: true, color: { argb: C.navy },
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.accent } }
      cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      cell.border = { ...BORDER, top: { style: 'medium', color: { argb: C.brand } } }
    })
    line.height = 30
  }

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: n } }
  return ws
}

/**
 * @param {object} spec
 * @param {string} spec.fileName  without extension
 * @param {string} spec.title     the band across the top of every sheet
 * @param {string} spec.subtitle  the filters this export was taken under
 * @param {Array}  spec.sheets    [{ name, columns, rows, note }]
 *
 * A column is { key, header, type?, width?, tone?, strong?, total? }
 * where type is one of text | money | iqd | int | date.
 */
export async function exportWorkbook({ fileName, title, subtitle, sheets }) {
  const ExcelJS = await loadExcelJS()
  const wb = new ExcelJS.Workbook()

  wb.creator = 'Epilyum'
  wb.created = new Date()
  wb.views = [{ x: 0, y: 0, width: 24000, height: 18000, firstSheet: 0, activeTab: 0, visibility: 'visible' }]

  const stamp = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const meta = { title, subtitle: [subtitle, `دەرهێنراوە ${stamp}`].filter(Boolean).join('  ·  ') }

  for (const sheet of sheets) buildSheet(wb, sheet, meta)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
