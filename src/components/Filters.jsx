/** The strip of controls above a table. Keeps every page's filters aligned. */
export default function Filters({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
      {children}
    </div>
  )
}
