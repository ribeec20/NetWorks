import { useState, useRef, useEffect, type KeyboardEvent } from 'react'

interface ComboboxProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  required?: boolean
}

export default function Combobox({
  id,
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  required,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase().trim()) && s.toLowerCase() !== value.toLowerCase().trim(),
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (filtered.length ? (i + 1) % filtered.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        onChange(filtered[highlightIndex])
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset highlight on value change
  useEffect(() => {
    setHighlightIndex(-1)
  }, [value])

  const showDropdown = open && filtered.length > 0

  return (
    <div className="flex min-w-0 flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          autoComplete="off"
        />
        {showDropdown && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg">
            {filtered.map((suggestion, i) => (
              <li
                key={suggestion}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(suggestion)
                  setOpen(false)
                }}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`cursor-pointer px-3 py-1.5 text-sm ${
                  i === highlightIndex
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
