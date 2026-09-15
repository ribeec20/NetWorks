import { useState, type FormEvent } from 'react'
import { useUIStore } from '../../stores/ui-store'
import { useContactStore } from '../../stores/contact-store'
import { getDataService } from '../../data/provider'
import { generateId } from '../../utils/id'
import Input from '../../components/ui/Input'
import DateInput from '../../components/ui/DateInput'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import type { InteractionType } from '../../types'

const INTERACTION_TYPE_OPTIONS = [
  { value: 'message', label: 'Message' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'coffee_lunch', label: 'Coffee / Lunch' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'event', label: 'Event' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'other', label: 'Other' },
]

export default function InteractionForm() {
  const activeContactId = useUIStore((s) => s.activeContactId)
  const setDrawerMode = useUIStore((s) => s.setDrawerMode)
  const contacts = useContactStore((s) => s.contacts)
  const contact = contacts.find((c) => c.id === activeContactId)

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState('')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeContactId || !type) return

    setSaving(true)
    try {
      const ds = getDataService()
      await ds.createInteraction({
        id: generateId(),
        contactId: activeContactId,
        date: new Date(date).getTime(),
        type: type as InteractionType,
        notes: notes.trim(),
        duration: duration ? parseInt(duration, 10) : null,
        createdAt: Date.now(),
      })
      setDrawerMode('view')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-transparent">
      {/* Back link */}
      <div className="border-b border-[var(--glass-border)] bg-transparent px-[var(--spacing-inset)] py-[var(--spacing-inset)]">
        <button
          type="button"
          onClick={() => setDrawerMode('view')}
          className="flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 10.5L5 7L8.5 3.5" />
          </svg>
          Back to {contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'contact'}
        </button>
      </div>

      <div className="drawer-scroll flex flex-1 flex-col gap-5 overflow-y-auto p-[var(--spacing-inset)]">
        <DateInput
          id="interaction-date"
          label="Date"
          mode="date"
          value={date}
          onChange={setDate}
        />

        <Select
          label="Type"
          required
          value={type}
          onValueChange={setType}
          options={INTERACTION_TYPE_OPTIONS}
          placeholder="Select type..."
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="interaction-notes" className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </label>
          <textarea
            id="interaction-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you discuss? Action items?"
            rows={5}
            className="rounded-lg border border-input bg-background px-3.5 py-2.5 text-[14px] text-foreground shadow-sm outline-none transition-all duration-150 placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <Input
          id="interaction-duration"
          label="Duration (minutes)"
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="border-t border-[var(--glass-border)] bg-transparent p-[var(--spacing-inset)]">
        <Button type="submit" disabled={saving || !type} className="w-full">
          {saving ? 'Saving...' : 'Save Interaction'}
        </Button>
      </div>
    </form>
  )
}
