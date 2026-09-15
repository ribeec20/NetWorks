import { useState, useMemo, type FormEvent } from 'react'
import { useUIStore } from '../../stores/ui-store'
import { useContactStore } from '../../stores/contact-store'
import Input from '../../components/ui/Input'
import DateInput from '../../components/ui/DateInput'
import TagInput from '../../components/ui/TagInput'
import Combobox from '../../components/ui/Combobox'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { Card, SectionTitle } from '../../components/ui/Card'
import { useTags } from '../../hooks/useTags'
import { RelationshipSeedDialog } from './RelationshipSeedDialog'
import type { CompanyPosition, InteractionType, SocialLink, SocialPlatform } from '../../types'

const SOCIAL_PLATFORM_OPTIONS: { value: SocialPlatform; label: string }[] = [
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'discord', label: 'Discord' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'website', label: 'Website' },
]

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

function currentPosition(positions: CompanyPosition[]): CompanyPosition | undefined {
  return positions.find((p) => p.endDate === null)
}

export default function ContactForm() {
  const drawerMode = useUIStore((s) => s.drawerMode)
  const activeContactId = useUIStore((s) => s.activeContactId)
  const referrerId = useUIStore((s) => s.referrerId)
  const closeDrawer = useUIStore((s) => s.closeDrawer)
  const setDrawerMode = useUIStore((s) => s.setDrawerMode)

  const contacts = useContactStore((s) => s.contacts)
  const createContact = useContactStore((s) => s.createContact)
  const updateContact = useContactStore((s) => s.updateContact)

  const { availableTags, allTags, addTag: addFirestoreTag, removeTag: removeFirestoreTag } = useTags()

  // Collect unique company names from all contacts for autocomplete
  const companySuggestions = useMemo(() => {
    const set = new Set<string>()
    for (const c of contacts) {
      for (const p of c.positions) {
        if (p.company?.trim()) set.add(p.company.trim())
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [contacts])

  const isEdit = drawerMode === 'edit'
  const existingContact = isEdit ? contacts.find((c) => c.id === activeContactId) : null
  const needsReferrerPick = referrerId === 'pick'
  const [pickedReferrerId, setPickedReferrerId] = useState('')
  const effectiveReferrerId = needsReferrerPick ? (pickedReferrerId || null) : referrerId
  const referrerContact = effectiveReferrerId ? contacts.find((c) => c.id === effectiveReferrerId) : null
  const isReferral = !!effectiveReferrerId

  const current = existingContact ? currentPosition(existingContact.positions) : undefined

  const [firstName, setFirstName] = useState(existingContact?.firstName ?? '')
  const [lastName, setLastName] = useState(existingContact?.lastName ?? '')
  const [role, setRole] = useState(current?.role ?? '')
  const [company, setCompany] = useState(current?.company ?? '')
  const [positionStartDate, setPositionStartDate] = useState(
    current?.startDate
      ? (() => { const d = new Date(current.startDate); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })()
      : ''
  )
  const [dateFirstMet, setDateFirstMet] = useState(
    existingContact
      ? new Date(existingContact.dateFirstMet).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [tags, setTags] = useState<string[]>(existingContact?.tags ?? [])
  const [notes, setNotes] = useState(existingContact?.notes ?? '')
  const [socialEntries, setSocialEntries] = useState<SocialLink[]>(
    existingContact?.socials ?? []
  )
  const [showFirstInteraction, setShowFirstInteraction] = useState(false)
  const [firstInteractionType, setFirstInteractionType] = useState('')
  const [firstInteractionDate, setFirstInteractionDate] = useState(new Date().toISOString().split('T')[0])
  const [firstInteractionNotes, setFirstInteractionNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [seedDialog, setSeedDialog] = useState<{ contactId: string; contactName: string } | null>(null)

  const notesHasContactInfo = useMemo(() => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const phoneRegex = /(\+?\d[\d\s\-().]{6,}\d)/
    return emailRegex.test(notes) || phoneRegex.test(notes)
  }, [notes])

  const addSocial = () => {
    setSocialEntries([...socialEntries, { platform: 'twitter', value: '' }])
  }

  const updateSocial = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialEntries]
    updated[index] = { ...updated[index], [field]: value }
    setSocialEntries(updated)
  }

  const removeSocial = (index: number) => {
    setSocialEntries(socialEntries.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) return
    if (needsReferrerPick && !pickedReferrerId) return

    setSaving(true)
    try {
      const trimmedRole = role.trim()
      const trimmedCompany = company.trim()
      const posStart = positionStartDate ? new Date(positionStartDate + '-01').getTime() : null

      // Build positions array
      let positions: CompanyPosition[]
      if (isEdit && existingContact) {
        // Keep past positions, update the current one
        const pastPositions = existingContact.positions.filter((p) => p.endDate !== null)
        if (trimmedRole || trimmedCompany) {
          // Check if current position changed
          if (current && current.role === trimmedRole && current.company === trimmedCompany) {
            // No change, keep as-is
            positions = [...pastPositions, current]
          } else if (current) {
            // End the old current position and create new one
            positions = [
              ...pastPositions,
              { ...current, endDate: posStart ?? Date.now() },
              { company: trimmedCompany, role: trimmedRole, startDate: posStart, endDate: null },
            ]
          } else {
            positions = [
              ...pastPositions,
              { company: trimmedCompany, role: trimmedRole, startDate: posStart, endDate: null },
            ]
          }
        } else {
          // Cleared role/company — end current if exists
          if (current) {
            positions = [...pastPositions, { ...current, endDate: Date.now() }]
          } else {
            positions = pastPositions
          }
        }
      } else {
        // New contact
        positions = (trimmedRole || trimmedCompany)
          ? [{ company: trimmedCompany, role: trimmedRole, startDate: posStart, endDate: null }]
          : []
      }

      // Filter out entries with empty values
      const validSocials = socialEntries.filter((s) => s.value.trim())

      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        positions,
        notes: notes.trim(),
        socials: validSocials,
        tags,
        dateFirstMet: new Date(dateFirstMet).getTime(),
        userStrengthOverride: existingContact?.userStrengthOverride ?? null,
      }

      // Persist any new tags to Firestore
      await Promise.all(
        tags
          .filter((t) => !availableTags.includes(t))
          .map((t) => addFirestoreTag(t)),
      )

      if (isEdit && activeContactId) {
        await updateContact(activeContactId, data)
        setDrawerMode('view')
      } else {
        const interaction = (showFirstInteraction && firstInteractionType)
          ? {
              type: firstInteractionType as InteractionType,
              notes: firstInteractionNotes.trim(),
              date: new Date(firstInteractionDate).getTime(),
            }
          : null
        const newContact = await createContact(data, effectiveReferrerId, interaction)

        // If dateFirstMet is more than 1 month in the past, offer to seed the relationship
        const oneMonthAgo = Date.now() - 30 * 86_400_000
        if (data.dateFirstMet < oneMonthAgo) {
          setSeedDialog({
            contactId: newContact.id,
            contactName: `${newContact.firstName} ${newContact.lastName}`.trim(),
          })
        } else {
          closeDrawer()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-transparent">
      <div className="drawer-scroll flex flex-1 flex-col gap-5 overflow-y-auto p-[var(--spacing-inset)]">
        <div className="flex flex-col gap-2">
          <SectionTitle>Basics</SectionTitle>
          <Card className="p-section">
            <div className="grid grid-cols-1 gap-4">
              <Input
                id="contact-first-name"
                label="First Name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
              <Input
                id="contact-last-name"
                label="Last Name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
            <div className="mt-4">
              <DateInput
                id="date-first-met"
                label="Date first met"
                mode="date"
                value={dateFirstMet}
                onChange={setDateFirstMet}
              />
            </div>
            {needsReferrerPick && (
              <div className="mt-4 flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Referred by <span className="text-destructive">*</span>
                </span>
                <select
                  value={pickedReferrerId}
                  onChange={(e) => setPickedReferrerId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors hover:bg-secondary focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Select referrer...</option>
                  {[...contacts]
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                </select>
              </div>
            )}
            {isReferral && referrerContact && !needsReferrerPick && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-primary">
                  <path d="M7 1L13 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="text-secondary-foreground">Referred by</span>
                <span className="font-semibold text-primary">
                  {referrerContact.firstName} {referrerContact.lastName}
                </span>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <SectionTitle>Notes</SectionTitle>
          <Card className="p-section">
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
              id="contact-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="General notes about this person..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <SectionTitle>Socials</SectionTitle>
            <button
              type="button"
              onClick={addSocial}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-all duration-150 hover:bg-primary/10 active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="6" y1="2" x2="6" y2="10" />
                <line x1="2" y1="6" x2="10" y2="6" />
              </svg>
              Add
            </button>
          </div>
          <Card className="p-section">
            <div className="space-y-2.5">
              {socialEntries.map((entry, i) => (
                <div key={i} className="glass-2 grid grid-cols-1 items-start gap-2.5 rounded-xl p-card">
                  <select
                    value={entry.platform}
                    onChange={(e) => updateSocial(i, 'platform', e.target.value as SocialPlatform)}
                    className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  >
                    {SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type={entry.platform === 'website' ? 'url' : 'text'}
                    value={entry.value}
                    onChange={(e) => updateSocial(i, 'value', e.target.value)}
                    placeholder={entry.platform === 'website' ? 'https://example.com' : `@username or profile link`}
                    className="min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeSocial(i)}
                    className="glass-3 shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="4" y1="4" x2="10" y2="10" />
                      <line x1="10" y1="4" x2="4" y2="10" />
                    </svg>
                  </button>
                </div>
              ))}
              {socialEntries.length === 0 && (
                <p className="glass-2 rounded-lg border-dashed px-card py-section text-center text-sm text-muted-foreground">
                  No socials added yet.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <SectionTitle>Current Position</SectionTitle>
          <Card className="p-section">
            <div className="grid grid-cols-1 gap-4">
              <Input
                id="contact-role"
                label="Role / Title"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. VP Engineering"
              />
              <Combobox
                id="contact-company"
                label="Company"
                value={company}
                onChange={setCompany}
                suggestions={companySuggestions}
                placeholder="e.g. Stripe"
              />
            </div>
            <div className="mt-4">
              <DateInput
                id="position-start-date"
                label="Started at company"
                mode="month"
                value={positionStartDate}
                onChange={setPositionStartDate}
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          <SectionTitle>Tags</SectionTitle>
          <Card className="overflow-visible p-section">
            <TagInput
              tags={tags}
              onChange={setTags}
              tagDefs={allTags}
              availableTags={availableTags}
              placeholder="Search or add tags..."
              onDeleteTag={(tag) => {
                setTags(tags.filter((t) => t !== tag))
                removeFirestoreTag(tag)
              }}
            />
          </Card>
        </div>

        {!isEdit && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowFirstInteraction(!showFirstInteraction)}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className={`transition-transform ${showFirstInteraction ? 'rotate-90' : ''}`}
              >
                <path d="M4.5 2.5L8 6L4.5 9.5" />
              </svg>
              First Interaction
              <span className="font-medium normal-case tracking-normal text-muted-foreground/70">(optional)</span>
            </button>

            {showFirstInteraction && (
              <Card className="p-section">
                <div className="flex flex-col gap-4">
                  <DateInput
                    id="first-interaction-date"
                    label="Date"
                    mode="date"
                    value={firstInteractionDate}
                    onChange={setFirstInteractionDate}
                  />
                  <Select
                    label="Type"
                    value={firstInteractionType}
                    onValueChange={setFirstInteractionType}
                    options={INTERACTION_TYPE_OPTIONS}
                    placeholder="Select type..."
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="first-interaction-notes" className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </label>
                    <textarea
                      id="first-interaction-notes"
                      value={firstInteractionNotes}
                      onChange={(e) => setFirstInteractionNotes(e.target.value)}
                      placeholder="How you met, context, first impression..."
                      rows={3}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--glass-border)] bg-transparent p-[var(--spacing-inset)]">
        {isEdit && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDrawerMode('view')}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving || !firstName.trim() || (needsReferrerPick && !pickedReferrerId)}
          className="flex-1"
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Connection'}
        </Button>
      </div>
    </form>

    {seedDialog && (
      <RelationshipSeedDialog
        open={!!seedDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSeedDialog(null)
            closeDrawer()
          }
        }}
        contactId={seedDialog.contactId}
        contactName={seedDialog.contactName}
      />
    )}
    </>
  )
}
