import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import type { InteractionType } from '../../types'
import { getDataService } from '../../data/provider'
import { generateId } from '../../utils/id'
import { useStrengthRecalculator } from '../../hooks/useStrength'

const CADENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'rarely', label: 'Rarely' },
]

const INTERACTION_TYPE_OPTIONS = [
  { value: 'message', label: 'Message' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'coffee_lunch', label: 'Coffee / Lunch' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'collaboration', label: 'Collaboration' },
]

const CADENCE_INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  rarely: 180,
}

const SEED_WINDOW_DAYS = 90

interface RelationshipSeedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactName: string
}

export function RelationshipSeedDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
}: RelationshipSeedDialogProps) {
  const [cadence, setCadence] = useState('')
  const [interactionType, setInteractionType] = useState('')
  const [builderLabel, setBuilderLabel] = useState('')
  const [builderHours, setBuilderHours] = useState('')
  const [saving, setSaving] = useState(false)

  const { recalculateForContact } = useStrengthRecalculator()

  const handleConfirm = async () => {
    if (!cadence || !interactionType) return

    setSaving(true)
    try {
      const ds = getDataService()
      const now = Date.now()
      const msPerDay = 86_400_000
      const intervalDays = CADENCE_INTERVAL_DAYS[cadence]

      // Generate backdated interactions filling the 90-day window
      const interactions = []
      for (let daysAgo = 0; daysAgo < SEED_WINDOW_DAYS; daysAgo += intervalDays) {
        interactions.push({
          id: generateId(),
          contactId,
          date: now - daysAgo * msPerDay,
          type: interactionType as InteractionType,
          notes: '',
          duration: null,
          createdAt: now,
        })
      }

      // Write all seed interactions
      await Promise.all(interactions.map((i) => ds.createInteraction(i)))

      // Create builder if provided
      if (builderLabel.trim()) {
        await ds.createBuilder({
          id: generateId(),
          contactId,
          label: builderLabel.trim(),
          hoursPerWeek: builderHours ? parseFloat(builderHours) : null,
          startDate: now - SEED_WINDOW_DAYS * msPerDay,
          endDate: null,
          createdAt: now,
        })
      }

      // Recalculate strength with the new data
      await recalculateForContact(contactId)

      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Describe your relationship
            </Dialog.Title>

            <Dialog.Description className="mt-1.5 text-sm text-muted-foreground">
              Help the algorithm understand your existing relationship with{' '}
              <span className="font-medium text-foreground">{contactName}</span>.
              This is optional — you can skip and log interactions manually.
            </Dialog.Description>

            <div className="mt-5 flex flex-col gap-4">
              <Select
                label="How often do you typically interact?"
                value={cadence}
                onValueChange={setCadence}
                options={CADENCE_OPTIONS}
                placeholder="Select cadence..."
              />

              <Select
                label="What does that usually look like?"
                value={interactionType}
                onValueChange={setInteractionType}
                options={INTERACTION_TYPE_OPTIONS}
                placeholder="Select interaction type..."
              />

              <div className="mt-1 border-t border-border pt-4">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ongoing shared activity
                  <span className="ml-1 font-medium normal-case tracking-normal text-muted-foreground/70">(optional)</span>
                </span>
                <div className="mt-2 grid grid-cols-[1fr_100px] gap-3">
                  <Input
                    id="seed-builder-label"
                    placeholder="e.g. Mentorship, shared project..."
                    value={builderLabel}
                    onChange={(e) => setBuilderLabel(e.target.value)}
                  />
                  <Input
                    id="seed-builder-hours"
                    placeholder="hrs/wk"
                    type="number"
                    value={builderHours}
                    onChange={(e) => setBuilderHours(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                Skip
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={saving || !cadence || !interactionType}
              >
                {saving ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
