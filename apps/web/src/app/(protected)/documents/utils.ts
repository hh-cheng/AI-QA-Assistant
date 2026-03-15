import type { DocumentStatusFilter, DocumentTypeFilter } from './types'

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.08,
      duration: 0.45,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  }),
}

export const statusOptions: Array<{
  label: string
  value: DocumentStatusFilter
}> = [
  { label: 'All status', value: 'all' },
  { label: 'Ready', value: 'ready' },
  { label: 'Processing', value: 'processing' },
  { label: 'Failed', value: 'failed' },
]

export const typeOptions: Array<{
  label: string
  value: DocumentTypeFilter
}> = [
  { label: 'All types', value: 'all' },
  { label: 'TXT', value: 'TXT' },
  { label: 'Markdown', value: 'MD' },
  { label: 'PDF', value: 'PDF' },
  { label: 'DOCX', value: 'DOCX' },
]

export function statusVariant(status: string) {
  switch (status) {
    case 'ready':
      return 'success' as const
    case 'processing':
      return 'processing' as const
    case 'failed':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}
