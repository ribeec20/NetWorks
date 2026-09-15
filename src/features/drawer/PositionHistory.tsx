import { useState } from 'react'
import { useContactStore } from '../../stores/contact-store'
import Input from '../../components/ui/Input'
import DateInput from '../../components/ui/DateInput'
import Button from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import type { CompanyPosition } from '../../types'

function formatDate(ts: number | null): string {
  if (ts === null) return 'Unknown'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface PositionHistoryProps {
  contactId: string
  positions: CompanyPosition[]
}

export default function PositionHistory({ contactId, positions }: PositionHistoryProps) {
  const updateContact = useContactStore((s) => s.updateContact)

  const [showForm, setShowForm] = useState(false)
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const current = positions.find((p) => p.endDate === null)
  const past = positions
    .filter((p) => p.endDate !== null)
    .sort((a, b) => (b.startDate ?? 0) - (a.startDate ?? 0))

  const handleAdd = async () => {
    if (!role.trim() && !company.trim()) return

    const newPos: CompanyPosition = {
      company: company.trim(),
      role: role.trim(),
      startDate: startDate ? new Date(startDate + '-01').getTime() : null,
      endDate: endDate ? new Date(endDate + '-01').getTime() : null,
    }

    await updateContact(contactId, {
      positions: [...positions, newPos],
    })

    setRole('')
    setCompany('')
    setStartDate('')
    setEndDate('')
    setShowForm(false)
  }

  const handleEndCurrent = async () => {
    if (!current) return
    const updated = positions.map((p) =>
      p.endDate === null ? { ...p, endDate: Date.now() } : p
    )
    await updateContact(contactId, { positions: updated })
  }

  const handleRemove = async (index: number) => {
    const updated = positions.filter((_, i) => i !== index)
    await updateContact(contactId, { positions: updated })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionTitle>Work History</SectionTitle>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="6" y1="2" x2="6" y2="10" />
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
          Add Position
        </button>
      </div>

      <Card className="p-section">
        {showForm && (
          <div className="glass-2 mb-3 space-y-2 rounded-xl p-card">
            <div className="grid grid-cols-1 gap-2">
              <Input
                id="pos-role"
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Engineer"
              />
              <Input
                id="pos-company"
                label="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Stripe"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <DateInput
                id="pos-start"
                label="Start date"
                mode="month"
                value={startDate}
                onChange={setStartDate}
              />
              <DateInput
                id="pos-end"
                label="End date (empty = current)"
                mode="month"
                value={endDate}
                onChange={setEndDate}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAdd}
                disabled={!role.trim() && !company.trim()}
                className="flex-1"
              >
                Add
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {current && (
            <div className="glass-2 flex items-start justify-between rounded-lg border-success/20 bg-success/10 p-card">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {current.role}{current.role && current.company ? ' @ ' : ''}{current.company}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(current.startDate)} &ndash; Present
                </p>
              </div>
              <button
                onClick={handleEndCurrent}
                className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-warning transition-colors hover:bg-warning/10"
              >
                End
              </button>
            </div>
          )}
          {past.map((pos, i) => {
            const originalIndex = positions.indexOf(pos)
            return (
              <div key={i} className="glass-2 group flex items-start justify-between rounded-lg p-card">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {pos.role}{pos.role && pos.company ? ' @ ' : ''}{pos.company}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {formatDate(pos.startDate)} &ndash; {formatDate(pos.endDate!)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(originalIndex)}
                  className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-destructive/70 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            )
          })}
          {positions.length === 0 && !showForm && (
            <p className="text-xs text-muted-foreground italic">No work history added yet</p>
          )}
        </div>
      </Card>
    </div>
  )
}
