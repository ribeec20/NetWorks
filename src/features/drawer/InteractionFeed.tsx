import { useState, useEffect } from 'react'
import { getDataService } from '../../data/provider'
import type { Interaction, InteractionType } from '../../types'

const TYPE_ICONS: Record<InteractionType, string> = {
  message: '\u{1F4AC}',
  email: '\u{1F4E7}',
  call: '\u{1F4DE}',
  video_call: '\u{1F4F9}',
  coffee_lunch: '\u{2615}',
  meeting: '\u{1F3E2}',
  event: '\u{1F3AA}',
  collaboration: '\u{1F91D}',
  other: '\u{1F4DD}',
}

const TYPE_LABELS: Record<InteractionType, string> = {
  message: 'Message',
  email: 'Email',
  call: 'Call',
  video_call: 'Video Call',
  coffee_lunch: 'Coffee / Lunch',
  meeting: 'Meeting',
  event: 'Event',
  collaboration: 'Collaboration',
  other: 'Other',
}

interface InteractionFeedProps {
  contactId: string
}

export default function InteractionFeed({ contactId }: InteractionFeedProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])

  useEffect(() => {
    const load = async () => {
      const ds = getDataService()
      const data = await ds.getInteractions(contactId)
      setInteractions(data)
    }
    load()
  }, [contactId])

  if (interactions.length === 0) {
    return (
      <div className="glass-2 mt-2 flex flex-col items-center rounded-xl border-dashed px-card py-8 text-center">
        <p className="text-[13px] text-muted-foreground">No interactions logged yet.</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Start by logging your first one above.</p>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2.5">
      {interactions.map((interaction) => (
        <div
          key={interaction.id}
          className="glass-2 rounded-xl p-card transition-all duration-150 hover:bg-[var(--glass-3-bg)]"
        >
          <div className="flex items-center gap-2.5 text-[13px]">
            <span className="text-[17px] leading-none">{TYPE_ICONS[interaction.type]}</span>
            <span className="font-medium text-foreground">{TYPE_LABELS[interaction.type]}</span>
            <span className="text-border">&middot;</span>
            <span className="text-muted-foreground">
              {new Date(interaction.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {interaction.duration && (
              <>
                <span className="text-border">&middot;</span>
                <span className="text-muted-foreground">{interaction.duration} min</span>
              </>
            )}
          </div>
          {interaction.notes && (
            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {interaction.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
