import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Button } from '@mui/material'
import { money, dateFmt } from '../lib/format'
import { cityLabel } from '../lib/constants'

/**
 * Instalment receipt. Rendered as real DOM and exported to PNG, not PDF:
 * a browser lays out Kurdish script correctly, and a PNG is what actually
 * pastes into WhatsApp.
 */
export default function ReceiptCard({ receipt, onDone }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const cur = receipt.currency ?? 'usd'

  const share = async () => {
    setBusy(true)
    try {
      const url = await toPng(ref.current, { pixelRatio: 2, backgroundColor: '#ffffff' })
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], `epilyum-${Date.now()}.png`, { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'پسوڵەی Epilyum' })
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        if (receipt.client.phone) {
          const phone = receipt.client.phone.replace(/\D/g, '').replace(/^0/, '964')
          window.open(`https://wa.me/${phone}`, '_blank', 'noopener')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const Row = ({ label, children }) => (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-muted">{label}</span>
      <span className="num">{children}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <div ref={ref} className="mx-auto w-full max-w-md bg-white p-6" dir="rtl">
        <div className="flex items-baseline justify-between border-b-2 border-navy-900 pb-3">
          <span className="text-xl font-bold tracking-tight text-navy-900">EPILYUM</span>
          <span className="text-sm text-muted">پسوڵەی وەرگرتنی پارە</span>
        </div>

        <div className="py-3">
          <p className="text-lg font-semibold">{receipt.client.name}</p>
          <p className="text-sm text-muted">
            {cityLabel(receipt.client.city)}
            {receipt.client.phone ? <> · <span className="num">{receipt.client.phone}</span></> : null}
          </p>
        </div>

        {receipt.devices?.length > 0 && (
          <ul className="mb-3 space-y-1 border-y border-line py-3 text-sm">
            {receipt.devices.map((d) => <li key={d}>{d}</li>)}
          </ul>
        )}

        <div className="text-sm">
          <Row label="بەروار">{dateFmt(receipt.date)}</Row>
          {receipt.invoice_no ? <Row label="ژمارەی پسوڵە">{receipt.invoice_no}</Row> : null}
        </div>

        <div className="mt-3 rounded-lg bg-pos-soft px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-pos">کۆی ئەم قیستە</span>
            <span className="num text-lg font-bold text-pos">{money(receipt.amount, cur)}</span>
          </div>
        </div>

        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <Row label="کۆی نرخ">{money(receipt.total_price, cur)}</Row>
          <Row label="کۆی وەرگیراو">{money(receipt.received, cur)}</Row>
          <div className="flex justify-between gap-4 pt-1 font-semibold">
            <span className="text-neg">ماوە</span>
            <span className="num text-neg">{money(receipt.remaining, cur)}</span>
          </div>
        </div>

        {receipt.note && <p className="mt-3 text-sm text-muted">{receipt.note}</p>}
      </div>

      <div className="flex justify-center gap-2">
        <Button variant="contained" onClick={share} disabled={busy}>ناردن بۆ واتسئاپ</Button>
        <Button color="inherit" onClick={onDone}>تۆمارێکی نوێ</Button>
      </div>
    </div>
  )
}
