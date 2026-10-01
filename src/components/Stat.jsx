const TONES = {
  plain:  { bar: 'bg-brand-600',  value: 'text-ink' },
  pos:    { bar: 'bg-pos',        value: 'text-pos' },
  neg:    { bar: 'bg-neg',        value: 'text-neg' },
  accent: { bar: 'bg-accent-400', value: 'text-brand-600' },
}

/**
 * One number, said once. The accent bar carries the tone so the figure
 * itself can stay the same size everywhere and still be scannable.
 *
 * `second` is the other currency. Dollars and dinars are two separate books
 * that are never summed, so they are shown as peers — same size, same weight,
 * same colour, a hairline between them. Set in footnote type the dinar read
 * as a remark about the dollar figure, which is exactly what it is not.
 */
export default function Stat({ label, value, second, hint, tone = 'plain' }) {
  const t = TONES[tone] ?? TONES.plain
  // Dinar amounts run to eight or nine digits plus د.ع, so the paired size is
  // set by what still fits one line inside a quarter-width card.
  const size = second ? 'text-[1.35rem]' : 'text-[1.6rem]'
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <span className={`absolute inset-y-0 end-0 w-1 ${t.bar}`} />
      <p className="text-[0.8rem] font-medium text-muted">{label}</p>
      <p className={`num mt-1.5 ${size} font-bold leading-none ${t.value}`}>{value}</p>
      {second && (
        <p className={`num mt-2.5 border-t border-line pt-2.5 ${size} font-bold leading-none ${t.value}`}>
          {second}
        </p>
      )}
      {hint && <p className="mt-2.5 text-[0.78rem] leading-snug text-faint">{hint}</p>}
    </div>
  )
}
