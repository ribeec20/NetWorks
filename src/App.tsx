import { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import GraphSceneLayer from './graph/GraphSceneLayer'
import FAB from './components/FAB'
import ContactDrawer from './features/drawer/ContactDrawer'
import ContactsPanel from './features/contacts-panel/ContactsPanel'
import TopBar from './components/TopBar'
import { useAuthStore } from './stores/auth-store'
import SignInPage from './features/auth/SignInPage'
import SettingsPage from './features/settings/SettingsPage'
import TestLayoutPage from './test-layout/TestLayoutPage'

function UpgradeBanner() {
  const user = useAuthStore((s) => s.user)
  const [dismissed, setDismissed] = useState(false)

  if (user || dismissed) return null

  return (
    <div className="flex shrink-0 items-center gap-4 border-t border-border bg-card px-[var(--spacing-inset)] py-2.5">
      <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
        Your data is stored locally in this browser. Sign in to sync across devices and back up your network.
      </p>
      <Link
        to="/auth"
        className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/85"
      >
        Sign In
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="3" y1="3" x2="11" y2="11" />
          <line x1="11" y1="3" x2="3" y2="11" />
        </svg>
      </button>
    </div>
  )
}

function MainDashboard() {
  return (
    <div className="flex h-full flex-col bg-secondary">
      <TopBar />
      <main className="relative flex-1 overflow-hidden bg-secondary">
        <ContactsPanel />
        <GraphSceneLayer />
        <FAB />
        <ContactDrawer />
      </main>
      <UpgradeBanner />
    </div>
  )
}

export default function App() {
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    useAuthStore.getState().initAuth()
  }, [])

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<MainDashboard />} />
      <Route path="/auth" element={<SignInPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/test-layout" element={<TestLayoutPage />} />
    </Routes>
  )
}
