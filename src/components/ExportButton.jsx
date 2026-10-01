import { useState } from 'react'
import { IconDownload } from './icons.jsx'

/** Runs an async export and says so while it is working. */
export default function ExportButton({ onExport, disabled, label = 'داگرتنی Excel' }) {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try { await onExport() } finally { setBusy(false) }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled || busy}
      className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-[0.85rem] font-medium text-brand-600 transition-colors hover:border-brand-600 hover:bg-accent-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <IconDownload />
      {busy ? 'ئامادە دەکرێت…' : label}
    </button>
  )
}
