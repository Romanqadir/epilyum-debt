/**
 * A handful of inline strokes, so the sidebar can have icons without
 * pulling in an icon package for six glyphs.
 */
const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
}

export const IconClinics = (p) => (
  <svg {...base} {...p}>
    <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="3.2" />
    <path d="M17 11h5M19.5 8.5v5" />
  </svg>
)

export const IconDevices = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7z" />
    <path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2" />
  </svg>
)

export const IconMonthly = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 2.8v3.4M16 2.8v3.4" />
    <path d="M7.5 16.5v-2.2M12 16.5v-4M16.5 16.5v-3" />
  </svg>
)

export const IconExpenses = (p) => (
  <svg {...base} {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z" />
    <path d="M16.5 12.8h2.2M3 10h18" />
  </svg>
)

export const IconInvoice = (p) => (
  <svg {...base} {...p}>
    <path d="M6 2.8h12v18.4l-3-1.8-3 1.8-3-1.8-3 1.8z" />
    <path d="M9.5 8h5M9.5 12h5M9.5 16h3" />
  </svg>
)

export const IconDownload = (p) => (
  <svg {...base} width="17" height="17" {...p}>
    <path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4 17.5v1.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
  </svg>
)

export const IconSearch = (p) => (
  <svg {...base} width="18" height="18" {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
)

export const IconBack = (p) => (
  <svg {...base} width="18" height="18" {...p}>
    <path d="M9 5.5 15.5 12 9 18.5" />
  </svg>
)
