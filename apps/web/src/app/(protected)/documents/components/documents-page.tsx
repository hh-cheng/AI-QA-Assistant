'use client'

import { motion } from 'framer-motion'
import { Eye, FileText, Search, Trash2, Upload } from 'lucide-react'

import { Badge } from '@/components/qa/badge'
import { Modal } from '@/components/qa/modal'
import { EmptyState } from '@/components/qa/empty-state'
import { UploadDropzone } from '@/components/qa/upload-dropzone'
import { Input } from '@Intelligent-QA-Assistant/ui/components/input'
import { Button } from '@Intelligent-QA-Assistant/ui/components/button'
import useDocumentsPageService from '../service'
import { fadeUp, statusOptions, statusVariant, typeOptions } from '../utils'
import DocumentDetailSheet from './document-detail-sheet'

export default function QaDocumentsPage() {
  const {
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
    isDeleting,
  } = useDocumentsPageService()

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
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className="h-12 rounded-full border border-border/70 bg-secondary/20 px-4 text-sm"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
              disabled={isDeleting}
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
