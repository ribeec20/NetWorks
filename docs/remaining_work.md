# NetWorks — Remaining Work

## What's Built

- Project scaffolding (Vite + React + TypeScript + Tailwind + Radix UI)
- All TypeScript types (Contact, Interaction, Builder, Relationship, MutualConnection, UserProfile)
- Force-directed graph rendering (Sigma.js + Graphology + ForceAtlas2)
- Graph visuals: strength-based node sizing/coloring, edge thickness/color, curved edges for indirect connections, hover tooltips, node dragging
- IndexedDB storage layer (Dexie) behind a `DataService` abstraction interface
- Zustand stores (contact-store, ui-store)
- FAB button → opens add contact drawer
- Contact Drawer with View / Add / Edit / Log Interaction modes
- Contact Form (name, role, company, how-we-met, date, tags, referral variant)
- Contact View (profile, strength bar, how-we-met, builders section, interaction feed, edit/delete/referral actions)
- Interaction Form (date, type, notes, duration)
- Builder Section (inline add form, end builder, active/ended display)
- Interaction Feed (real data from IndexedDB, type icons, date, notes preview)
- Referral flow (pre-fills referrer, sets isDirect: false, auto-creates mutual connection edge)
- Strength algorithm files written + 21 unit tests passing (not yet wired into UI)
- TopBar component (user-created)

---

## Remaining Tasks

### Wire Strength Algorithm into UI
- Call `computeStrength()` after interaction/builder changes to update relationship scores
- Recalculate all scores on app load (apply time-based decay)
- Wire user strength override slider in ContactView
- Referral → direct transition when score crosses 40
- Files ready: `src/algorithm/`, `src/hooks/useStrength.ts`, `src/hooks/useInitialStrength.ts`

### Mutual Connections Picker
- Create `MutualConnectionPicker` component in contact view
- Dropdown to search/select another existing contact
- Optional label field
- Save creates mutual connection edge (already supported in data layer)
- Render mutual connection edges on graph (already handled in graph-builder)

### Firebase Auth + Firestore (Phase 9)
- Create `src/data/firestore/firebase-config.ts` — init from env vars
- Create `src/data/firestore/firestore-service.ts` — implements DataService using `onSnapshot`
- Create `src/features/auth/SignInPage.tsx` — Google + email/password auth
- Create `src/stores/auth-store.ts` — `onAuthStateChanged` listener
- Create `src/hooks/useAuth.ts` — signIn, createAccount, signOut
- Update `src/data/provider.ts` — return FirestoreService when authenticated
- Create `.env` with real Firebase config
- Create `firestore.rules` — user-scoped security rules

### Local → Cloud Migration (Phase 10)
- Create `src/data/migration.ts` — reads all IndexedDB, writes to Firestore in batches
- Trigger after successful auth if IndexedDB has data
- "Syncing your network..." loading state
- Handle edge case: Firestore already has data

### Tier Enforcement (Phase 11)
- Derive `canAddContact` from tier + contactCount in auth store
- Block save in ContactForm at 40-contact cap for free tier
- Create `UpgradeBanner` component (Tier 1: data loss warning, Tier 2 at cap: upgrade CTA)
- Firestore security rules for contact count enforcement

### Stripe Integration (Phase 12 — Deferred)
- Requires Cloud Functions backend
- Stripe Checkout session creation
- Webhook to update user tier
- Payment page component

### Search & Filters (Phase 14)
- Wire TopBar search box → filter contacts in store via fuzzy match
- Wire tag filter dropdown → multi-select existing tags
- Wire strength range filter
- Create `ResultsPanel` (left side, 280px, shows on active search/filter)
- Graph canvas: dim/hide non-matching nodes when filter active
- Clear filters button

### Settings Page
- Create `src/features/settings/SettingsPage.tsx`
- Account info section (name, email, tier, contact count)
- Upgrade CTA for Tier 1/2
- Preferences (layout, label display)
- Data summary stats
- Sign out button
- Danger zone (delete all data, delete account)

### Onboarding Tooltips
- Create `OnboardingTooltips` component
- Sequential tooltip tour on first visit: FAB → search → nodes → filters
- Store tour state in localStorage via `onboarding-store.ts`
- "Got it" dismiss + "Skip tour" link

### Responsive Layout
- Tablet (768–1024px): drawer overlays graph
- Mobile (<768px): drawer full-screen, FAB stays bottom-right
- Touch-enabled graph (pinch zoom, tap nodes)
