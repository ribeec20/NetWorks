import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import type { TagDefinition } from '../../types'
import { TAG_CLASS_LABELS, TAG_CLASS_ORDER } from '../../data/default-tags'

interface TagInputProps {
  label?: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  /** Structured tag definitions with class info */
  tagDefs?: TagDefinition[]
  /** Flat string fallback (backward compat) */
  availableTags?: string[]
  /** Called when user deletes a custom tag from the system */
  onDeleteTag?: (tag: string) => void
}

interface GroupedSuggestion {
  classKey: string
  label: string
  tags: string[]
}

export default function TagInput({
  label,
  tags,
  onChange,
  placeholder = 'Search or add tags...',
  tagDefs = [],
  availableTags = [],
  onDeleteTag,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Build a lookup from tagDefs or fall back to flat availableTags
  const defMap = new Map(tagDefs.map((t) => [t.name, t]))
  const allNames = tagDefs.length > 0
    ? tagDefs.map((t) => t.name)
    : availableTags

  // Filter: not already selected, matching input
  const trimmedInput = input.trim().toLowerCase()
  const filtered = allNames.filter(
    (t) => !tags.includes(t) && t.includes(trimmedInput),
  )

  // Group filtered suggestions by class
  const grouped: GroupedSuggestion[] = (() => {
    if (tagDefs.length === 0) {
      // No class info — single flat group
      return filtered.length > 0 ? [{ classKey: 'all', label: '', tags: filtered }] : []
    }
    const groups: Record<string, string[]> = {}
    for (const name of filtered) {
      const def = defMap.get(name)
      const key = def?.class ?? 'custom'
      if (!groups[key]) groups[key] = []
      groups[key].push(name)
    }
    const order = [...TAG_CLASS_ORDER, 'custom']
    return order
      .filter((k) => groups[k]?.length)
      .map((k) => ({
        classKey: k,
        label: TAG_CLASS_LABELS[k] ?? 'Custom',
        tags: groups[k],
      }))
  })()

  // Flat list for keyboard navigation
  const flatFiltered = grouped.flatMap((g) => g.tags)

  const isCustom = trimmedInput && !allNames.includes(trimmedInput) && !tags.includes(trimmedInput)
  const totalOptions = flatFiltered.length + (isCustom ? 1 : 0)

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase()
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized])
    }
    setInput('')
    setHighlightIndex(-1)
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      removeTag(tag)
    } else {
      addTag(tag)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i + 1) % totalOptions || 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i <= 0 ? totalOptions - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < flatFiltered.length) {
        toggleTag(flatFiltered[highlightIndex])
      } else if (highlightIndex === flatFiltered.length && isCustom) {
        addTag(trimmedInput)
      } else if (trimmedInput) {
        addTag(trimmedInput)
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset highlight when input changes
  useEffect(() => {
    setHighlightIndex(-1)
  }, [input])

  const showDropdown = open && (flatFiltered.length > 0 || isCustom)

  // Track running index across groups for highlight
  let runningIndex = 0

  return (
    <div className="flex min-w-0 flex-col gap-2" ref={containerRef}>
      {label && <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>}

      {/* Input area with selected tags */}
      <div
        className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 shadow-sm transition-colors focus-within:border-ring focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/20"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold text-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(tag)
              }}
              className="ml-0.5 text-muted-foreground transition-colors hover:text-destructive focus:outline-none"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="3" x2="7" y2="7" />
                <line x1="7" y1="3" x2="3" y2="7" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 border-none bg-transparent py-0.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Dropdown grouped by class */}
      {showDropdown && (
        <div className="relative">
          <ul className="absolute top-1 right-0 left-0 z-50 max-h-56 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg">
            {grouped.map((group) => {
              const items = group.tags.map((tag) => {
                const idx = runningIndex++
                const selected = tags.includes(tag)
                const def = defMap.get(tag)
                const isUserTag = def && !def.builtIn
                return (
                  <li
                    key={tag}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      toggleTag(tag)
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                      idx === highlightIndex
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input'
                    }`}>
                      {selected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 5.5L4 7.5L8 3" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1">{tag}</span>
                    {isUserTag && onDeleteTag && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDeleteTag(tag)
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete tag"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <line x1="3" y1="3" x2="7" y2="7" />
                          <line x1="7" y1="3" x2="3" y2="7" />
                        </svg>
                      </button>
                    )}
                  </li>
                )
              })

              return (
                <li key={group.classKey} className="list-none">
                  {group.label && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {group.label}
                    </div>
                  )}
                  <ul>{items}</ul>
                </li>
              )
            })}

            {isCustom && (
              <li
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag(trimmedInput)
                }}
                onMouseEnter={() => setHighlightIndex(flatFiltered.length)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                  highlightIndex === flatFiltered.length
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-dashed border-muted-foreground text-[10px] text-muted-foreground">
                  +
                </span>
                Create &ldquo;{trimmedInput}&rdquo;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
