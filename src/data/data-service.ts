import type {
  Contact,
  Interaction,
  OngoingBuilder,
  Connection,
  UserProfile,
} from '../types'

export interface DataService {
  // Contacts
  getAllContacts(): Promise<Contact[]>
  getContact(id: string): Promise<Contact | null>
  createContact(contact: Contact): Promise<void>
  updateContact(id: string, updates: Partial<Contact>): Promise<void>
  deleteContact(id: string): Promise<void>
  getContactCount(): Promise<number>

  // Interactions
  getInteractions(contactId: string): Promise<Interaction[]>
  getAllInteractions(): Promise<Interaction[]>
  createInteraction(interaction: Interaction): Promise<void>
  deleteInteraction(interactionId: string): Promise<void>

  // Ongoing Builders
  getBuilders(contactId: string): Promise<OngoingBuilder[]>
  getAllBuilders(): Promise<OngoingBuilder[]>
  createBuilder(builder: OngoingBuilder): Promise<void>
  updateBuilder(id: string, updates: Partial<OngoingBuilder>): Promise<void>

  // Connections
  getAllConnections(): Promise<Connection[]>
  getConnection(id: string): Promise<Connection | null>
  getConnectionsForContact(contactId: string): Promise<Connection[]>
  upsertConnection(connection: Connection): Promise<void>
  deleteConnection(id: string): Promise<void>
  deleteConnectionsForContact(contactId: string): Promise<void>

  // User Profile
  getUserProfile(): Promise<UserProfile | null>
  updateUserProfile(profile: UserProfile): Promise<void>
}
