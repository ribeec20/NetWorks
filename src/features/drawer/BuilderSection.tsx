import { useState, useEffect, type FormEvent } from 'react'
import { getDataService } from '../../data/provider'
import { generateId } from '../../utils/id'
import type { OngoingBuilder } from '../../types'
import Input from '../../components/ui/Input'
import DateInput from '../../components/ui/DateInput'
import Button from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'

interface BuilderSectionProps {
  contactId: string
}

export default function BuilderSection({ contactId }: BuilderSectionProps) {
  const [builders, setBuilders] = useState<OngoingBuilder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)

  const loadBuilders = async () => {
    const ds = getDataService()
    const data = await ds.getBuilders(contactId)
    setBuilders(data)
  }

  useEffect(() => {
    loadBuilders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId])

  const activeBuilders = builders.filter((b) => !b.endDate)
  const endedBuilders = builders.filter((b) => b.endDate)

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return

    setSaving(true)
    try {
      const ds = getDataService()
      const builder: OngoingBuilder = {
        id: generateId(),
        contactId,
        label: label.trim(),
        hoursPerWeek: hoursPerWeek ? parseFloat(hoursPerWeek) : null,
        startDate: new Date(startDate + '-01').getTime(),
        endDate: null,
        createdAt: Date.now(),
      }
      await ds.createBuilder(builder)
      setBuilders((prev) => [...prev, builder])
      setLabel('')
      setHoursPerWeek('')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleEnd = async (builderId: string) => {
    const ds = getDataService()
    const now = Date.now()
    await ds.updateBuilder(builderId, { endDate: now })
    setBuilders((prev) =>
      prev.map((b) => (b.id === builderId ? { ...b, endDate: now } : b))
    )
  }

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionTitle>Ongoing Builders</SectionTitle>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-all duration-150 hover:bg-primary/10 active:scale-95"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="6" y1="2" x2="6" y2="10" />
              <line x1="2" y1="6" x2="10" y2="6" />
            </svg>
            Add Builder
          </button>
        )}
      </div>

      <Card className="p-section">
        {/* Inline add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="glass-2 rounded-xl p-card">
            <Input
              id="builder-label"
              label="Label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Co-workers at Stripe"
            />
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Input
                id="builder-hours"
                label="Hours/week"
                type="number"
                min="0"
                step="0.5"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
                placeholder="Optional"
              />
              <DateInput
                id="builder-start"
                label="Start date"
                mode="month"
                value={startDate}
                onChange={setStartDate}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !label.trim()} className="text-xs">
                {saving ? 'Saving...' : 'Add'}
              </Button>
            </div>
          </form>
        )}

        {/* Active builders */}
        {activeBuilders.length > 0 && (
          <div className={`space-y-2.5 ${showForm ? 'mt-3.5' : ''}`}>
            {activeBuilders.map((b) => (
              <div
                key={b.id}
                className="glass-2 flex items-center justify-between rounded-lg border-success/20 bg-success/10 p-card"
              >
                <div>
                  <p className="text-[14px] font-medium text-foreground">{b.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.hoursPerWeek ? `${b.hoursPerWeek} hrs/week · ` : ''}
                    Since {formatDate(b.startDate)}
                  </p>
                </div>
                <button
                  onClick={() => handleEnd(b.id)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                >
                  End
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ended builders */}
        {endedBuilders.length > 0 && (
          <div className={`space-y-2 ${activeBuilders.length > 0 || showForm ? 'mt-3' : ''}`}>
            {endedBuilders.map((b) => (
              <div key={b.id} className="glass-2 rounded-lg p-card opacity-70">
                <p className="text-[13px] text-muted-foreground">{b.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  {formatDate(b.startDate)} – {formatDate(b.endDate!)}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeBuilders.length === 0 && endedBuilders.length === 0 && !showForm && (
          <p className="text-[13px] text-muted-foreground">No ongoing connections.</p>
        )}
      </Card>
    </div>
  )
}
