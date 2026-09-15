import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { firestore } from '../firebase-config'
import type { DataService } from '../data-service'
import type {
  Contact,
  Interaction,
  OngoingBuilder,
  Connection,
  UserProfile,
} from '../../types'

/**
 * Firestore structure (matches Spec.md, with unified Connection):
 *
 * users/{userId}                                          → UserProfile
 * users/{userId}/contacts/{contactId}                     → Contact
 * users/{userId}/contacts/{contactId}/interactions/{id}   → Interaction
 * users/{userId}/contacts/{contactId}/builders/{id}       → OngoingBuilder
 * users/{userId}/connections/{id}                         → Connection
 */
export class FirestoreService implements DataService {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  private userDoc() {
    return doc(firestore, 'users', this.userId)
  }

  private contactsCol() {
    return collection(firestore, 'users', this.userId, 'contacts')
  }

  private contactDoc(contactId: string) {
    return doc(firestore, 'users', this.userId, 'contacts', contactId)
  }

  private interactionsCol(contactId: string) {
    return collection(firestore, 'users', this.userId, 'contacts', contactId, 'interactions')
  }

  private buildersCol(contactId: string) {
    return collection(firestore, 'users', this.userId, 'contacts', contactId, 'builders')
  }

  private connectionsCol() {
    return collection(firestore, 'users', this.userId, 'connections')
  }

  // --- Contacts ---

  async getAllContacts(): Promise<Contact[]> {
    const snap = await getDocs(this.contactsCol())
    return snap.docs.map((d) => d.data() as Contact)
  }

  async getContact(id: string): Promise<Contact | null> {
    const snap = await getDoc(this.contactDoc(id))
    return snap.exists() ? (snap.data() as Contact) : null
  }

