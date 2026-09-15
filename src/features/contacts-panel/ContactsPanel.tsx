import { useMemo, useState, useRef, useEffect } from 'react'
import { useContactStore } from '../../stores/contact-store'
import { useUIStore } from '../../stores/ui-store'
import { useTags } from '../../hooks/useTags'
import { tagToColor, strengthToColor } from '../../utils/color'
import { TAG_CLASS_LABELS, TAG_CLASS_ORDER } from '../../data/default-tags'
import { getDataService } from '../../data/provider'
import type { Interaction } from '../../types'

// --- Strength presets ---
type StrengthPreset = 'all' | 'strong' | 'growing' | 'new'
const STRENGTH_PRESETS: { key: StrengthPreset; label: string; range: [number, number] }[] = [
  { key: 'all', label: 'All', range: [0, 100] },
  { key: 'strong', label: 'Strong', range: [60, 100] },
  { key: 'growing', label: 'Growing', range: [30, 59] },
  { key: 'new', label: 'New', range: [0, 29] },
]

function activeStrengthPreset(range: [number, number]): StrengthPreset {
  for (const p of STRENGTH_PRESETS) {
    if (range[0] === p.range[0] && range[1] === p.range[1]) return p.key
  }
  return 'all'
}

// --- Known-since presets ---
const KNOWN_SINCE_PRESETS: { key: string; label: string }[] = [
  { key: 'lt3m', label: '< 3 months' },
  { key: '3to12m', label: '3–12 months' },
  { key: '1to3y', label: '1–3 years' },
  { key: '3yplus', label: '3+ years' },
]

function matchesKnownSince(dateFirstMet: number, preset: string | null): boolean {
  if (!preset) return true
  const now = Date.now()
  const diff = now - dateFirstMet
  const months = diff / (30.44 * 86_400_000)
  switch (preset) {
    case 'lt3m': return months < 3
    case '3to12m': return months >= 3 && months < 12
    case '1to3y': return months >= 12 && months < 36
    case '3yplus': return months >= 36
    default: return true
  }
}

// --- Last interaction presets ---
const LAST_INTERACTION_PRESETS: { key: string; label: string }[] = [
  { key: '1w', label: 'Last week' },
  { key: '1m', label: 'Last month' },
  { key: '3m', label: 'Last 3 months' },
  { key: '6m', label: 'Last 6 months' },
  { key: '6mplus', label: '6+ months ago' },
]

function matchesLastInteraction(lastDate: number | null, preset: string | null): boolean {
  if (!preset) return true
  if (!lastDate) return preset === '6mplus'
  const now = Date.now()
  const diff = now - lastDate
  const days = diff / 86_400_000
  switch (preset) {
    case '1w': return days <= 7
    case '1m': return days <= 30
    case '3m': return days <= 90
    case '6m': return days <= 180
    case '6mplus': return days > 180
    default: return true
  }
}

// --- Sort options ---
type SortKey = 'strength' | 'name' | 'recent-interaction' | 'newest' | 'company'
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'strength', label: 'Strength' },
  { key: 'name', label: 'Name' },
  { key: 'recent-interaction', label: 'Last Interaction' },
  { key: 'newest', label: 'Newest Added' },
  { key: 'company', label: 'Company' },
]

