'use client'

import { Button } from '@Intelligent-QA-Assistant/ui/components/button'
import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import { FileUp, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

export function UploadDropzone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    onFiles(Array.from(list))
  }

  return (
    <div
      className={cn(
        'rounded-3xl border border-dashed border-border/70 bg-secondary/20 p-8 text-center transition',
        isDragging && 'border-primary bg-primary/10',
        disabled && 'pointer-events-none opacity-60',
      )}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setIsDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
        <UploadCloud className="size-8" />
      </div>
      <h3 className="text-base font-semibold">Drop files here</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload TXT, Markdown, PDF, or DOCX files. The API is mocked, but the
        workflow is wired as a real upload surface.
      </p>
      <div className="mt-6">
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full px-5"
        >
          <FileUp className="size-4" />
          Choose Files
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  )
}
