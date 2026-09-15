import type { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={clsx(
        'glass-1 w-full min-w-0 overflow-hidden rounded-2xl',
        className,
      )}
      {...props}
    />
  )
}

export function SectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx(
        'm-0 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