// --- Chip toggle button ---
function ChipButton({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color?: string
}) {
  if (color) {
    return (
      <button
        onClick={onClick}
        className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-all"
        style={{
          backgroundColor: active ? color + '22' : 'var(--glass-2-bg)',
          color: active ? color : 'var(--muted-foreground)',
          border: active ? `1px solid ${color}44` : '1px solid var(--glass-border)',
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
        active
          ? 'bg-primary/10 text-primary border border-primary/30'
          : 'bg-[var(--glass-2-bg)] text-muted-foreground border border-[var(--glass-border)]'
      }`}
    >
      {label}
    </button>
  )
}

export default function ContactsPanel() {
  const contacts = useContactStore((s) => s.contacts)
  const open = useUIStore((s) => s.contactsPanelOpen)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const tagFilter = useUIStore((s) => s.tagFilter)
  const setTagFilter = useUIStore((s) => s.setTagFilter)
  const strengthRange = useUIStore((s) => s.strengthRange)
  const setStrengthRange = useUIStore((s) => s.setStrengthRange)
  const companyFilter = useUIStore((s) => s.companyFilter)
  const setCompanyFilter = useUIStore((s) => s.setCompanyFilter)
  const knownSinceFilter = useUIStore((s) => s.knownSinceFilter)
  const setKnownSinceFilter = useUIStore((s) => s.setKnownSinceFilter)
  const lastInteractionFilter = useUIStore((s) => s.lastInteractionFilter)
  const setLastInteractionFilter = useUIStore((s) => s.setLastInteractionFilter)
  const clearFilters = useUIStore((s) => s.clearFilters)
  const openView = useUIStore((s) => s.openView)
  const toggleContactsPanel = useUIStore((s) => s.toggleContactsPanel)
  const { tagsByClass, classOrder, getTagDef } = useTags()

  // Load interactions to build last-interaction-date map (only when panel is open)
  const [lastInteractionMap, setLastInteractionMap] = useState<Map<string, number>>(new Map())
  useEffect(() => {
    if (!open) return
    let cancelled = false
    getDataService()
      .getAllInteractions()
      .then((interactions: Interaction[]) => {
        if (cancelled) return
        const map = new Map<string, number>()
        for (const ix of interactions) {
          const prev = map.get(ix.contactId)
          if (!prev || ix.date > prev) map.set(ix.contactId, ix.date)
        }
        setLastInteractionMap(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, contacts]) // re-fetch when panel opens or contacts change

  // Unique companies from current positions
  const companies = useMemo(() => {
    const set = new Set<string>()
    for (const c of contacts) {
      const curr = c.positions.find((p) => !p.endDate)
      if (curr?.company?.trim()) set.add(curr.company.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [contacts])

  // Tag display groups
  const usedTagsByClass = useMemo(() => {
    const usedSet = new Set<string>()
    for (const c of contacts) for (const t of c.tags) usedSet.add(t)
    const groups: Record<string, string[]> = {}
    for (const name of usedSet) {
      const def = getTagDef(name)
      const key = def?.class ?? 'custom'
      if (!groups[key]) groups[key] = []
      groups[key].push(name)
    }
    for (const key of Object.keys(groups)) groups[key].sort()
    return groups
  }, [contacts, getTagDef])

  const displayGroups = useMemo(() => {
    const allKeys = new Set([...classOrder, ...Object.keys(usedTagsByClass)])
    const result: { key: string; label: string; tags: string[] }[] = []
    const order = [...TAG_CLASS_ORDER, ...Array.from(allKeys).filter((k) => !TAG_CLASS_ORDER.includes(k))]
    for (const key of order) {
      const fromUsed = new Set(usedTagsByClass[key] ?? [])
      const fromDefs = (tagsByClass[key] ?? []).map((t) => t.name)
      const merged = Array.from(new Set([...fromUsed, ...fromDefs])).sort()
      if (merged.length === 0) continue
      result.push({ key, label: TAG_CLASS_LABELS[key] ?? 'Tags', tags: merged })
    }
    return result
  }, [classOrder, usedTagsByClass, tagsByClass])

  // Filtering
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return contacts.filter((c) => {
      if (q) {
        const name = `${c.firstName} ${c.lastName}`.toLowerCase()
        const company = c.positions.find((p) => !p.endDate)?.company?.toLowerCase() ?? ''
        const role = c.positions.find((p) => !p.endDate)?.role?.toLowerCase() ?? ''
        const tagMatch = c.tags.some((t) => t.toLowerCase().includes(q))
        if (!name.includes(q) && !company.includes(q) && !role.includes(q) && !tagMatch) return false
      }
      if (tagFilter.length > 0 && !tagFilter.some((t) => c.tags.includes(t))) return false
      if (!(c.strength >= strengthRange[0] && c.strength <= strengthRange[1])) return false
      if (companyFilter) {
        const curr = c.positions.find((p) => !p.endDate)
        if (curr?.company?.trim() !== companyFilter) return false
      }
      if (!matchesKnownSince(c.dateFirstMet, knownSinceFilter)) return false
      if (!matchesLastInteraction(lastInteractionMap.get(c.id) ?? null, lastInteractionFilter)) return false
      return true
    })
  }, [contacts, searchQuery, tagFilter, strengthRange, companyFilter, knownSinceFilter, lastInteractionFilter, lastInteractionMap])

  // Sort state (must be before sorted memo)
  const [sortBy, setSortBy] = useState<SortKey>('strength')
  const [sortAsc, setSortAsc] = useState(false)

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered]
    const dir = sortAsc ? -1 : 1
    switch (sortBy) {
      case 'strength':
        list.sort((a, b) => dir * (b.strength - a.strength))
        break
      case 'name':
        list.sort((a, b) => dir * (a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)))
        break
      case 'recent-interaction':
        list.sort((a, b) => dir * ((lastInteractionMap.get(b.id) ?? 0) - (lastInteractionMap.get(a.id) ?? 0)))
        break
      case 'newest':
        list.sort((a, b) => dir * (b.dateAdded - a.dateAdded))
        break
      case 'company':
        list.sort((a, b) => {
          const ac = a.positions.find((p) => !p.endDate)?.company ?? ''
          const bc = b.positions.find((p) => !p.endDate)?.company ?? ''
          return dir * (ac.localeCompare(bc) || b.strength - a.strength)
        })
        break
    }
    return list
  }, [filtered, sortBy, sortAsc, lastInteractionMap])

  const strengthPreset = activeStrengthPreset(strengthRange)
  const activeFilterCount =
    tagFilter.length
    + (strengthPreset !== 'all' ? 1 : 0)
    + (companyFilter ? 1 : 0)
    + (knownSinceFilter ? 1 : 0)
    + (lastInteractionFilter ? 1 : 0)
  // Popover state
  const [filterOpen, setFilterOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen && !sortOpen) return
    const handler = (e: MouseEvent) => {
      if (filterOpen && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
      if (sortOpen && sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen, sortOpen])

  const toggleTag = (tag: string) => {
    if (tagFilter.includes(tag)) {
      setTagFilter(tagFilter.filter((t) => t !== tag))
    } else {
      setTagFilter([...tagFilter, tag])
    }
  }

  // Summary of active filters for inline display
  const filterSummary = useMemo(() => {
    const parts: { label: string; onClear: () => void; color?: string }[] = []
    if (strengthPreset !== 'all') {
      const p = STRENGTH_PRESETS.find((s) => s.key === strengthPreset)!
      parts.push({ label: p.label, onClear: () => setStrengthRange([0, 100]) })
    }
    if (companyFilter) {
      parts.push({ label: companyFilter, onClear: () => setCompanyFilter(null) })
    }
    if (knownSinceFilter) {
      const p = KNOWN_SINCE_PRESETS.find((s) => s.key === knownSinceFilter)!
      parts.push({ label: `Known ${p.label}`, onClear: () => setKnownSinceFilter(null) })
    }
    if (lastInteractionFilter) {
      const p = LAST_INTERACTION_PRESETS.find((s) => s.key === lastInteractionFilter)!
      parts.push({ label: p.label, onClear: () => setLastInteractionFilter(null) })
    }
    for (const tag of tagFilter) {
      parts.push({ label: tag, onClear: () => toggleTag(tag), color: tagToColor(tag) })
    }
    return parts
  }, [strengthPreset, companyFilter, knownSinceFilter, lastInteractionFilter, tagFilter])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 top-16 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={toggleContactsPanel}
        />
      )}
      <aside
        className={`fixed top-16 left-0 z-40 flex h-[calc(100%-4rem)] w-[400px] max-w-full flex-col rounded-tr-2xl border-r border-t border-[var(--glass-border)] bg-[var(--glass-1-bg)] shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--glass-border)] bg-transparent px-[var(--spacing-inset)]">
          <span className="text-base font-bold tracking-tight text-foreground md:text-lg">
            Contacts
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-muted-foreground">
              {filtered.length} of {contacts.length}
            </span>
            <button
              onClick={toggleContactsPanel}
              className="glass-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--glass-3-bg)] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/10"
              aria-label="Close panel"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
          {/* Search */}
          <div className="shrink-0 border-b border-[var(--glass-border)] px-[var(--spacing-inset)] py-3">
            <div className="glass-2 flex items-center gap-2 rounded-lg px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-ring/10">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="shrink-0 text-muted-foreground">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10" y1="10" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="4" y1="4" x2="10" y2="10" />
                    <line x1="10" y1="4" x2="4" y2="10" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter + Sort buttons */}
          <div className="shrink-0 border-b border-[var(--glass-border)] px-[var(--spacing-inset)] py-3">
            <div className="flex gap-2">
              {/* Filter button */}
              <div className="relative flex-1" ref={popoverRef}>
                <button
                  onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false) }}
                  className={`glass-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-medium transition-all hover:bg-[var(--glass-3-bg)] ${
                    activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
                      <path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" />
                    </svg>
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                    className={`shrink-0 transition-transform ${filterOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" />
                  </svg>
                </button>

                {/* Filter popover */}
                {filterOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1.5 w-[calc(200%+0.5rem)] rounded-xl border border-border bg-background shadow-xl">
                    <div className="max-h-[420px] overflow-y-auto p-3 flex flex-col gap-4">
                      <section>
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Strength</div>
                        <div className="flex flex-wrap gap-1.5">
                          {STRENGTH_PRESETS.map((p) => (
                            <ChipButton key={p.key} label={p.label} active={strengthPreset === p.key} onClick={() => setStrengthRange(p.range)} />
                          ))}
                        </div>
                      </section>

                      {companies.length > 0 && (
                        <section>
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company</div>
                          <div className="flex flex-wrap gap-1.5">
                            {companies.map((c) => (
                              <ChipButton key={c} label={c} active={companyFilter === c} onClick={() => setCompanyFilter(companyFilter === c ? null : c)} />
                            ))}
                          </div>
                        </section>
                      )}

                      <section>
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Known for</div>
                        <div className="flex flex-wrap gap-1.5">
                          {KNOWN_SINCE_PRESETS.map((p) => (
                            <ChipButton key={p.key} label={p.label} active={knownSinceFilter === p.key} onClick={() => setKnownSinceFilter(knownSinceFilter === p.key ? null : p.key)} />
                          ))}
                        </div>
                      </section>

                      <section>
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last interaction</div>
                        <div className="flex flex-wrap gap-1.5">
                          {LAST_INTERACTION_PRESETS.map((p) => (
                            <ChipButton key={p.key} label={p.label} active={lastInteractionFilter === p.key} onClick={() => setLastInteractionFilter(lastInteractionFilter === p.key ? null : p.key)} />
                          ))}
                        </div>
                      </section>

                      {displayGroups.map((group) => (
                        <section key={group.key}>
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.label}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.tags.map((tag) => (
                              <ChipButton key={tag} label={tag} active={tagFilter.includes(tag)} onClick={() => toggleTag(tag)} color={tagToColor(tag)} />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    {activeFilterCount > 0 && (
                      <div className="border-t border-border px-3 py-2">
                        <button
                          onClick={() => { clearFilters(); setFilterOpen(false) }}
                          className="text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sort button + direction toggle */}
              <div className="relative flex-1 flex gap-1.5" ref={sortRef}>
                <button
                  onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false) }}
                  className="glass-2 flex flex-1 min-w-0 items-center justify-between rounded-lg px-3 py-2 text-[12px] font-medium text-muted-foreground transition-all hover:bg-[var(--glass-3-bg)]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
                      <path d="M3 2v10M3 12l-2-2M3 12l2-2M11 12V2M11 2L9 4M11 2l2 2" />
                    </svg>
                    <span className="truncate">{SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Sort'}</span>
                  </div>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                    className={`shrink-0 transition-transform ${sortOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="glass-2 flex shrink-0 items-center justify-center rounded-lg w-9 text-muted-foreground transition-all hover:bg-[var(--glass-3-bg)] hover:text-foreground"
                  aria-label={sortAsc ? 'Sort ascending' : 'Sort descending'}
                  title={sortAsc ? 'Ascending' : 'Descending'}
                >
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                    className={`transition-transform ${sortAsc ? 'rotate-180' : ''}`}
                  >
                    <path d="M7 2v10M7 12l-3-3M7 12l3-3" />
                  </svg>
                </button>

                {/* Sort popover */}
                {sortOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-border bg-background py-1 shadow-xl">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt.key); setSortOpen(false) }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                          sortBy === opt.key
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-secondary'
                        }`}
                      >
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                          sortBy === opt.key ? 'border-primary bg-primary' : 'border-input'
                        }`}>
                          {sortBy === opt.key && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                          )}
                        </span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active filter chips when popovers closed */}
            {filterSummary.length > 0 && !filterOpen && !sortOpen && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {filterSummary.map((f, i) => (
                  <button
                    key={i}
                    onClick={f.onClear}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all"
                    style={{
                      backgroundColor: f.color ? f.color + '22' : 'var(--glass-2-bg)',
                      color: f.color ?? 'var(--foreground)',
                      border: f.color ? `1px solid ${f.color}44` : '1px solid var(--glass-border)',
                    }}
                  >
                    {f.label}
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="2" y1="2" x2="6" y2="6" />
                      <line x1="6" y1="2" x2="2" y2="6" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact tiles */}
          <div className="flex-1 overflow-y-auto drawer-scroll px-[var(--spacing-inset)] py-2">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-[13px] text-muted-foreground">No contacts match</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sorted.map((contact) => {
                  const strength = contact.strength
                  const currentPos = contact.positions.find((p) => p.endDate === null)
                  const sColor = strengthToColor(strength)
                  return (
                    <button
                      key={contact.id}
                      onClick={() => openView(contact.id)}
                      className="glass-2 flex items-start gap-3 rounded-xl p-3 text-left transition-all hover:bg-[var(--glass-3-bg)] active:scale-[0.99]"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                        style={{ backgroundColor: contact.tags.length > 0 ? tagToColor(contact.tags[0]) : '#9ca3af' }}
                      >
                        {contact.firstName[0]}{contact.lastName?.[0] ?? ''}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-foreground">
                            {contact.firstName} {contact.lastName}
                          </span>
                          <span
                            className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ color: sColor, backgroundColor: sColor + '18' }}
                          >
                            {strength}
                          </span>
                        </div>
                        {currentPos && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {currentPos.role}{currentPos.role && currentPos.company ? ' @ ' : ''}{currentPos.company}
                          </span>
                        )}
                        {contact.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {contact.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ color: tagToColor(tag), backgroundColor: tagToColor(tag) + '18' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </aside>
    </>
  )
}
