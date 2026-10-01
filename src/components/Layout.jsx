import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { IconClinics, IconDevices, IconMonthly, IconExpenses, IconInvoice } from './icons.jsx'

const ADMIN_NAV = [
  { to: '/admin/clients',  label: 'کلینیکەکان',     Icon: IconClinics, desc: 'کڕیار و کڕینەکان' },
  { to: '/admin/devices',  label: 'ئامێر و فرۆشتن', Icon: IconDevices, desc: 'ئەوەی فرۆشراوە' },
  { to: '/admin/monthly',  label: 'کۆی مانگانە',    Icon: IconMonthly, desc: 'وەرگیراو و دابەشکردن' },
  { to: '/admin/expenses', label: 'خەرجییەکان',     Icon: IconExpenses, desc: 'سندوق و خەرجکراو' },
]

const USER_NAV = [
  { to: '/dashboard',          label: 'پسوڵەی مانگانە', Icon: IconInvoice,  desc: 'تۆمارکردنی قیست' },
  { to: '/dashboard/expenses', label: 'خەرجییەکان',     Icon: IconExpenses, desc: 'تۆمارکردنی خەرجی' },
]

export default function Layout({ children }) {
  const { profile, isAdmin, signOut } = useAuth()
  const { pathname } = useLocation()
  const nav = isAdmin ? ADMIN_NAV : USER_NAV
  const current = nav.find((n) => n.to === pathname) ?? nav[0]

  const initials = (profile?.full_name || profile?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="flex min-h-dvh">
      {/* rail — in RTL this sits on the right */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-navy-900 lg:flex">
        <div className="px-6 pb-6 pt-7">
          <p className="text-[1.35rem] font-bold tracking-tight text-white">EPILYUM</p>
          <p className="mt-0.5 text-[0.78rem] text-accent-300/70">
            {isAdmin ? 'بەڕێوەبردن' : 'تۆمارکردن'}
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map(({ to, label, Icon, desc }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  active ? 'bg-white/[.09] text-white' : 'text-accent-300/75 hover:bg-white/[.05] hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2 end-0 w-[3px] rounded-full bg-accent-300" />
                )}
                <Icon className={active ? 'text-accent-300' : ''} />
                <span className="min-w-0">
                  <span className="block text-[0.93rem] font-medium leading-tight">{label}</span>
                  <span className="block truncate text-[0.72rem] text-accent-300/55">{desc}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="m-3 rounded-xl bg-white/[.06] p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-300 text-[0.9rem] font-bold text-navy-900">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.85rem] font-medium text-white">
                {profile?.full_name || profile?.email}
              </span>
              <span className="block text-[0.72rem] text-accent-300/60">
                {isAdmin ? 'بەڕێوەبەر' : 'بەکارهێنەر'}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-lg border border-white/15 py-1.5 text-[0.82rem] text-accent-300/80 transition-colors hover:border-white/30 hover:text-white"
          >
            دەرچوون
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* compact bar for phones and tablets */}
        <div className="sticky top-0 z-20 flex items-center gap-3 bg-navy-900 px-4 py-3 lg:hidden">
          <p className="text-lg font-bold tracking-tight text-white">EPILYUM</p>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {nav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.82rem] ${
                  pathname === to ? 'bg-white/15 text-white' : 'text-accent-300/70'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={signOut} className="text-[0.82rem] text-accent-300/80">
            دەرچوون
          </button>
        </div>

        <header className="hidden border-b border-line bg-surface/80 px-8 py-4 backdrop-blur lg:block">
          <h1 className="head text-[1.35rem] font-semibold">{current.label}</h1>
          <p className="text-[0.85rem] text-muted">{current.desc}</p>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
