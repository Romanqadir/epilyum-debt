/** A card with an optional heading row — the only box shape in the app. */
export default function Panel({ title, description, action, children, className = '', flush = false }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="head text-[1.02rem] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[0.8rem] text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  )
}
