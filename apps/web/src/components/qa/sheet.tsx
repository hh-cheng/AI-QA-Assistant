'use client'

import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useState, type ReactNode } from 'react'

export function Sheet({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
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
    <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close sheet"
        onClick={onClose}
      />
      <aside
        className={cn(
          'qa-glass-card absolute right-0 top-0 z-10 flex h-full w-full max-w-xl flex-col rounded-none border-y-0 border-r-0 border-l border-border/80 p-6',
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-full border border-border/70 p-2 text-muted-foreground transition hover:text-foreground"
            aria-label="Close sheet"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
