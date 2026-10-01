import { DEVICES, GIFTABLE_DEVICES } from '../lib/constants'

const giftable = new Set(GIFTABLE_DEVICES)

/**
 * Pick models and say how many of each. UPS and Hydra are the only two
 * ever handed over free, so they are the only two that offer the toggle.
 */
export default function DeviceSelect({ value = {}, gifts = [], onChange, onGiftsChange, label = 'ئامێرەکان' }) {
  const giftSet = new Set(gifts)

  const toggle = (d) => {
    const next = { ...value }
    if (d in next) {
      delete next[d]
      if (giftSet.has(d)) onGiftsChange(gifts.filter((g) => g !== d))
    } else {
      next[d] = 1
    }
    onChange(next)
  }

  const setQty = (d, raw) => onChange({ ...value, [d]: Math.max(1, parseInt(raw, 10) || 1) })

  const toggleGift = (d) =>
    onGiftsChange(giftSet.has(d) ? gifts.filter((g) => g !== d) : [...gifts, d])

  const paid = Object.entries(value).reduce((t, [d, n]) => t + (giftSet.has(d) ? 0 : Number(n || 0)), 0)
  const free = Object.entries(value).reduce((t, [d, n]) => t + (giftSet.has(d) ? Number(n || 0) : 0), 0)

  return (
    <fieldset className="rounded-2xl border border-line bg-surface p-5">
      <legend className="px-1 text-[0.85rem] text-muted">
        {label}
        {paid > 0 ? <> — <span className="num">{paid}</span> دانە</> : null}
        {free > 0 ? <> + <span className="num">{free}</span> دیاری</> : null}
      </legend>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DEVICES.map((d) => {
          const on = d in value
          const isGift = giftSet.has(d)
          return (
            <div
              key={d}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[0.88rem] transition-colors ${
                !on ? 'border-line hover:bg-canvas'
                  : isGift ? 'border-pos bg-pos-soft' : 'border-brand-600 bg-accent-100'
              }`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={on} onChange={() => toggle(d)}
                  className="accent-brand-600" />
                <span className="truncate">{d}</span>
              </label>

              {on && (
                <>
                  {giftable.has(d) && (
                    <button
                      type="button"
                      onClick={() => toggleGift(d)}
                      aria-pressed={isGift}
                      title={isGift ? 'بیکە بە فرۆشراو' : 'بیکە بە دیاری'}
                      className={`shrink-0 rounded-md px-1.5 py-1 text-[0.72rem] font-medium transition-colors ${
                        isGift ? 'bg-pos text-white' : 'border border-line-strong text-faint hover:text-brand-600'
                      }`}
                    >
                      دیاری
                    </button>
                  )}
                  <input
                    type="number"
                    min="1"
                    value={value[d]}
                    onChange={(e) => setQty(d, e.target.value)}
                    aria-label={`ژمارەی ${d}`}
                    dir="ltr"
                    className="num w-12 shrink-0 rounded-md border border-line bg-white px-1.5 py-1 text-center outline-none focus:border-brand-600"
                  />
                </>
              )}
            </div>
          )
        })}
      </div>

      {free > 0 && (
        <p className="mt-3 text-[0.78rem] text-muted">
          ئامێری دیاری هیچ نرخێکیان زیاد ناکات — تەنیا تۆمار دەکرێن.
        </p>
      )}
    </fieldset>
  )
}