  async createContact(contact: Contact): Promise<void> {
    await setDoc(this.contactDoc(contact.id), contact)
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<void> {
    await updateDoc(this.contactDoc(id), { ...updates, updatedAt: Date.now() })
  }

  async deleteContact(id: string): Promise<void> {
    const batch = writeBatch(firestore)

    // Delete nested interactions
    const interSnap = await getDocs(this.interactionsCol(id))
    interSnap.docs.forEach((d) => batch.delete(d.ref))

    // Delete nested builders
    const builderSnap = await getDocs(this.buildersCol(id))
    builderSnap.docs.forEach((d) => batch.delete(d.ref))

    // Delete connections involving this contact (source or target)
    const connSourceSnap = await getDocs(query(this.connectionsCol(), where('sourceId', '==', id)))
    connSourceSnap.docs.forEach((d) => batch.delete(d.ref))

    const connTargetSnap = await getDocs(query(this.connectionsCol(), where('targetId', '==', id)))
    connTargetSnap.docs.forEach((d) => batch.delete(d.ref))

    // Delete the contact doc itself
    batch.delete(this.contactDoc(id))

    await batch.commit()
  }

  async getContactCount(): Promise<number> {
    const snap = await getDocs(this.contactsCol())
    return snap.size
  }

  // --- Interactions (nested under contact) ---

  async getInteractions(contactId: string): Promise<Interaction[]> {
    const snap = await getDocs(this.interactionsCol(contactId))
    return snap.docs.map((d) => d.data() as Interaction).sort((a, b) => b.date - a.date)
  }

  async getAllInteractions(): Promise<Interaction[]> {
    // Use collectionGroup to query all interactions across all contacts
    const snap = await getDocs(
      query(collectionGroup(firestore, 'interactions'))
    )
    // Filter to only this user's interactions by checking the path
    const userPrefix = `users/${this.userId}/contacts/`
    return snap.docs
      .filter((d) => d.ref.path.startsWith(userPrefix))
      .map((d) => d.data() as Interaction)
  }

  async createInteraction(interaction: Interaction): Promise<void> {
    await setDoc(
      doc(this.interactionsCol(interaction.contactId), interaction.id),
      interaction,
    )
  }

  async deleteInteraction(interactionId: string): Promise<void> {
    // We need to find which contact this interaction belongs to
    const snap = await getDocs(
      query(collectionGroup(firestore, 'interactions'))
    )
    const userPrefix = `users/${this.userId}/contacts/`
    const match = snap.docs.find(
      (d) => d.ref.path.startsWith(userPrefix) && d.id === interactionId,
    )
    if (match) {
      await deleteDoc(match.ref)
    }
  }

  // --- Ongoing Builders (nested under contact) ---

  async getBuilders(contactId: string): Promise<OngoingBuilder[]> {
    const snap = await getDocs(this.buildersCol(contactId))
    return snap.docs.map((d) => d.data() as OngoingBuilder)
  }

  async getAllBuilders(): Promise<OngoingBuilder[]> {
    const snap = await getDocs(
      query(collectionGroup(firestore, 'builders'))
    )
    const userPrefix = `users/${this.userId}/contacts/`
    return snap.docs
      .filter((d) => d.ref.path.startsWith(userPrefix))
      .map((d) => d.data() as OngoingBuilder)
  }

  async createBuilder(builder: OngoingBuilder): Promise<void> {
    await setDoc(
      doc(this.buildersCol(builder.contactId), builder.id),
      builder,
    )
  }

  async updateBuilder(id: string, updates: Partial<OngoingBuilder>): Promise<void> {
    // Need to find the builder across contacts
    const snap = await getDocs(
      query(collectionGroup(firestore, 'builders'))
    )
    const userPrefix = `users/${this.userId}/contacts/`
    const match = snap.docs.find(
      (d) => d.ref.path.startsWith(userPrefix) && d.id === id,
    )
    if (match) {
      await updateDoc(match.ref, updates)
    }
  }

  // --- Connections (flat under user) ---

  async getAllConnections(): Promise<Connection[]> {
    const snap = await getDocs(this.connectionsCol())
    return snap.docs.map((d) => d.data() as Connection)
  }

  async getConnection(id: string): Promise<Connection | null> {
    const snap = await getDoc(doc(this.connectionsCol(), id))
    return snap.exists() ? (snap.data() as Connection) : null
  }

  async getConnectionsForContact(contactId: string): Promise<Connection[]> {
    const [sourceSnap, targetSnap] = await Promise.all([
      getDocs(query(this.connectionsCol(), where('sourceId', '==', contactId))),
      getDocs(query(this.connectionsCol(), where('targetId', '==', contactId))),
    ])
    const results = new Map<string, Connection>()
    for (const d of [...sourceSnap.docs, ...targetSnap.docs]) {
      results.set(d.id, d.data() as Connection)
    }
    return Array.from(results.values())
  }

  async upsertConnection(connection: Connection): Promise<void> {
    await setDoc(doc(this.connectionsCol(), connection.id), connection)
  }

  async deleteConnection(id: string): Promise<void> {
    await deleteDoc(doc(this.connectionsCol(), id))
  }

  async deleteConnectionsForContact(contactId: string): Promise<void> {
    const batch = writeBatch(firestore)
    const [sourceSnap, targetSnap] = await Promise.all([
      getDocs(query(this.connectionsCol(), where('sourceId', '==', contactId))),
      getDocs(query(this.connectionsCol(), where('targetId', '==', contactId))),
    ])
    for (const d of [...sourceSnap.docs, ...targetSnap.docs]) {
      batch.delete(d.ref)
    }
    await batch.commit()
  }

  // --- User Profile ---

  async getUserProfile(): Promise<UserProfile | null> {
    const snap = await getDoc(this.userDoc())
    return snap.exists() ? (snap.data() as UserProfile) : null
  }

  async updateUserProfile(profile: UserProfile): Promise<void> {
    await setDoc(this.userDoc(), profile)
  }
}
