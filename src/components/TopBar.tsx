import { useUIStore } from '../stores/ui-store'
import type { ClusterBy } from '../stores/ui-store'
import { useAuthStore } from '../stores/auth-store'
import { useContactStore } from '../stores/contact-store'
import { Link } from 'react-router-dom'

const IS_DEV = import.meta.env.DEV

export default function TopBar() {
  const showWeb = useUIStore((s) => s.showWeb)
  const showNames = useUIStore((s) => s.showNames)
  const toggleShowWeb = useUIStore((s) => s.toggleShowWeb)
  const toggleShowNames = useUIStore((s) => s.toggleShowNames)
  const contactsPanelOpen = useUIStore((s) => s.contactsPanelOpen)
  const toggleContactsPanel = useUIStore((s) => s.toggleContactsPanel)
  const clusterBy = useUIStore((s) => s.clusterBy)
  const setClusterBy = useUIStore((s) => s.setClusterBy)
  const user = useAuthStore((s) => s.user)

  const sortOptions: { id: string; label: string; value: ClusterBy }[] = [
    { id: 'sort-tag', label: 'By Tag', value: 'tag' },
    { id: 'sort-industry', label: 'By Industry', value: 'industry' },
    { id: 'sort-time', label: 'By Time Added', value: 'time-added' },
  ]

  const graphOptions = [
    {
      id: 'show-connections',
      label: 'Show connections',
      active: showWeb,
      onSelect: toggleShowWeb,
    },
    {
      id: 'show-names',
      label: 'Show names',
      active: showNames,
      onSelect: toggleShowNames,
    },
  ]

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 border-b border-primary/20 bg-primary/15 backdrop-blur-2xl px-[var(--spacing-inset)] shadow-md">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Contacts panel toggle — leftmost */}
        <button
          onClick={toggleContactsPanel}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold shadow-sm transition-all duration-200 active:scale-95 ${
            contactsPanelOpen
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-primary/20 bg-background/50 text-foreground hover:border-primary/40 hover:bg-background/80'
          }`}
          title="Toggle contacts panel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="2" width="5" height="5" rx="0.5" />
            <rect x="8" y="2" width="5" height="5" rx="0.5" />
            <rect x="1" y="9" width="5" height="3" rx="0.5" />
            <rect x="8" y="9" width="5" height="3" rx="0.5" />
          </svg>
          Contacts
        </button>

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-background/60 text-primary shadow-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="3" r="2" fill="currentColor" />
              <circle cx="3" cy="11" r="2" fill="currentColor" />
              <circle cx="11" cy="11" r="2" fill="currentColor" />
              <line x1="7" y1="5" x2="3" y2="9" stroke="currentColor" strokeWidth="1.2" />
              <line x1="7" y1="5" x2="11" y2="9" stroke="currentColor" strokeWidth="1.2" />
              <line x1="3" y1="11" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">NetWorks</span>
        </Link>

      </div>

      <div className="ml-3 flex shrink-0 items-center gap-3">
        {/* Dev-only: recalc layout */}
        {IS_DEV && (
          <button
            onClick={() => {
              useContactStore.getState().recalculateAllStrengths()
            }}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 transition-all hover:bg-amber-500/20 active:scale-95 dark:text-amber-400"
            title="Reset all node positions and re-layout (dev only)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 6a5 5 0 0 1 9-3M11 6a5 5 0 0 1-9 3" />
              <path d="M1 2v3h3M11 10V7H8" />
            </svg>
            Recalc
          </button>
        )}

        {/* Graph options */}
        <div className="group relative">
          <button
            type="button"
            aria-haspopup="menu"
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold shadow-sm transition-all duration-200 active:scale-95 ${
              showWeb || clusterBy
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-primary/20 bg-background/50 text-foreground hover:border-primary/40 hover:bg-background/80'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="3" y1="3" x2="7" y2="7" />
              <line x1="11" y1="3" x2="7" y2="7" />
              <line x1="3" y1="11" x2="7" y2="7" />
              <line x1="11" y1="11" x2="7" y2="7" />
              <line x1="3" y1="3" x2="11" y2="3" />
              <line x1="3" y1="11" x2="11" y2="11" />
            </svg>
            Graph
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180">
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </button>

          <div className="pointer-events-none absolute right-0 top-full z-30 w-60 translate-y-1 opacity-0 pt-2 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <div className="glass-2 rounded-2xl p-2 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
              <div className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Graph Changes
              </div>

              <div className="flex flex-col gap-1">
                {graphOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={option.active}
                    onClick={option.onSelect}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                      option.active
                        ? 'bg-primary/10 text-primary hover:bg-primary/15'
                        : 'text-foreground hover:bg-[var(--glass-3-bg)]'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] transition-colors ${
                        option.active
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {option.active ? '✓' : ''}
                    </span>
                  </button>
                ))}
              </div>

              <div className="px-2 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sort
              </div>

              <div className="flex flex-col gap-1">
                {sortOptions.map((option) => {
                  const active = clusterBy === option.value
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => setClusterBy(active ? null : option.value)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary hover:bg-primary/15'
                          : 'text-foreground hover:bg-[var(--glass-3-bg)]'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                          active
                            ? 'border-primary'
                            : 'border-border'
                        }`}
                      >
                        {active && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Account */}
        {user ? (
          <Link
            to="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shadow-sm transition-all duration-200 hover:bg-primary/15 active:scale-95"
            title={user.displayName ?? user.email ?? 'Account'}
          >
            {(user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
          </Link>
        ) : (
          <Link
            to="/settings"
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-semibold text-muted-foreground shadow-sm transition-all duration-200 hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="6" r="3" />
              <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" />
            </svg>
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
