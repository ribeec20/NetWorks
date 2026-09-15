import { IndexedDBService } from './indexeddb/indexeddb-service'
import { FirestoreService } from './firestore/firestore-service'
import { db } from './indexeddb/db'

export interface MigrationResult {
  migrated: boolean
  contactCount: number
}

/**
 * Migrates all local IndexedDB data to Firestore for the given user.
 *
 * This is a pure function — it does not touch auth state or any Zustand store.
 * The caller is responsible for setting loading/migrating UI state.
 *
 * Safe to call even when IndexedDB is empty: returns { migrated: false, contactCount: 0 }.
 *
 * The IndexedDB database is only cleared after ALL Firestore writes succeed.
 * If any write fails, the error is re-thrown and IndexedDB is left intact so
 * the user's local data is never lost.
 */
export async function migrateLocalData(userId: string): Promise<MigrationResult> {
  const idb = new IndexedDBService()
  const contacts = await idb.getAllContacts()

  // Nothing to migrate — new user or already migrated
  if (contacts.length === 0) {
    return { migrated: false, contactCount: 0 }
  }

  const fs = new FirestoreService(userId)

  // All writes happen inside a single try block. If anything throws,
  // we propagate the error and leave IndexedDB untouched.
  try {
    // --- Contacts ---
    for (const contact of contacts) {
      await fs.createContact(contact)
    }

    // --- Interactions (nested under each contact) ---
    for (const contact of contacts) {
      const interactions = await idb.getInteractions(contact.id)
      for (const interaction of interactions) {
        await fs.createInteraction(interaction)
      }
    }

    // --- Ongoing Builders (nested under each contact) ---
    for (const contact of contacts) {
      const builders = await idb.getBuilders(contact.id)
      for (const builder of builders) {
        await fs.createBuilder(builder)
      }
    }

    // --- Connections (flat collection) ---
    const connections = await idb.getAllConnections()
    for (const connection of connections) {
      await fs.upsertConnection(connection)
    }

    // --- User Profile (if present) ---
    const profile = await idb.getUserProfile()
    if (profile) {
      await fs.updateUserProfile(profile)
    }

    // Only clear IndexedDB after every write has succeeded.
    // db.delete() drops the entire Dexie database so the next
    // IndexedDBService instantiation starts fresh.
    await db.delete()

    return { migrated: true, contactCount: contacts.length }
  } catch (err) {
    // Re-throw so the auth store can surface a user-friendly error
    // and leave IndexedDB intact for a future retry.
    throw err
  }
}
