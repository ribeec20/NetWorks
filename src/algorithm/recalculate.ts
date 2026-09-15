import type { Contact, Connection } from '../types'
import { getDataService } from '../data/provider'
import { computeStrength } from './strength'

const SELF_ID = 'self'

/**
 * Recalculate strength for a single contact.
 * Returns the updated score (or null if contact not found).
 */
export async function recalcForContact(
  contact: Contact,
  connections: Connection[],
): Promise<{ score: number; shouldTransitionToDirect: boolean } | null> {
  const ds = getDataService()
  const [interactions, builders] = await Promise.all([
    ds.getInteractions(contact.id),
    ds.getBuilders(contact.id),
  ])

  const selfConn = connections.find(
    (c) => c.sourceId === SELF_ID && c.targetId === contact.id,
  )
  const isDirect = selfConn?.isDirect ?? true

  const result = computeStrength(contact, interactions, builders, isDirect)
  return { score: result.score, shouldTransitionToDirect: result.shouldTransitionToDirect }
}

/**
 * Recalculate strength for all provided contacts.
 * Returns a map of contactId -> new score.
 */
export async function recalcAll(
  contacts: Contact[],
  connections: Connection[],
): Promise<Map<string, number>> {
  const results = new Map<string, number>()

  for (const contact of contacts) {
    const result = await recalcForContact(contact, connections)
    if (result) {
      results.set(contact.id, result.score)
    }
  }

  return results
}
