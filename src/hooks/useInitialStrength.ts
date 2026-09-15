import { useEffect, useRef } from 'react'
import { useContactStore, SELF_ID } from '../stores/contact-store'
import { getDataService } from '../data/provider'
import { computeStrength } from '../algorithm/strength'
import { pushStrengthHistory } from '../utils/strength-history'

/**
 * Recalculates strength for all contacts on initial load.
 * This applies time-based decay and updates stale scores.
 * Writes the computed strength directly to the contact document.
 */
export function useInitialStrength() {
  const contacts = useContactStore((s) => s.contacts)
  const connections = useContactStore((s) => s.connections)
  const initialized = useContactStore((s) => s.initialized)
  const updateContact = useContactStore((s) => s.updateContact)
  const upsertConnection = useContactStore((s) => s.upsertConnection)
  const hasRun = useRef(false)

  useEffect(() => {
    if (!initialized || contacts.length === 0 || hasRun.current) return
    hasRun.current = true

    const recalcAll = async () => {
      const ds = getDataService()
      for (const contact of contacts) {
        const [interactions, builders] = await Promise.all([
          ds.getInteractions(contact.id),
          ds.getBuilders(contact.id),
        ])

        const selfConn = connections.find(
          (c) => c.sourceId === SELF_ID && c.targetId === contact.id,
        )
        const isDirect = selfConn?.isDirect ?? true

        const result = computeStrength(contact, interactions, builders, isDirect)

        // Write strength to contact
        if (result.score !== contact.strength) {
          const strengthHistory = pushStrengthHistory(contact.strengthHistory, result.score)
          await updateContact(contact.id, { strength: result.score, strengthHistory })
        }

        // Transition indirect → direct if threshold crossed
        if (selfConn && result.shouldTransitionToDirect && !selfConn.isDirect) {
          await upsertConnection({ ...selfConn, isDirect: true, updatedAt: Date.now() })
        }
      }
    }

    recalcAll()
  }, [initialized, contacts, connections, updateContact, upsertConnection])
}
