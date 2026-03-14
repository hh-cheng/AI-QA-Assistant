'use client'

import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Eye, FileText, Search, Trash2, Upload } from 'lucide-react'

import { Badge } from './badge'
import { Modal } from './modal'
import { Sheet } from './sheet'
import { EmptyState } from './empty-state'
import { queryClient, trpc } from '@/utils/trpc'
import { UploadDropzone } from './upload-dropzone'
import { Input } from '@Intelligent-QA-Assistant/ui/components/input'
import { Button } from '@Intelligent-QA-Assistant/ui/components/button'
import { env } from '@Intelligent-QA-Assistant/env/web'

const fadeUp = {
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

function statusVariant(status: string) {
  switch (status) {
    case 'ready':
      return 'success'
    case 'processing':
      return 'processing'
    case 'failed':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function DocumentDetailSheet({
  documentId,
  onClose,
}: {
  documentId: string | null
  onClose: () => void
}) {
  if (!documentId) return null

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

export default function QaDocumentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<
    'all' | 'ready' | 'processing' | 'failed'
  >('all')
  const [type, setType] = useState<'all' | 'TXT' | 'MD' | 'PDF' | 'DOCX'>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  const filters = useMemo(
    () => ({
      search: deferredSearch,
      status,
      type,
    }),
    [deferredSearch, status, type],
  )

  const documents = useQuery(trpc.qa.documents.list.queryOptions(filters))
  const deleteMutation = useMutation(trpc.qa.documents.delete.mutationOptions())
  const [isUploading, setIsUploading] = useState(false)

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
    if (!deleteId) return
    await deleteMutation.mutateAsync({ id: deleteId })
    toast.success('Document deleted')
    setDeleteId(null)
    if (selectedId === deleteId) {
      setSelectedId(null)
    }
    await queryClient.invalidateQueries()
  }

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <motion.section
        variants={fadeUp}
        custom={0}
        className="qa-glass-card rounded-[2rem] p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Search and manage only the documents in your own workspace.
            </p>
          </div>
          <Button
            type="button"
            className="rounded-full px-5"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="size-4" />
            Upload document
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by document name..."
              className="h-12 rounded-full border-border/70 bg-secondary/20 pl-11"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="h-12 rounded-full border border-border/70 bg-secondary/20 px-4 text-sm"
          >
            <option value="all">All status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className="h-12 rounded-full border border-border/70 bg-secondary/20 px-4 text-sm"
          >
            <option value="all">All types</option>
            <option value="TXT">TXT</option>
            <option value="MD">Markdown</option>
            <option value="PDF">PDF</option>
            <option value="DOCX">DOCX</option>
          </select>
        </div>
      </motion.section>

      {documents.data?.length ? (
        <motion.section
          variants={fadeUp}
          custom={1}
          className="qa-glass-card overflow-hidden rounded-[2rem]"
        >
          <table className="min-w-full text-left text-sm">
            <thead className="bg-secondary/25 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.data.map((doc, index) => (
                <motion.tr
                  key={doc.id}
                  variants={fadeUp}
                  custom={index + 2}
                  className="border-t border-border/60"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.chunks ?? 0} chunks
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="outline">{doc.type}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={statusVariant(doc.status)}>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {doc.sizeLabel}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSelectedId(doc.id)}
                      >
                        <Eye className="size-4" />
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full text-destructive"
                        onClick={() => setDeleteId(doc.id)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.section>
      ) : (
        <motion.div variants={fadeUp} custom={1}>
          <EmptyState
            icon={<FileText className="size-8" />}
            title="No matching documents"
            description="Adjust your filters or upload a new document to seed the knowledge base."
            action={
              <Button
                type="button"
                className="rounded-full px-5"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="size-4" />
                Upload document
              </Button>
            }
          />
        </motion.div>
      )}

      <Modal
        open={showUpload}
        title="Upload documents"
        description="Files are uploaded to object storage and indexed asynchronously."
        onClose={() => setShowUpload(false)}
      >
        <UploadDropzone
          disabled={isUploading}
          onFiles={(files) => {
            void handleUpload(files)
          }}
        />
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        title="Delete document"
        description="This removes the source file and its indexed chunks."
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          The selected document and its retrieval data will be removed after the
          delete request succeeds.
        </p>
      </Modal>

      <DocumentDetailSheet
        documentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </motion.div>
  )
}
