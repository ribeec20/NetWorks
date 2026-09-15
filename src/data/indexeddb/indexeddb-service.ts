import type { DataService } from '../data-service'
import type {
  Contact,
  Interaction,
  OngoingBuilder,
  Connection,
  UserProfile,
} from '../../types'
import { db } from './db'

export class IndexedDBService implements DataService {
  // Contacts
  async getAllContacts(): Promise<Contact[]> {
    return db.contacts.toArray()
  }

  async getContact(id: string): Promise<Contact | null> {
    return (await db.contacts.get(id)) ?? null
  }

  async createContact(contact: Contact): Promise<void> {
    await db.contacts.add(contact)
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<void> {
    await db.contacts.update(id, { ...updates, updatedAt: Date.now() })
  }

  async deleteContact(id: string): Promise<void> {
    await db.transaction('rw', [db.contacts, db.interactions, db.ongoingBuilders, db.connections], async () => {
      await db.contacts.delete(id)
      await db.interactions.where('contactId').equals(id).delete()
      await db.ongoingBuilders.where('contactId').equals(id).delete()
      // Delete connections where this contact is source or target
      await db.connections.where('sourceId').equals(id).delete()
      await db.connections.where('targetId').equals(id).delete()
    })
  }

  async getContactCount(): Promise<number> {
    return db.contacts.count()
  }

  // Interactions
  async getInteractions(contactId: string): Promise<Interaction[]> {
    return db.interactions.where('contactId').equals(contactId).reverse().sortBy('date')
  }

  async getAllInteractions(): Promise<Interaction[]> {
    return db.interactions.toArray()
  }

  async createInteraction(interaction: Interaction): Promise<void> {
    await db.interactions.add(interaction)
  }

  async deleteInteraction(interactionId: string): Promise<void> {
    await db.interactions.delete(interactionId)
  }

  // Ongoing Builders
  async getBuilders(contactId: string): Promise<OngoingBuilder[]> {
    return db.ongoingBuilders.where('contactId').equals(contactId).toArray()
  }

  async getAllBuilders(): Promise<OngoingBuilder[]> {
    return db.ongoingBuilders.toArray()
  }

  async createBuilder(builder: OngoingBuilder): Promise<void> {
    await db.ongoingBuilders.add(builder)
  }

  async updateBuilder(id: string, updates: Partial<OngoingBuilder>): Promise<void> {
    await db.ongoingBuilders.update(id, updates)
  }

  // Connections
  async getAllConnections(): Promise<Connection[]> {
    return db.connections.toArray()
  }

  async getConnection(id: string): Promise<Connection | null> {
    return (await db.connections.get(id)) ?? null
  }

  async getConnectionsForContact(contactId: string): Promise<Connection[]> {
    const [asSource, asTarget] = await Promise.all([
      db.connections.where('sourceId').equals(contactId).toArray(),
      db.connections.where('targetId').equals(contactId).toArray(),
    ])
    const seen = new Set<string>()
    const results: Connection[] = []
    for (const c of [...asSource, ...asTarget]) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        results.push(c)
      }
    }
    return results
  }

  async upsertConnection(connection: Connection): Promise<void> {
    await db.connections.put(connection)
  }

  async deleteConnection(id: string): Promise<void> {
    await db.connections.delete(id)
  }

  async deleteConnectionsForContact(contactId: string): Promise<void> {
    await db.connections.where('sourceId').equals(contactId).delete()
    await db.connections.where('targetId').equals(contactId).delete()
  }

  // User Profile
  async getUserProfile(): Promise<UserProfile | null> {
    const all = await db.userProfile.toArray()
    return all[0] ?? null
  }

  async updateUserProfile(profile: UserProfile): Promise<void> {
    await db.userProfile.put(profile)
  }
}
