import { useState, useMemo, useRef, useEffect } from 'react'
import { useUIStore } from '../../stores/ui-store'
import { useContactStore, SELF_ID } from '../../stores/contact-store'
import { Card, SectionTitle } from '../../components/ui/Card'
import BuilderSection from './BuilderSection'
import InteractionFeed from './InteractionFeed'
import PositionHistory from './PositionHistory'
import type { CompanyPosition, SocialPlatform } from '../../types'
import { deltaToColor } from '../../utils/strength-history'

function currentPosition(positions: CompanyPosition[]): CompanyPosition | undefined {
  return positions.find((p) => p.endDate === null)
}

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  discord: 'Discord',
  bluesky: 'Bluesky',
  website: 'Website',
}

const SOCIAL_ABBREV: Record<SocialPlatform, string> = {
  twitter: 'X',
  linkedin: 'in',
  github: 'GH',
  instagram: 'IG',
  facebook: 'FB',
  tiktok: 'TT',
  youtube: 'YT',
  discord: 'DC',
  bluesky: 'BS',
  website: 'WEB',
}

function socialLabel(platform: SocialPlatform): string {
  return SOCIAL_LABELS[platform] ?? platform
}

function socialIcon(platform: SocialPlatform): string {
  return SOCIAL_ABBREV[platform] ?? platform.slice(0, 2).toUpperCase()
}

function NotesSection({ contactId, notes }: { contactId: string; notes: string }) {
  const updateContact = useContactStore((s) => s.updateContact)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(notes)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync draft when the contact's notes change externally
  useEffect(() => {
    if (!editing) setDraft(notes)
  }, [notes, editing])

  // Auto-focus and auto-resize when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current
      ta.focus()
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    }
  }, [editing])

  const notesHasContactInfo = useMemo(() => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const phoneRegex = /(\+?\d[\d\s\-().]{6,}\d)/
    return emailRegex.test(draft) || phoneRegex.test(draft)
  }, [draft])

  const save = async () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== notes) {
      await updateContact(contactId, { notes: trimmed })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Notes</SectionTitle>
      <Card className="p-section">
        {editing ? (
          <>
            {notesHasContactInfo && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M7 1L13 13H1L7 1Z" />
                  <line x1="7" y1="5.5" x2="7" y2="8.5" />
                  <circle cx="7" cy="10.5" r="0.5" fill="currentColor" />
                </svg>
                It looks like you've entered contact info — this field is not meant to store contact info. Refer to the TOS for details.
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDraft(notes)
                  setEditing(false)
                }
              }}
              placeholder="Add notes about this person..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              rows={3}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full text-left"
          >
            {draft ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">{draft}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">Click to add notes...</p>
            )}
          </button>
        )}
      </Card>
    </div>
  )
}

