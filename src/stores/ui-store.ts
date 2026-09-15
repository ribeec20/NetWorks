import { create } from 'zustand'
import { getDataService } from '../data/provider'
import { auth } from '../data/firebase-config'

export type DrawerMode = 'view' | 'add' | 'edit' | 'log-interaction' | 'add-connection'
export type Theme = 'light' | 'dark' | 'system'
export type ClusterBy = 'tag' | 'industry' | 'time-added'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

function loadTheme(): Theme {
  return (localStorage.getItem('theme') as Theme) ?? 'system'
}

function loadThemeId(): string {
  return localStorage.getItem('themeId') ?? 'default'
}

function loadShowWeb(): boolean {
  const stored = localStorage.getItem('showConnections')
  return stored === null ? true : stored === 'true'
}

function loadShowNames(): boolean {
  const stored = localStorage.getItem('showNames')
  return stored === null ? true : stored === 'true'
}

function applyThemeId(id: string) {
  if (id === 'default') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', id)
  }
}

/** Persist preferences to the user's Firestore profile (fire-and-forget). */
function syncPrefsToCloud(prefs: { theme?: Theme; themeId?: string; showConnections?: boolean; showNames?: boolean }) {
  if (!auth.currentUser) return
  const user = auth.currentUser
  getDataService()
    .getUserProfile()
    .then((profile) => {
      const updated = profile
        ? { ...profile, preferences: { ...profile.preferences, ...prefs } }
        : {
            id: user.uid,
            email: user.email ?? '',
            displayName: user.displayName ?? '',
            tier: 'free' as const,
            contactCount: 0,
            purchaseDate: null,
            createdAt: Date.now(),
            preferences: { ...prefs },
          }
      return getDataService().updateUserProfile(updated)
    })
    .catch(() => {/* best-effort */})
}

interface UIState {
  // Theme (color mode + visual theme)
  theme: Theme
  themeId: string
  setTheme: (theme: Theme) => void
  setThemeId: (id: string) => void

  // Drawer
  drawerOpen: boolean
  drawerMode: DrawerMode
  activeContactId: string | null
  referrerId: string | null

  // Graph display
  showWeb: boolean
  showNames: boolean

  // Contacts panel
  contactsPanelOpen: boolean

  // Clustering (display-only, not persisted)
  clusterBy: ClusterBy | null
  setClusterBy: (mode: ClusterBy | null) => void

  // Filters
  searchQuery: string
  tagFilter: string[]
  strengthRange: [number, number]
  companyFilter: string | null
  knownSinceFilter: string | null   // 'lt3m' | '3to12m' | '1to3y' | '3yplus'
  lastInteractionFilter: string | null // '1w' | '1m' | '3m' | '6m' | '6mplus'

  // Drawer actions
  openAdd: () => void
  openAddReferral: (referrerId?: string) => void
  openAddConnection: () => void
  openView: (contactId: string) => void
  openEdit: (contactId: string) => void
  openLogInteraction: (contactId: string) => void
  closeDrawer: () => void
  setDrawerMode: (mode: DrawerMode) => void

  // Graph display actions
  toggleShowWeb: () => void
  toggleShowNames: () => void

  // Contacts panel actions
  toggleContactsPanel: () => void

  // Filter actions
  setSearchQuery: (query: string) => void
  setTagFilter: (tags: string[]) => void
  setStrengthRange: (range: [number, number]) => void
  setCompanyFilter: (company: string | null) => void
  setKnownSinceFilter: (filter: string | null) => void
  setLastInteractionFilter: (filter: string | null) => void
  clearFilters: () => void
}

