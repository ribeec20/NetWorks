import { create } from 'zustand'
import type { Contact, Connection, InteractionType } from '../types'
import { getDataService } from '../data/provider'
import { generateId } from '../utils/id'
import { recalcAll } from '../algorithm/recalculate'
import { MIN_RADIUS, MAX_RADIUS, getStrengthBand, getStrengthRadius } from '../graph/rings'
import { pushStrengthHistory } from '../utils/strength-history'

const SELF_ID = 'self'

interface ContactState {
  contacts: Contact[]
  connections: Connection[]
  loading: boolean
  initialized: boolean

  // Actions
  loadAll: () => Promise<void>
  createContact: (
    data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'dateAdded' | 'strength' | 'strengthHistory' | 'x' | 'y'>,
    referrerId?: string | null,
    firstInteraction?: { type: InteractionType; notes: string; date: number } | null,
  ) => Promise<Contact>

  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  upsertConnection: (conn: Connection) => Promise<void>
  deleteConnection: (id: string) => Promise<void>
  recalculateAllStrengths: () => Promise<void>
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  connections: [],
  loading: false,
  initialized: false,

  loadAll: async () => {
    if (get().loading) return
    set({ loading: true })
    const ds = getDataService()
    const [contacts, connections] = await Promise.all([
      ds.getAllContacts(),
      ds.getAllConnections(),
    ])
    set({ contacts, connections, loading: false, initialized: true })
  },

  createContact: async (data, referrerId, firstInteraction) => {
    const now = Date.now()
    const contact: Contact = {
      ...data,
      id: generateId(),
      strength: 10,
      strengthHistory: [],
      x: null,
      y: null,
      dateAdded: now,
      createdAt: now,
      updatedAt: now,
    }
    const ds = getDataService()
    await ds.createContact(contact)

    // Create connection from self → new contact
    const isReferral = !!referrerId
    const selfConn: Connection = {
      id: generateId(),
      sourceId: SELF_ID,
      targetId: contact.id,
      isDirect: !isReferral,
      referralSource: referrerId ?? null,
      label: null,
      createdAt: now,
      updatedAt: now,
    }
    await ds.upsertConnection(selfConn)

    // If referred, also create connection between referrer and new contact
    const newConnections: Connection[] = [selfConn]
    if (isReferral && referrerId) {
      const referralConn: Connection = {
        id: generateId(),
        sourceId: referrerId,
        targetId: contact.id,
        isDirect: true,
        referralSource: null,
        label: null,
        createdAt: now,
        updatedAt: now,
      }
      await ds.upsertConnection(referralConn)
      newConnections.push(referralConn)
    }

    // Create optional first interaction
    if (firstInteraction) {
      await ds.createInteraction({
        id: generateId(),
        contactId: contact.id,
        date: firstInteraction.date,
        type: firstInteraction.type,
        notes: firstInteraction.notes,
        duration: null,
        createdAt: now,
      })
    }

    set((state) => ({
      contacts: [...state.contacts, contact],
      connections: [...state.connections, ...newConnections],
    }))

    // Recalculate all strengths in background after graph changes
    get().recalculateAllStrengths()

    return contact
  },

  updateContact: async (id, updates) => {
    const ds = getDataService()
    await ds.updateContact(id, updates)
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    }))
  },

  deleteContact: async (id) => {
    const ds = getDataService()
    await ds.deleteContact(id)
    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
      connections: state.connections.filter(
        (conn) => conn.sourceId !== id && conn.targetId !== id
      ),
    }))

    // Recalculate all strengths in background after graph changes
    get().recalculateAllStrengths()
  },

  upsertConnection: async (conn) => {
    const ds = getDataService()
    await ds.upsertConnection(conn)
    set((state) => {
      const existing = state.connections.findIndex((c) => c.id === conn.id)
      if (existing >= 0) {
        const updated = [...state.connections]
        updated[existing] = conn
        return { connections: updated }
      }
      return { connections: [...state.connections, conn] }
    })
  },

  deleteConnection: async (id) => {
    const ds = getDataService()
    await ds.deleteConnection(id)
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    }))
  },

  recalculateAllStrengths: async () => {
    const { contacts, connections } = get()
    const ds = getDataService()
    const scores = await recalcAll(contacts, connections)

    // Batch update contacts: always reposition to correct radius, only log history when score changes.
    const updates: Promise<void>[] = []
    for (const [contactId, score] of scores) {
      const contact = contacts.find((c) => c.id === contactId)
      if (!contact) continue

      const scoreChanged = contact.strength !== score
      const patch: Partial<Contact> = { strength: score }

      if (scoreChanged) {
        patch.strengthHistory = pushStrengthHistory(contact.strengthHistory, score)
      }

      // Always recompute position to ensure it matches the canonical radius
      if (contact.x != null && contact.y != null) {
        const angle = Math.atan2(contact.y, contact.x)
        const band = getStrengthBand(score)
        const radius = getStrengthRadius(score, band, MIN_RADIUS, MAX_RADIUS)
        patch.x = Math.cos(angle) * radius
        patch.y = Math.sin(angle) * radius
      }

      updates.push(ds.updateContact(contactId, patch))
    }
    await Promise.all(updates)

    // Update local state in one shot
    set((state) => ({
      contacts: state.contacts.map((c) => {
        const newScore = scores.get(c.id)
        if (newScore === undefined) return c

        const scoreChanged = newScore !== c.strength
        const updated: Contact = { ...c, strength: newScore, updatedAt: Date.now() }

        if (scoreChanged) {
          updated.strengthHistory = pushStrengthHistory(c.strengthHistory, newScore)
        }

        // Always recompute position
        if (c.x != null && c.y != null) {
          const angle = Math.atan2(c.y, c.x)
          const band = getStrengthBand(newScore)
          const radius = getStrengthRadius(newScore, band, MIN_RADIUS, MAX_RADIUS)
          updated.x = Math.cos(angle) * radius
          updated.y = Math.sin(angle) * radius
        }

        return updated
      }),
    }))
  },
}))

export { SELF_ID }
