import { toast } from 'sonner'
import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/utils/trpc'
import { env } from '@Intelligent-QA-Assistant/env/web'
import type {
  DocumentFilters,
  DocumentStatusFilter,
  DocumentTypeFilter,
} from './types'

export default function useDocumentsPageService() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DocumentStatusFilter>('all')
  const [type, setType] = useState<DocumentTypeFilter>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const deferredSearch = useDeferredValue(search)

  const filters = useMemo<DocumentFilters>(
    () => ({
      search: deferredSearch,
      status,
      type,
    }),
    [deferredSearch, status, type],
  )

  const documents = useQuery(trpc.qa.documents.list.queryOptions(filters))
  const deleteMutation = useMutation(trpc.qa.documents.delete.mutationOptions())

  const handleUpload = async (files: File[]) => {
    setIsUploading(true)

    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }

      const response = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/qa/documents/upload`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        },
      )

      const json = (await response.json()) as { message?: string }
      if (!response.ok) {
        throw new Error(json.message || 'Upload failed')
      }

      toast.success(`${files.length} file(s) queued for indexing`)
      setShowUpload(false)
      await queryClient.invalidateQueries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) {
      return
    }

    await deleteMutation.mutateAsync({ id: deleteId })
    toast.success('Document deleted')
    setDeleteId(null)

    if (selectedId === deleteId) {
      setSelectedId(null)
    }

    await queryClient.invalidateQueries()
  }

  return {
    type,
    search,
    status,
    deleteId,
    documents,
    selectedId,
    showUpload,
    isUploading,
    setType,
    setSearch,
    setStatus,
    setDeleteId,
    handleDelete,
    setSelectedId,
    setShowUpload,
    handleUpload,
    isDeleting: deleteMutation.isPending,
  }
}
