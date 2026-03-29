import { Link, NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../features/auth/useAuth'
import {
  getStoredHouseholdId,
  listHouseholdsForUser,
  setStoredHouseholdId,
} from '../features/household/api'
import { supabase } from '../lib/supabase'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-sky-100 text-sky-900' : 'text-zinc-600 hover:bg-zinc-100'}`

export function AppLayout() {
  const { session } = useAuth()
  const userId = session!.user.id

  const { data: households } = useQuery({
    queryKey: ['households', userId],
    queryFn: () => listHouseholdsForUser(userId),
  })

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-lg flex-col gap-2 px-4 py-3 sm:max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-zinc-900">Spread Turn Tracker</span>
            <button
              type="button"
              className="text-sm text-zinc-600 underline"
              onClick={() => supabase.auth.signOut()}
              data-testid="sign-out"
            >
              Sign out
            </button>
          </div>
          {households && households.length > 1 ? (
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <span>Household</span>
              <select
                className="rounded-md border border-zinc-300 px-2 py-1"
                data-testid="household-select"
                value={
                  getStoredHouseholdId() ??
                  households[0]?.householdId ??
                  ''
                }
                onChange={(e) => {
                  setStoredHouseholdId(e.target.value)
                  window.location.reload()
                }}
              >
                {households.map((h) => (
                  <option key={h.householdId} value={h.householdId}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" className={navClass} end data-testid="nav-dashboard">
              Dashboard
            </NavLink>
            <NavLink to="/notes" className={navClass} data-testid="nav-notes">
              Notes
            </NavLink>
            <NavLink to="/settings" className={navClass} data-testid="nav-settings">
              Settings
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6 sm:max-w-2xl">
        <Outlet />
      </main>
      <footer className="pb-8 text-center text-xs text-zinc-400">
        <Link to="/" className="underline">
          Home
        </Link>
      </footer>
    </div>
  )
}
