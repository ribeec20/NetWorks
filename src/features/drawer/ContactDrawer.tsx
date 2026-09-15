import { useEffect, useCallback, useState, useRef } from 'react'
import { useUIStore } from '../../stores/ui-store'
import ContactForm from './ContactForm'
import ContactView from './ContactView'
import InteractionForm from './InteractionForm'
import AddConnectionForm from './AddConnectionForm'

export default function ContactDrawer() {
  const drawerOpen = useUIStore((s) => s.drawerOpen)
  const drawerMode = useUIStore((s) => s.drawerMode)
  const referrerId = useUIStore((s) => s.referrerId)
  const activeContactId = useUIStore((s) => s.activeContactId)
  const closeDrawer = useUIStore((s) => s.closeDrawer)
  const openAddConnection = useUIStore((s) => s.openAddConnection)
  const openAddReferral = useUIStore((s) => s.openAddReferral)

  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const openMenu = () => {
    clearTimeout(addMenuTimer.current)
    setAddMenuOpen(true)
  }
  const closeMenuDelayed = () => {
    addMenuTimer.current = setTimeout(() => setAddMenuOpen(false), 200)
  }

  useEffect(() => () => clearTimeout(addMenuTimer.current), [])

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        closeDrawer()
      }
    },
    [drawerOpen, closeDrawer],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  const renderContent = () => {
    switch (drawerMode) {
      case 'add':
      case 'edit':
        return <ContactForm />
      case 'view':
        return <ContactView />
      case 'log-interaction':
        return <InteractionForm />
      case 'add-connection':
        return <AddConnectionForm />
      default:
        return null
    }
  }

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {drawerOpen && (
        <div
          className="fixed inset-0 top-16 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={closeDrawer}
        />
      )}
      <div
        className={`fixed top-16 right-0 z-40 flex h-[calc(100%-4rem)] w-[var(--drawer-width)] max-w-full flex-col rounded-tl-2xl border-l border-t border-[var(--glass-border)] bg-[var(--glass-1-bg)] shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--glass-border)] bg-transparent px-[var(--spacing-inset)]">
          <span className="text-base font-bold tracking-tight text-foreground md:text-lg">
            {drawerMode === 'add' && (referrerId ? 'Add Referral' : 'Add Contact')}
            {drawerMode === 'edit' && 'Edit Contact'}
            {drawerMode === 'view' && 'Contact'}
            {drawerMode === 'log-interaction' && 'Log Interaction'}
            {drawerMode === 'add-connection' && 'Add Connection'}
          </span>
          <div className="flex items-center gap-2">
            {/* Add dropdown — only in view mode */}
            {drawerMode === 'view' && (
              <div
                className="relative"
                onMouseEnter={openMenu}
                onMouseLeave={closeMenuDelayed}
              >
                <button
                  className="glass-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/10"
                  aria-label="Add connection or referral"
                  aria-haspopup="true"
                  aria-expanded={addMenuOpen}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="7" y1="3" x2="7" y2="11" />
                    <line x1="3" y1="7" x2="11" y2="7" />
                  </svg>
                </button>
                {addMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-lg border border-[var(--glass-border)] bg-background/95 shadow-xl shadow-black/20 backdrop-blur-2xl ring-1 ring-black/5">
                    <button
                      onClick={() => { setAddMenuOpen(false); openAddConnection() }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <line x1="2" y1="7" x2="12" y2="7" />
                        <circle cx="2" cy="7" r="1.5" fill="currentColor" stroke="none" />
                        <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
                      </svg>
                      Add Connection
                    </button>
                    <button
                      onClick={() => { setAddMenuOpen(false); openAddReferral(activeContactId ?? undefined) }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M7 1L13 7L7 13" />
                        <path d="M1 7H13" />
                      </svg>
                      Add Referral
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={closeDrawer}
              className="glass-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--glass-3-bg)] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/10"
              aria-label="Close drawer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Drawer content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
          {drawerOpen && renderContent()}
        </div>

        {/* Bottom bar spacer — hidden in view mode */}
        <div className={`shrink-0 border-t border-[var(--glass-border)] px-[var(--spacing-inset)] py-[var(--spacing-inset)] ${drawerMode === 'view' ? 'hidden' : ''}`}>
          <div className="h-1 w-10 mx-auto rounded-full bg-[var(--glass-border)]" />
        </div>
      </div>
    </>
  )
}
