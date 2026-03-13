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
          'relative z-10 w-full max-w-xl rounded-[2rem] border border-border/80 bg-[linear-gradient(145deg,rgba(3,12,27,0.98),rgba(1,8,20,0.98))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]',
          className,
        )}
      >
        <div className="mb-5 pr-10">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
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
