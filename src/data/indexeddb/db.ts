import Dexie, { type Table } from 'dexie'
import type {
  Contact,
  Interaction,
  OngoingBuilder,
  Connection,
  UserProfile,
} from '../../types'

export class NetWorksDB extends Dexie {
  contacts!: Table<Contact, string>
  interactions!: Table<Interaction, string>
  ongoingBuilders!: Table<OngoingBuilder, string>
  connections!: Table<Connection, string>
  userProfile!: Table<UserProfile, string>

  constructor() {
    super('networks')

    this.version(1).stores({
      contacts: 'id, name, company, dateAdded',
      interactions: 'id, contactId, date, type',
      ongoingBuilders: 'id, contactId, startDate',
      relationships: 'id, contactId',
      mutualConnections: 'id, contactA, contactB',
      userProfile: 'id',
    })

    this.version(2).stores({
      contacts: 'id, firstName, lastName, dateAdded',
      interactions: 'id, contactId, date, type',
      ongoingBuilders: 'id, contactId, startDate',
      relationships: 'id, contactId',
      mutualConnections: 'id, contactA, contactB',
      userProfile: 'id',
    }).upgrade((tx) => {
      return tx.table('contacts').toCollection().modify((contact: Record<string, unknown>) => {
        const parts = String(contact.name ?? '').trim().split(/\s+/)
        contact.firstName = parts[0] ?? ''
        contact.lastName = parts.slice(1).join(' ') ?? ''
        delete contact.name

        const positions = []
        if (contact.role || contact.company) {
          positions.push({
            company: contact.company ?? '',
            role: contact.role ?? '',
            startDate: contact.dateFirstMet ?? contact.createdAt ?? Date.now(),
            endDate: null,
          })
        }
        contact.positions = positions
        delete contact.role
        delete contact.company
      })
    })
    this.version(3).stores({
      contacts: 'id, firstName, lastName, dateAdded',
      interactions: 'id, contactId, date, type',
      ongoingBuilders: 'id, contactId, startDate',
      relationships: 'id, contactId',
      mutualConnections: 'id, contactA, contactB',
      userProfile: 'id',
    }).upgrade((tx) => {
      return tx.table('contacts').toCollection().modify((contact: Record<string, unknown>) => {
        if (!contact.contactInfo) {
          contact.contactInfo = []
        }
        delete contact.howWeMet
      })
    })

    // v4: Migrate relationships + mutualConnections → unified connections table
    this.version(4).stores({
      contacts: 'id, firstName, lastName, dateAdded',
      interactions: 'id, contactId, date, type',
      ongoingBuilders: 'id, contactId, startDate',
      connections: 'id, sourceId, targetId',
      userProfile: 'id',
      // Drop old tables
      relationships: null,
      mutualConnections: null,
    }).upgrade(async (tx) => {
      const connections = tx.table('connections')

      // Migrate relationships → connections (sourceId = 'self')
      // Also copy strengthScore to the contact doc
      const rels = await tx.table('relationships').toArray()
      const strengthMap = new Map<string, number>()
      for (const rel of rels) {
        strengthMap.set(rel.contactId, rel.strengthScore ?? 0)
        await connections.add({
          id: rel.id,
          sourceId: 'self',
          targetId: rel.contactId,
          isDirect: rel.isDirect,
          referralSource: rel.referralSource,
          label: null,
          createdAt: rel.createdAt,
          updatedAt: rel.updatedAt,
        })
      }

      // Migrate mutual connections → connections
      const mcs = await tx.table('mutualConnections').toArray()
      for (const mc of mcs) {
        await connections.add({
          id: mc.id,
          sourceId: mc.contactA,
          targetId: mc.contactB,
          isDirect: true,
          referralSource: null,
          label: mc.label,
          createdAt: mc.createdAt,
          updatedAt: mc.createdAt,
        })
      }

      // Add strength, x, y to contacts
      await tx.table('contacts').toCollection().modify((contact: Record<string, unknown>) => {
        contact.strength = strengthMap.get(contact.id as string) ?? 0
        contact.x = null
        contact.y = null
      })
    })

    // v5: Add strength/x/y to contacts + remove strengthScore from connections
    // (for DBs that already ran v4 before these fields existed)
    this.version(5).stores({
      contacts: 'id, firstName, lastName, dateAdded',
      interactions: 'id, contactId, date, type',
      ongoingBuilders: 'id, contactId, startDate',
      connections: 'id, sourceId, targetId',
      userProfile: 'id',
    }).upgrade(async (tx) => {
      // Copy strength from connections to contacts, add x/y
      const conns = await tx.table('connections').toArray()
      const strengthMap = new Map<string, number>()
      for (const conn of conns) {
        if (conn.sourceId === 'self' && conn.strengthScore != null) {
          strengthMap.set(conn.targetId, conn.strengthScore)
        }
      }

      await tx.table('contacts').toCollection().modify((contact: Record<string, unknown>) => {
        if (contact.strength == null) {
          contact.strength = strengthMap.get(contact.id as string) ?? 0
        }
        if (contact.x === undefined) contact.x = null
        if (contact.y === undefined) contact.y = null
      })

      // Remove strengthScore from connections
      await tx.table('connections').toCollection().modify((conn: Record<string, unknown>) => {
        delete conn.strengthScore
      })
    })
    // v6: Add socials array to contacts
    this.version(6).stores({
      contacts: 'id, firstName, lastName, dateAdded',
      interactions: 'id, contactId, date, type',
      ongoingBuilders: 'id, contactId, startDate',
      connections: 'id, sourceId, targetId',
      userProfile: 'id',
    }).upgrade(async (tx) => {
      await tx.table('contacts').toCollection().modify((contact: Record<string, unknown>) => {
        if (!contact.socials) {
          contact.socials = []
        }
      })
    })
    // v7: Replace contactInfo array with notes string
    this.version(7).stores({
      contacts: 'id, firstName, lastName, dateAdded',
      interactions: 'id, contactId, date, type',
      ongoingBuilders: 'id, contactId, startDate',
      connections: 'id, sourceId, targetId',
      userProfile: 'id',
    }).upgrade(async (tx) => {
      await tx.table('contacts').toCollection().modify((contact: Record<string, unknown>) => {
        if (contact.notes === undefined) {
          contact.notes = ''
        }
        delete contact.contactInfo
      })
    })
  }
}

export const db = new NetWorksDB()
