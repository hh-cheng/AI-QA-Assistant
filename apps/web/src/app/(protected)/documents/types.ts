export type DocumentStatusFilter = 'all' | 'ready' | 'processing' | 'failed'

export type DocumentTypeFilter = 'all' | 'TXT' | 'MD' | 'PDF' | 'DOCX'

export type DocumentFilters = {
  search: string
  status: DocumentStatusFilter
  type: DocumentTypeFilter
}

export type DocumentDetailSheetProps = {
  documentId: string | null
  onClose: () => void
}
