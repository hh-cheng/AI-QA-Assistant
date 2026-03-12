'use client'

import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import type { ReactNode } from 'react'

type BadgeVariant =
  | 'default'
  | 'outline'
  | 'success'
  | 'processing'
  | 'warning'
  | 'destructive'
  | 'secondary'

const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary/15 text-primary border-primary/20',
  outline: 'bg-background/60 text-foreground border-border/70',
  success:
    'border-transparent bg-[color:var(--qa-success)]/16 text-[color:var(--qa-success)]',
  processing:
    'border-transparent bg-[color:var(--qa-processing)]/16 text-[color:var(--qa-processing)]',
  warning:
    'border-transparent bg-[color:var(--qa-warning)]/16 text-[color:var(--qa-warning)]',
  destructive: 'border-transparent bg-destructive/15 text-destructive',
  secondary: 'bg-secondary/70 text-secondary-foreground border-border/70',
}

export function Badge({
  className,
  variant = 'default',
  children,
}: {
  className?: string
  variant?: BadgeVariant
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        badgeStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
