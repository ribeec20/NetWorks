import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, SectionTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useUIStore } from '../../stores/ui-store'
import { useContactStore } from '../../stores/contact-store'
import { useAuthStore } from '../../stores/auth-store'
import { getDataService } from '../../data/provider'
import { themes, isThemeUnlocked } from '../../themes'
import type { UserTier } from '../../types'
import { getRevenueCatEntitlementKeys } from '../../billing/revenuecat'
import { useRevenueCatEntitlements } from '../../hooks/useRevenueCatEntitlements'

export default function SettingsPage() {
  const navigate = useNavigate()

  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const themeId = useUIStore((s) => s.themeId)
  const setThemeId = useUIStore((s) => s.setThemeId)

  const contacts = useContactStore((s) => s.contacts)
  const deleteContact = useContactStore((s) => s.deleteContact)

  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const revenueCat = useRevenueCatEntitlements()

  const [interactionCount, setInteractionCount] = useState(0)
  const [profileTier, setProfileTier] = useState<UserTier>('free')
  const [deleteDataOpen, setDeleteDataOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)

  useEffect(() => {
    const ds = getDataService()
    ds.getAllInteractions().then((interactions) => setInteractionCount(interactions.length))
    ds.getUserProfile().then((profile) => {
      if (profile?.tier) setProfileTier(profile.tier)
    })
  }, [])

  const userTier = revenueCat.configured ? revenueCat.userTier : profileTier
  const planLabel = userTier === 'paid' ? 'Lifetime Access' : 'Free Plan'
  const expectedEntitlements = getRevenueCatEntitlementKeys()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  async function handleDeleteAllData() {
    for (const contact of contacts) {
      await deleteContact(contact.id)
    }
    setDeleteDataOpen(false)
  }

  async function handleDeleteAccount() {
    await deleteAccount()
    navigate('/')
  }

  const avatarLetter = user
    ? (user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
    : null

  return (
    <div className="bg-background min-h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-[var(--spacing-inset)] py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="11" y1="7" x2="3" y2="7" />
              <polyline points="6,3 3,7 6,11" />
            </svg>
            Back to Network
          </Link>
          <span className="text-sm font-semibold text-muted-foreground">NetWorks</span>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* 1. Account */}
          <Card className="p-6">
            <SectionTitle className="mb-4">Account</SectionTitle>

            {user ? (
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold shrink-0">
                  {avatarLetter}
                </div>
                <div className="min-w-0">
                  {user.displayName && (
                    <p className="text-foreground font-semibold text-lg leading-tight truncate">
                      {user.displayName}
                    </p>
                  )}
                  {user.email && (
                    <p className="text-muted-foreground text-sm truncate">{user.email}</p>
                  )}
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {planLabel} &middot; {contacts.length} contacts
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted-foreground"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      You're using NetWorks without an account
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Your data is stored locally in this browser.
                    </p>
                  </div>
                </div>
                <Button variant="primary" onClick={() => navigate('/auth')}>
                  Create Account to Sync &amp; Back Up
                </Button>
              </div>
            )}
          </Card>

          {/* 2. Preferences */}
          <Card className="p-6">
            <SectionTitle className="mb-4">Preferences</SectionTitle>

            {/* Color mode */}
            <div className="mb-5">
              <p className="text-muted-foreground text-sm mb-2">Color Mode</p>
              <div className="flex gap-1 rounded-lg bg-secondary p-1">
                {(['system', 'light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
                      theme === t
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <p className="text-muted-foreground text-sm mb-2">Theme</p>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => {
                  const unlocked = isThemeUnlocked(t.id, userTier)
                  const active = themeId === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => unlocked && setThemeId(t.id)}
                      className={`relative flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-all ${
                        active
                          ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                          : unlocked
                            ? 'border-border bg-background text-foreground hover:bg-secondary'
                            : 'border-border bg-background text-muted-foreground opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Color preview dots */}
                      <span className="flex gap-1">
                        <span
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{ background: t.preview.bg }}
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{ background: t.preview.primary }}
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{ background: t.preview.accent }}
                        />
                      </span>
                      {t.name}
                      {!unlocked && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0"
                        >
                          <rect x="3" y="7" width="10" height="7" rx="1.5" />
                          <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* 3. Billing */}
          <Card className="p-6">
            <SectionTitle className="mb-4">Billing</SectionTitle>

            {!user ? (
              <p className="text-sm text-muted-foreground">
                Sign in to check your RevenueCat entitlements and unlock lifetime access.
              </p>
            ) : !revenueCat.configured ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  RevenueCat is not configured in this build.
                </p>
                <p className="text-sm text-muted-foreground">
                  Add VITE_REVENUECAT_WEB_BILLING_PUBLIC_API_KEY to your local environment to load billing state.
                </p>
                <p className="text-sm text-muted-foreground">
                  Expected premium entitlement keys: {expectedEntitlements.join(', ')}
                </p>
              </div>
            ) : revenueCat.loading ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
                Checking RevenueCat entitlements...
              </div>
            ) : revenueCat.error ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">RevenueCat lookup failed.</p>
                <p className="text-sm text-destructive">{revenueCat.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Access</p>
                    <p className="text-sm text-muted-foreground">
                      {userTier === 'paid'
                        ? 'Premium lifetime entitlement is active.'
                        : 'No matching premium entitlement is active.'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      userTier === 'paid'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {planLabel}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Active entitlements</p>
                  {revenueCat.activeEntitlements.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {revenueCat.activeEntitlements.map((entitlementId) => (
                        <span
                          key={entitlementId}
                          className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium text-foreground"
                        >
                          {entitlementId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active entitlements found for this account.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Premium keys checked</p>
                  <p className="text-sm text-muted-foreground">{expectedEntitlements.join(', ')}</p>
                </div>
              </div>
            )}
          </Card>

          {/* 4. Data */}
          <Card className="p-6">
            <SectionTitle className="mb-4">Data</SectionTitle>
            <div className="flex flex-col gap-3">
              <p className="text-foreground text-sm">Contacts: {contacts.length}</p>
              <p className="text-foreground text-sm">
                Interactions logged: {interactionCount}
              </p>
              {user && (
                <div className="pt-1">
                  <Button variant="secondary" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* 5. Danger Zone */}
          <Card className="p-6">
            <SectionTitle className="mb-4 text-destructive">Danger Zone</SectionTitle>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-foreground text-sm font-medium">Delete All Data</p>
                  <p className="text-muted-foreground text-sm">
                    Permanently remove all contacts and interactions.
                  </p>
                </div>
                <Button variant="danger" onClick={() => setDeleteDataOpen(true)}>
                  Delete All Data
                </Button>
              </div>

              {user && (
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-foreground text-sm font-medium">Delete Account</p>
                    <p className="text-muted-foreground text-sm">
                      Permanently delete your account and all cloud data.
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => setDeleteAccountOpen(true)}>
                    Delete Account
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirm: Delete All Data */}
      <ConfirmDialog
        open={deleteDataOpen}
        onOpenChange={setDeleteDataOpen}
        title="Delete All Data?"
        description="This will permanently remove all your contacts and interactions. This action cannot be undone."
        confirmLabel="Delete All Data"
        variant="danger"
        onConfirm={handleDeleteAllData}
      />

      {/* Confirm: Delete Account */}
      <ConfirmDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        title="Delete Account?"
        description="This will permanently delete your account and all associated cloud data. This action cannot be undone."
        confirmLabel="Delete Account"
        variant="danger"
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
