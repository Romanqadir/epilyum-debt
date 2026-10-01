import { usd, iqd } from '../lib/format'

/**
 * Two currencies, stacked — never summed. A row with only one of them
 * shows just that one; a row with neither shows a dash. Both lines are set
 * identically: neither currency is a footnote on the other.
 */
export default function Money({ usd: u = 0, iqd: i = 0, className = '', tone }) {
  const color = tone === 'neg' ? 'text-neg' : tone === 'pos' ? 'text-pos' : ''
  const hasU = Number(u) !== 0
  const hasI = Number(i) !== 0

  if (!hasU && !hasI) return <span className={`num ${color} ${className}`}>—</span>

  return (
    <span className={`flex flex-col justify-center leading-tight ${color} ${className}`}>
      {hasU && <span className="num">{usd(u)}</span>}
      {hasI && <span className="num">{iqd(i)}</span>}
    </span>
  )
}
