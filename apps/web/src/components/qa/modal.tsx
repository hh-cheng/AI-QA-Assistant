'use client'

import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useState, type ReactNode } from 'react'

export function Modal({
  open,
  title,
  description,
  onClose,
  className,
  children,
  footer,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  className?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!mounted || !open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        className={cn(
          'qa-glass-card relative z-10 w-full max-w-xl border-border/80 p-6',
          className,
        )}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full border border-border/70 p-2 text-muted-foreground transition hover:text-foreground"
          aria-label="Close modal"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
        <div className="mb-5 pr-10">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
        {footer ? (
          <div className="mt-6 flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
