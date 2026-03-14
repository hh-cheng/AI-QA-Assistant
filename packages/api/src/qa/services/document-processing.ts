import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

import type {
  ChunkingService,
  DocumentParser,
} from '@Intelligent-QA-Assistant/ai'
import type { DocumentType } from '../../qa'

const CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 200

export const documentParser: DocumentParser = {
  async extractText(input) {
    switch (input.fileType) {
      case 'PDF': {
        const parsed = await pdfParse(input.body)
        return { text: parsed.text }
      }
      case 'DOCX': {
        const parsed = await mammoth.extractRawText({ buffer: input.body })
        return { text: parsed.value }
      }
      default:
        return { text: input.body.toString('utf-8') }
    }
  },
}

export const chunkingService: ChunkingService = {
  async chunkText(input) {
    const chunkSize = input.chunkSize ?? CHUNK_SIZE
    const chunkOverlap = input.chunkOverlap ?? CHUNK_OVERLAP
    const normalized = input.text.replace(/\r\n/g, '\n').trim()
    if (!normalized) return []

    const segments = normalized
      .split(/\n{2,}/)
      .map((segment) => segment.trim())
      .filter(Boolean)

    const chunks: string[] = []
    let current = ''

    for (const segment of segments) {
      if (!current) {
        current = segment
        continue
      }

      if ((current + '\n\n' + segment).length <= chunkSize) {
        current = `${current}\n\n${segment}`
        continue
      }

      if (current.length > chunkSize) {
        for (
          let index = 0;
          index < current.length;
          index += chunkSize - chunkOverlap
        ) {
          chunks.push(current.slice(index, index + chunkSize))
        }
        current = segment
        continue
      }

      chunks.push(current)
      current = segment
    }

    if (current) {
      if (current.length <= chunkSize) {
        chunks.push(current)
      } else {
        for (
          let index = 0;
          index < current.length;
          index += chunkSize - chunkOverlap
        ) {
          chunks.push(current.slice(index, index + chunkSize))
        }
      }
    }

    return chunks
      .map((chunk, index) => ({
        index,
        content: chunk.trim(),
        tokenEstimate: Math.ceil(chunk.trim().length / 4),
      }))
      .filter((chunk) => chunk.content.length > 0)
  },
}

export function parseDocumentType(fileName: string): DocumentType | null {
  const normalized = fileName.toLowerCase()
  if (normalized.endsWith('.pdf')) return 'PDF'
  if (normalized.endsWith('.docx')) return 'DOCX'
  if (normalized.endsWith('.md') || normalized.endsWith('.markdown')) {
    return 'MD'
  }
  if (normalized.endsWith('.txt')) return 'TXT'
  return null
}

export function summarizeText(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return paragraphs.slice(0, 2).join(' ').slice(0, 320) || null
}
