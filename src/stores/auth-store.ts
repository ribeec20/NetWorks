import { create } from 'zustand'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import type { AuthError } from 'firebase/auth'
import { auth } from '../data/firebase-config'
import { setFirestoreService, resetDataService, getDataService } from '../data/provider'
import { useContactStore } from './contact-store'
import { loadThemeFromCloud } from './ui-store'
import { migrateLocalData } from '../data/migration'
import { FirestoreService } from '../data/firestore/firestore-service'
import type { UserProfile } from '../types/user'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Firebase Auth error code into a sentence the user can act on.
 * Returns null for cases where no error banner should be displayed
 * (e.g. user deliberately closed the Google popup).
 */
function toFriendlyError(err: unknown): string | null {
  const code = (err as AuthError)?.code ?? ''

  // Blocking functions (before_user_created) surface as auth/internal-error
  // with the custom message embedded in the error object.
  const message = (err as AuthError)?.message ?? ''

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists'
    case 'auth/invalid-email':
      return 'Invalid email address'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters'
    case 'auth/user-not-found':
      return 'No account found with this email'
    case 'auth/popup-closed-by-user':
      // User deliberately dismissed — not an error worth surfacing
      return null
    case 'auth/blocking-function-error-response':
      // Thrown by the before_user_created blocking function for non-allowlisted emails
      return 'NetWorks is currently in invite-only beta. Please contact the team for access.'
    default:
      // Catch-all: some blocking function errors arrive as auth/internal-error
      if (message.includes('invite-only') || message.includes('PERMISSION_DENIED')) {
        return 'NetWorks is currently in invite-only beta. Please contact the team for access.'
      }
      return 'Something went wrong. Please try again.'
  }
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

interface AuthState {
  /** The currently authenticated Firebase user, or null when signed out. */
  user: User | null

  /** True while a sign-in / sign-up / delete network operation is in flight. */
  loading: boolean

  /**
   * False until the very first onAuthStateChanged callback fires.
   * Use this to gate rendering the app (show a loading screen while false).
   */
  initialized: boolean

  /**
   * True while local IndexedDB data is being copied to Firestore.
   * Distinct from `loading` so the UI can show a dedicated migration banner.
   */
  migrating: boolean

  /** User-facing error string, or null when no error is present. */
  error: string | null

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Subscribe to Firebase Auth state changes.  Must be called once on app
   * startup (e.g. in App.tsx).  Calling it multiple times is safe — the
   * previous listener is unsubscribed automatically.
   */
  initAuth: () => void

  /** Open the Google sign-in popup, then migrate local data if the account is new to Firestore. */
  signInWithGoogle: () => Promise<void>

  /** Sign in with email + password, then migrate local data if needed. */
  signInWithEmail: (email: string, password: string) => Promise<void>

  /** Create a new email/password account with a display name, then migrate local data if needed. */
  createAccount: (email: string, password: string, displayName: string) => Promise<void>

  /** Sign the current user out.  onAuthStateChanged handles resetting the data service. */
  signOut: () => Promise<void>

  /**
   * Delete all Firestore data for the user, then permanently delete the
   * Firebase Auth account.  onAuthStateChanged handles the reset to IndexedDB.
   */
  deleteAccount: () => Promise<void>

  /** Clear the current error message (e.g. when the user dismisses an error banner). */
  clearError: () => void
}

// ---------------------------------------------------------------------------
// Module-level unsubscribe reference — prevents duplicate listeners
// ---------------------------------------------------------------------------

