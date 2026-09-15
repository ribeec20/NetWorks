import { useCallback } from 'react'
import { useContactStore, SELF_ID } from '../stores/contact-store'
import { recalcForContact } from '../algorithm/recalculate'
import { pushStrengthHistory } from '../utils/strength-history'
import { MIN_RADIUS, MAX_RADIUS, getStrengthBand, getStrengthRadius } from '../graph/rings'

export function useStrengthRecalculator() {
  const contacts = useContactStore((s) => s.contacts)
  const connections = useContactStore((s) => s.connections)
  const updateContact = useContactStore((s) => s.updateContact)
  const upsertConnection = useContactStore((s) => s.upsertConnection)

  const recalculateForContact = useCallback(async (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId)
    if (!contact) return

    const result = await recalcForContact(contact, connections)
    if (!result) return

    const strengthHistory = pushStrengthHistory(contact.strengthHistory, result.score)
    const patch: Partial<typeof contact> = { strength: result.score, strengthHistory }

    // Reposition node to correct radius for new strength
    if (contact.x != null && contact.y != null) {
      const angle = Math.atan2(contact.y, contact.x)
      const band = getStrengthBand(result.score)
      const radius = getStrengthRadius(result.score, band, MIN_RADIUS, MAX_RADIUS)
      patch.x = Math.cos(angle) * radius
      patch.y = Math.sin(angle) * radius
    }

    await updateContact(contactId, patch)

    // Transition indirect → direct if threshold crossed
    if (result.shouldTransitionToDirect) {
      const selfConn = connections.find(
        (c) => c.sourceId === SELF_ID && c.targetId === contactId,
      )
      if (selfConn && !selfConn.isDirect) {
        await upsertConnection({ ...selfConn, isDirect: true, updatedAt: Date.now() })
      }
    }
  }, [contacts, connections, updateContact, upsertConnection])

  const recalculateAll = useCallback(async () => {
    for (const contact of contacts) {
      await recalculateForContact(contact.id)
    }
  }, [contacts, recalculateForContact])

  return { recalculateForContact, recalculateAll }
}