/** Load user display preferences from Firestore and apply them. */
export async function loadThemeFromCloud() {
  try {
    const profile = await getDataService().getUserProfile()
    const prefs = profile?.preferences
    if (prefs?.theme) {
      localStorage.setItem('theme', prefs.theme)
      applyTheme(prefs.theme)
      useUIStore.setState({ theme: prefs.theme })
    }
    if (prefs?.themeId) {
      localStorage.setItem('themeId', prefs.themeId)
      applyThemeId(prefs.themeId)
      useUIStore.setState({ themeId: prefs.themeId })
    }
    if (typeof prefs?.showConnections === 'boolean') {
      localStorage.setItem('showConnections', String(prefs.showConnections))
      useUIStore.setState({ showWeb: prefs.showConnections })
    }
    if (typeof prefs?.showNames === 'boolean') {
      localStorage.setItem('showNames', String(prefs.showNames))
      useUIStore.setState({ showNames: prefs.showNames })
    }
  } catch {/* best-effort */}
}

// Apply saved themeId on startup
applyThemeId(loadThemeId())

export const useUIStore = create<UIState>((set) => ({
  theme: loadTheme(),
  themeId: loadThemeId(),
  showWeb: loadShowWeb(),
  showNames: loadShowNames(),
  setTheme: (theme: Theme) => {
    localStorage.setItem('theme', theme)
    applyTheme(theme)
    syncPrefsToCloud({ theme })
    set({ theme })
  },
  setThemeId: (id: string) => {
    localStorage.setItem('themeId', id)
    applyThemeId(id)
    syncPrefsToCloud({ themeId: id })
    set({ themeId: id })
  },

  drawerOpen: false,
  drawerMode: 'view',
  activeContactId: null,
  referrerId: null,
  clusterBy: null,
  setClusterBy: (mode) => set({ clusterBy: mode }),

  contactsPanelOpen: false,
  searchQuery: '',
  tagFilter: [],
  strengthRange: [0, 100],
  companyFilter: null,
  knownSinceFilter: null,
  lastInteractionFilter: null,

  openAdd: () =>
    set({ drawerOpen: true, drawerMode: 'add', activeContactId: null, referrerId: null }),

  openAddReferral: (referrerId) =>
    set({ drawerOpen: true, drawerMode: 'add', activeContactId: null, referrerId: referrerId ?? 'pick' }),

  openAddConnection: () =>
    set({ drawerOpen: true, drawerMode: 'add-connection', activeContactId: null, referrerId: null }),

  openView: (contactId) =>
    set({ drawerOpen: true, drawerMode: 'view', activeContactId: contactId, referrerId: null }),

  openEdit: (contactId) =>
    set({ drawerOpen: true, drawerMode: 'edit', activeContactId: contactId, referrerId: null }),

  openLogInteraction: (contactId) =>
    set({ drawerOpen: true, drawerMode: 'log-interaction', activeContactId: contactId, referrerId: null }),

  closeDrawer: () =>
    set({ drawerOpen: false, activeContactId: null, referrerId: null }),

  setDrawerMode: (mode) => set({ drawerMode: mode }),

  toggleShowWeb: () => set((s) => {
    const showWeb = !s.showWeb
    localStorage.setItem('showConnections', String(showWeb))
    syncPrefsToCloud({ showConnections: showWeb })
    return { showWeb }
  }),
  toggleShowNames: () => set((s) => {
    const showNames = !s.showNames
    localStorage.setItem('showNames', String(showNames))
    syncPrefsToCloud({ showNames })
    return { showNames }
  }),
  toggleContactsPanel: () => set((s) => ({ contactsPanelOpen: !s.contactsPanelOpen })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setTagFilter: (tags) => set({ tagFilter: tags }),
  setStrengthRange: (range) => set({ strengthRange: range }),
  setCompanyFilter: (company) => set({ companyFilter: company }),
  setKnownSinceFilter: (filter) => set({ knownSinceFilter: filter }),
  setLastInteractionFilter: (filter) => set({ lastInteractionFilter: filter }),
  clearFilters: () => set({
    searchQuery: '',
    tagFilter: [],
    strengthRange: [0, 100],
    companyFilter: null,
    knownSinceFilter: null,
    lastInteractionFilter: null,
  }),
}))
