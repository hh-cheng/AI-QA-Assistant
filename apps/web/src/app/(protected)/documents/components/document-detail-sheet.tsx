'use client'

import { useQuery } from '@tanstack/react-query'

import { trpc } from '@/utils/trpc'
import { Sheet } from '@/components/qa/sheet'
import type { DocumentDetailSheetProps } from '../types'

export default function DocumentDetailSheet({
  documentId,
  onClose,
}: DocumentDetailSheetProps) {
  if (!documentId) {
    return null
  }

  return <DocumentDetailSheetInner documentId={documentId} onClose={onClose} />
}

function DocumentDetailSheetInner({
  documentId,
  onClose,
}: {
  documentId: string
  onClose: () => void
}) {
  const detail = useQuery(
    trpc.qa.documents.getById.queryOptions({ id: documentId }),
  )

  return (
    <Sheet
      open
      title={detail.data?.name ?? 'Document details'}
      description="Stored metadata and ingestion state"
      onClose={onClose}
    >
      {detail.isLoading || !detail.data ? (
        <p className="text-sm text-muted-foreground">Loading document...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Type', detail.data.type],
              ['Size', detail.data.sizeLabel],
              ['Status', detail.data.status],
              ['Chunks', detail.data.chunks ?? '—'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Summary
            </p>
            <p className="mt-2 rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4 text-sm leading-6">
              {detail.data.summary ??
                'This document is still being parsed and indexed.'}
            </p>
          </div>
          {detail.data.errorMessage ? (
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Last error
              </p>
              <p className="mt-2 rounded-[1.5rem] border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
                {detail.data.errorMessage}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </Sheet>
  )
}
