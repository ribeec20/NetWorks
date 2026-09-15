import type { InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {props.required && <span className="text-destructive"> *</span>}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-[14px] text-foreground",
          "placeholder:text-muted-foreground transition-colors shadow-sm",
          "focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20",
          error && "border-destructive/50 focus:border-destructive focus:ring-destructive/20",
          className
        )}
        onClick={(e) => {
          if (props.type === 'date' || props.type === 'month' || props.type === 'time') {
            try { e.currentTarget.showPicker() } catch {}
          }
          props.onClick?.(e)
        }}
        {...props}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