export default function ContactView() {
  const activeContactId = useUIStore((s) => s.activeContactId)
  const setDrawerMode = useUIStore((s) => s.setDrawerMode)
  const openLogInteraction = useUIStore((s) => s.openLogInteraction)
  const closeDrawer = useUIStore((s) => s.closeDrawer)
  const contacts = useContactStore((s) => s.contacts)
  const connections = useContactStore((s) => s.connections)
  const deleteContact = useContactStore((s) => s.deleteContact)

  const contact = contacts.find((c) => c.id === activeContactId)
  const selfConnection = connections.find(
    (c) => c.sourceId === SELF_ID && c.targetId === activeContactId,
  )

  if (!contact) {
    return <div className="p-section text-muted-foreground">Contact not found</div>
  }

  const fullName = `${contact.firstName} ${contact.lastName}`.trim()
  const current = currentPosition(contact.positions)

  const referrer = selfConnection?.referralSource
    ? contacts.find((c) => c.id === selfConnection.referralSource)
    : null

  const strength = contact.strength

  const strengthColor =
    strength >= 60
      ? 'bg-strength-strong'
      : strength >= 30
        ? 'bg-strength-growing'
        : 'bg-strength-weak'

  const strengthLabel =
    strength >= 60 ? 'Strong' : strength >= 30 ? 'Growing' : 'New'

  const history = contact.strengthHistory ?? []
  const latestDelta = history.length > 0 ? history[history.length - 1].delta : 0
  const recentHistory = history.slice(-12)

  const handleDelete = async () => {
    if (window.confirm(`Delete ${fullName}? This cannot be undone.`)) {
      await deleteContact(contact.id)
      closeDrawer()
    }
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="drawer-scroll flex flex-1 flex-col gap-5 overflow-y-auto p-[var(--spacing-inset)]">
        <Card className="overflow-hidden p-section">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xl font-bold text-primary">
                {contact.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="m-0 truncate text-xl font-bold leading-tight text-foreground">{fullName}</h2>
                {current && (current.role || current.company) && (
                  <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                    {current.role}
                    {current.role && current.company && <span className="mx-1 text-border">@</span>}
                    {current.company}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1">
              <button
                onClick={() => setDrawerMode('edit')}
                className="glass-2 group flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--glass-3-bg)] hover:text-primary"
                title="Edit Contact"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-active:scale-95">
                  <path d="M7.5 1.5L12.5 6.5M10.5 1.5C11.5 0.5 13 2 13 2C13 2 13.5 3.5 12.5 4.5L3.5 13.5H1V11L10.5 1.5Z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="glass-2 group flex h-6 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Delete Contact"
              >
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-active:scale-95">
                  <path d="M2.5 4H11.5" />
                  <path d="M5 4V2.5C5 2.22 5.22 2 5.5 2H8.5C8.78 2 9 2.22 9 2.5V4" />
                  <path d="M3.5 4L4 12C4 12.28 4.22 12.5 4.5 12.5H9.5C9.78 12.5 10 12.28 10 12L10.5 4" />
                </svg>
              </button>
            </div>
          </div>

          {contact.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="glass-3 rounded-md px-2.5 py-1 text-[12px] font-semibold text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Card>

        <NotesSection contactId={contact.id} notes={contact.notes ?? ''} />

        {contact.socials && contact.socials.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionTitle>Socials</SectionTitle>
            <Card className="p-section">
              <div className="flex flex-col gap-2.5">
                {contact.socials.map((social, i) => {
                  const isLink = social.value.startsWith('http://') || social.value.startsWith('https://')
                  return (
                    <div key={i} className="glass-2 flex items-center gap-3 rounded-xl p-card">
                      <span className="glass-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold uppercase text-muted-foreground">
                        {socialIcon(social.platform)}
                      </span>
                      <div className="min-w-0 flex-1">
                        {isLink ? (
                          <a
                            href={social.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-sm font-semibold text-primary hover:underline block"
                          >
                            {social.value}
                          </a>
                        ) : (
                          <p className="truncate text-sm font-semibold text-foreground">{social.value}</p>
                        )}
                      </div>
                      <span className="glass-3 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold capitalize text-muted-foreground">
                        {socialLabel(social.platform)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <SectionTitle>Relationship Status</SectionTitle>
          <Card className="p-section">
            <div className="glass-2 rounded-lg p-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Network Connection</p>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Known since</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(contact.dateFirstMet).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {referrer && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-primary">
                    <path d="M7 1L13 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-secondary-foreground">Referred by</span>
                  <span className="font-semibold text-primary">
                    {referrer.firstName} {referrer.lastName}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--glass-2-bg)]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${strengthColor}`}
                    style={{ width: `${strength}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="min-w-[2.5rem] text-right text-base font-bold tabular-nums text-foreground">{strength}</span>
                  {history.length > 0 && latestDelta !== 0 && (
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: deltaToColor(latestDelta) }}
                    >
                      {latestDelta > 0 ? '+' : ''}{latestDelta}
                    </span>
                  )}
                </div>
              </div>

              {recentHistory.length > 1 && (
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Trend</span>
                  {recentHistory.map((entry, i) => (
                    <span
                      key={i}
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: deltaToColor(entry.delta) }}
                      title={`${new Date(entry.date).toLocaleDateString()}: ${entry.strength} (${entry.delta > 0 ? '+' : ''}${entry.delta})`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {selfConnection?.isDirect ? 'Direct connection' : 'Indirect connection'}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    strength >= 60
                      ? 'bg-success/10 text-success ring-1 ring-success/20'
                      : strength >= 30
                        ? 'bg-warning/10 text-warning ring-1 ring-warning/20'
                        : 'bg-muted text-muted-foreground ring-1 ring-border'
                  }`}
                >
                  {strengthLabel}
                </span>
              </div>
              {contact.userStrengthOverride != null && (
                <p className="text-xs font-medium text-muted-foreground/70">
                  Manual override rating: {contact.userStrengthOverride}
                </p>
              )}
            </div>
          </Card>
        </div>

        <PositionHistory contactId={contact.id} positions={contact.positions} />

        <BuilderSection contactId={contact.id} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <SectionTitle>Interactions</SectionTitle>
            <button
              onClick={() => openLogInteraction(contact.id)}
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/15 active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="2" x2="6" y2="10" />
                <line x1="2" y1="6" x2="10" y2="6" />
              </svg>
              Log Interaction
            </button>
          </div>
          <Card className="p-section">
            <InteractionFeed contactId={contact.id} />
          </Card>
        </div>
      </div>

    </div>
  )
}
