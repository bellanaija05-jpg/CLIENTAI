import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '../../hooks/useAuth.js'

// The main app navigation. Dashboard uses `end` so it is not marked
// active on every other route; /leads correctly stays active on
// /leads/new, /leads/:id, and /leads/:id/edit.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/leads', label: 'Leads' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/follow-ups', label: 'Follow-Ups' },
]

// Shared link styling. Explicit focus-visible ring so keyboard focus is
// obvious on every control (matching LeadQuickActions).
const linkBase =
  'rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
const activeLink = 'bg-brand-50 text-brand-700'
const idleLink = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'

/**
 * Shared layout for every authenticated page (Phase 4 close-out).
 *
 * Renders the app navbar (brand, main navigation with active states,
 * the user's identity, Settings, and Sign out) above the routed page
 * via <Outlet />. Pure layout: no data fetching of its own — identity
 * comes from the existing AuthContext, so this can never show another
 * user's information.
 */
export default function AppShell() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <Link
            to="/dashboard"
            className="text-lg font-bold tracking-tight text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            ClientFlow<span className="text-slate-900"> AI</span>
          </Link>

          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? activeLink : idleLink}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[180px] truncate text-sm text-slate-500 sm:block">
              {profile?.full_name || user?.email}
            </span>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? activeLink : idleLink}`
              }
            >
              Settings
            </NavLink>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <Outlet />

      {/* Subtle builder attribution — pure presentation, shared by every
          authenticated page. Mirrors the landing footer's muted styling. */}
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Built by Pius
      </footer>
    </div>
  )
}