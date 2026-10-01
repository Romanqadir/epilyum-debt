import { CURRENCIES } from '../lib/constants'

/** Which currency this record is in. Nothing is converted between them. */
export default function CurrencyToggle({ value, onChange, label = 'دراو', disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[0.85rem] text-muted">{label}</span>
      <div className="flex rounded-xl border border-line p-1">
        {CURRENCIES.map((c) => {
          const on = value === c.value
          return (
            <button
              key={c.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c.value)}
              aria-pressed={on}
              className={`rounded-lg px-4 py-1.5 text-[0.85rem] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                on ? 'bg-navy-900 font-medium text-white' : 'text-muted hover:bg-canvas'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
