import { useState } from 'react'
import { useUIStore } from '../../stores/ui-store'
import { useContactStore, SELF_ID } from '../../stores/contact-store'
import Button from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import { generateId } from '../../utils/id'
import type { Connection } from '../../types/connection'

export default function AddConnectionForm() {
  const closeDrawer = useUIStore((s) => s.closeDrawer)
  const contacts = useContactStore((s) => s.contacts)
  const connections = useContactStore((s) => s.connections)
  const upsertConnection = useContactStore((s) => s.upsertConnection)

  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [saving, setSaving] = useState(false)

  // Check if a connection already exists between two contacts (in either direction)
  const connectionExists = sourceId && targetId && connections.some(
    (c) =>
      (c.sourceId === sourceId && c.targetId === targetId) ||
      (c.sourceId === targetId && c.targetId === sourceId),
  )

  const canSave = sourceId && targetId && sourceId !== targetId && !connectionExists

  const handleSubmit = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const now = Date.now()
      const conn: Connection = {
        id: generateId(),
        sourceId,
        targetId,
        isDirect: true,
        referralSource: null,
        label: null,
        createdAt: now,
        updatedAt: now,
      }
      await upsertConnection(conn)
      closeDrawer()
    } finally {
      setSaving(false)
    }
  }

  const sortedContacts = [...contacts].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  )

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="drawer-scroll flex flex-1 flex-col gap-5 overflow-y-auto p-[var(--spacing-inset)]">
        <div className="flex flex-col gap-2">
          <SectionTitle>Connect Two People</SectionTitle>
          <Card className="p-section">
            <div className="flex flex-col gap-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Person 1 <span className="text-destructive">*</span>
                </span>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors hover:bg-secondary focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Select a contact...</option>
                  <option value={SELF_ID}>You</option>
                  {sortedContacts
                    .filter((c) => c.id !== targetId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-2-bg)] text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="7" y1="3" x2="7" y2="11" />
                    <path d="M4 8L7 11L10 8" />
                  </svg>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Person 2 <span className="text-destructive">*</span>
                </span>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors hover:bg-secondary focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Select a contact...</option>
                  <option value={SELF_ID}>You</option>
                  {sortedContacts
                    .filter((c) => c.id !== sourceId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {sourceId && targetId && sourceId === targetId && (
              <p className="mt-3 text-xs font-medium text-destructive">
                Cannot connect a person to themselves.
              </p>
            )}

            {connectionExists && (
              <p className="mt-3 text-xs font-medium text-warning">
                A connection already exists between these two people.
              </p>
            )}
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--glass-border)] bg-transparent p-[var(--spacing-inset)]">
        <Button variant="ghost" onClick={closeDrawer}>
          Cancel
        </Button>
        <Button
          disabled={!canSave || saving}
          onClick={handleSubmit}
          className="flex-1"
        >
          {saving ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
    </div>
  )
}