let _unsubscribeAuth: (() => void) | null = null

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  migrating: false,
  error: null,

  // -------------------------------------------------------------------------
  initAuth: () => {
    // Tear down any pre-existing listener before attaching a new one
    if (_unsubscribeAuth) {
      _unsubscribeAuth()
    }

    _unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser !== null) {
        // Switch the singleton data service to Firestore for this user
        setFirestoreService(firebaseUser.uid)
      } else {
        // No user — fall back to the local IndexedDB service
        resetDataService()
      }

      // Reload all contacts/connections from whichever service is now active
      await useContactStore.getState().loadAll()

      // Apply the user's cloud theme preference
      if (firebaseUser) {
        await loadThemeFromCloud()
      }

      set((state) => ({
        user: firebaseUser,
        // Only flip initialized once; subsequent auth changes leave it true
        initialized: state.initialized ? true : true,
      }))
    })
  },

  // -------------------------------------------------------------------------
  signInWithGoogle: async () => {
    set({ loading: true, error: null })
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())

      // Check whether this user already has data in Firestore.  If not,
      // migrate whatever they built locally before creating an account.
      await _runMigration(result.user.uid)
    } catch (err) {
      const message = toFriendlyError(err)
      set({ error: message })
    } finally {
      set({ loading: false })
    }
  },

  // -------------------------------------------------------------------------
  signInWithEmail: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await _runMigration(result.user.uid)
    } catch (err) {
      const message = toFriendlyError(err)
      set({ error: message })
    } finally {
      set({ loading: false })
    }
  },

  // -------------------------------------------------------------------------
  createAccount: async (email, password, displayName) => {
    set({ loading: true, error: null })
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      // Attach a display name to the Firebase Auth profile immediately
      await updateProfile(user, { displayName })
      await _runMigration(user.uid)
    } catch (err) {
      const message = toFriendlyError(err)
      set({ error: message })
    } finally {
      set({ loading: false })
    }
  },

  // -------------------------------------------------------------------------
  signOut: async () => {
    // onAuthStateChanged will fire with null → resetDataService + loadAll
    await firebaseSignOut(auth)
  },

  // -------------------------------------------------------------------------
  deleteAccount: async () => {
    const { user } = get()
    if (!user) return

    set({ loading: true, error: null })
    try {
      // Delete all Firestore data first while the user is still authenticated
      // and security rules will allow the deletes.
      const fs = new FirestoreService(user.uid)

      // deleteContact cascades interactions, builders, and connections for that contact
      const contacts = await fs.getAllContacts()
      for (const contact of contacts) {
        await fs.deleteContact(contact.id)
      }

      // Remove any connections that weren't tied to a specific contact
      // (e.g. self→contact connections whose contact was already deleted above
      // but whose connection row may still exist)
      const remainingConnections = await fs.getAllConnections()
      for (const connection of remainingConnections) {
        await fs.deleteConnection(connection.id)
      }

      // Permanently delete the Firebase Auth account.
      // onAuthStateChanged fires next → resetDataService() + loadAll() from IndexedDB.
      await user.delete()
    } catch (err) {
      const message = toFriendlyError(err)
      set({ error: message, loading: false })
    }
    // Note: we do NOT set loading: false on success here because the
    // onAuthStateChanged callback will update state and the component will
    // unmount the account settings screen anyway.
  },

  // -------------------------------------------------------------------------
  clearError: () => set({ error: null }),
}))

// ---------------------------------------------------------------------------
// Private helper — handles migration state around migrateLocalData
// ---------------------------------------------------------------------------

async function _runMigration(userId: string): Promise<void> {
  useAuthStore.setState({ migrating: true })
  try {
    await migrateLocalData(userId)
  } catch (err) {
    // Migration failed — surface the error but don't block sign-in.
    // The user is authenticated; they'll just keep using Firestore going forward
    // and their local data is still safe in IndexedDB.
    useAuthStore.setState({
      error: 'Your local data could not be migrated. Please try again later.',
    })
  } finally {
    useAuthStore.setState({ migrating: false })
  }

  // Ensure a UserProfile document exists in Firestore so that
  // preference syncing (theme, themeId, etc.) has a doc to write to.
  await _ensureUserProfile()
}

/**
 * Creates a UserProfile document in Firestore if one doesn't already exist.
 * Called after migration so that syncPrefsToCloud always has a doc to update.
 */
async function _ensureUserProfile(): Promise<void> {
  const user = auth.currentUser
  if (!user) return

  try {
    const ds = getDataService()
    const existing = await ds.getUserProfile()
    if (existing) return

    const profile: UserProfile = {
      id: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      tier: 'free',
      contactCount: 0,
      purchaseDate: null,
      createdAt: Date.now(),
      preferences: {},
    }
    await ds.updateUserProfile(profile)
  } catch {
    // Best-effort — don't block sign-in over a missing profile doc
  }
}
