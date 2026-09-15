import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  primary:
    'border border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/85 hover:shadow-md active:bg-primary/75',
  secondary:
    'border border-border bg-background text-foreground shadow-sm hover:bg-secondary hover:border-input active:bg-muted',
  danger:
    'border border-destructive/30 bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/20 hover:border-destructive/40 active:bg-destructive/30',
  ghost:
    'text-muted-foreground hover:bg-secondary active:bg-muted',
}

export default function Button({
  variant = 'primary',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-[14px] font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
