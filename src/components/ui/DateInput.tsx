import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { clsx } from 'clsx'

interface DateInputProps {
  id?: string
  label?: string
  required?: boolean
  /** 'date' = full date (YYYY-MM-DD), 'month' = month only (YYYY-MM) */
  mode?: 'date' | 'month'
  /** Value in ISO format: YYYY-MM-DD for date, YYYY-MM for month */
  value: string
  onChange: (value: string) => void
  className?: string
  error?: string
}

// Parse user-typed text into ISO format, returns null if invalid
function parseDate(text: string): string | null {
  const trimmed = text.trim().replace(/[.\-/]/g, '/')
  // MM/DD/YYYY or M/D/YYYY
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, mm, dd, yyyy] = match
  const m = parseInt(mm, 10)
  const d = parseInt(dd, 10)
  const y = parseInt(yyyy, 10)
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null
  // Validate actual date
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return `${yyyy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseMonth(text: string): string | null {
  const trimmed = text.trim().replace(/[.\-/]/g, '/')
  // MM/YYYY or M/YYYY
  const match = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, mm, yyyy] = match
  const m = parseInt(mm, 10)
  const y = parseInt(yyyy, 10)
  if (m < 1 || m > 12 || y < 1900 || y > 2100) return null
  return `${yyyy}-${String(m).padStart(2, '0')}`
}

function isoToDisplay(iso: string, mode: 'date' | 'month'): string {
  if (!iso) return ''
  if (mode === 'month') {
    const [yyyy, mm] = iso.split('-')
    return mm && yyyy ? `${mm}/${yyyy}` : ''
  }
  const [yyyy, mm, dd] = iso.split('-')
  return mm && dd && yyyy ? `${mm}/${dd}/${yyyy}` : ''
}

export default function DateInput({
  id,
  label,
  required,
  mode = 'date',
  value,
  onChange,
  className = '',
  error: externalError,
}: DateInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value, mode))
  const [error, setError] = useState('')
  const pickerRef = useRef<HTMLInputElement>(null)

  // Sync text when value changes externally (e.g. initial load, picker selection)
  useEffect(() => {
    setText(isoToDisplay(value, mode))
    setError('')
  }, [value, mode])

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setText(raw)
    setError('')

    // Auto-commit if fully typed
    if (mode === 'date') {
      const parsed = parseDate(raw)
      if (parsed) onChange(parsed)
    } else {
      const parsed = parseMonth(raw)
      if (parsed) onChange(parsed)
    }
  }

  const handleBlur = () => {
    if (!text.trim()) {
      setError('')
      if (value) onChange('')
      return
    }

    const parsed = mode === 'date' ? parseDate(text) : parseMonth(text)
    if (parsed) {
      onChange(parsed)
      setError('')
    } else {
      setError(mode === 'date' ? 'Use MM/DD/YYYY' : 'Use MM/YYYY')
    }
  }

  const handlePickerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v) {
      onChange(v)
    }
  }

  const openPicker = () => {
    try {
      pickerRef.current?.showPicker()
    } catch {
      pickerRef.current?.click()
    }
  }

  const displayError = externalError || error

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={mode === 'date' ? 'MM/DD/YYYY' : 'MM/YYYY'}
          className={clsx(
            'w-full rounded-lg border border-input bg-background px-3.5 py-2.5 pr-10 text-[14px] text-foreground',
            'placeholder:text-muted-foreground transition-colors shadow-sm',
            'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20',
            displayError && 'border-destructive/50 focus:border-destructive focus:ring-destructive/20',
            className,
          )}
        />
        {/* Calendar button */}
        <button
          type="button"
          tabIndex={-1}
          onClick={openPicker}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Open calendar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="12" height="11" rx="1.5" />
            <line x1="2" y1="7" x2="14" y2="7" />
            <line x1="5" y1="1.5" x2="5" y2="4.5" />
            <line x1="11" y1="1.5" x2="11" y2="4.5" />
          </svg>
        </button>
        {/* Hidden native picker */}
        <input
          ref={pickerRef}
          type={mode === 'date' ? 'date' : 'month'}
          value={value}
          onChange={handlePickerChange}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
        />
      </div>
      {displayError && <p className="text-sm text-destructive">{displayError}</p>}
    </div>
  )
}
