import { describe, expect, it } from 'vitest'

import {
  chunkingService,
  parseDocumentType,
  summarizeText,
} from './document-processing'

describe('document-processing', () => {
  it('detects supported document types', () => {
    expect(parseDocumentType('guide.pdf')).toBe('PDF')
    expect(parseDocumentType('notes.DOCX')).toBe('DOCX')
    expect(parseDocumentType('readme.markdown')).toBe('MD')
    expect(parseDocumentType('todo.txt')).toBe('TXT')
    expect(parseDocumentType('archive.zip')).toBeNull()
  })

  it('summarizes the first two paragraphs', () => {
    const summary = summarizeText(`
First paragraph.

Second paragraph.

Third paragraph.
`)

    expect(summary).toBe('First paragraph. Second paragraph.')
  })

  it('returns no chunks for blank text', async () => {
    await expect(chunkingService.chunkText({ text: '   \n' })).resolves.toEqual(
      [],
    )
  })

  it('splits oversized content with overlap and stable indexes', async () => {
    const chunks = await chunkingService.chunkText({
      text: 'A'.repeat(18),
      chunkSize: 10,
      chunkOverlap: 4,
    })

    expect(chunks.map((chunk) => chunk.content)).toEqual([
      'AAAAAAAAAA',
      'AAAAAAAAAA',
      'AAAAAA',
    ])
    expect(chunks.map((chunk) => chunk.index)).toEqual([0, 1, 2])
    expect(chunks[0]?.tokenEstimate).toBe(3)
  })

  it('preserves paragraph boundaries when possible', async () => {
    const chunks = await chunkingService.chunkText({
      text: 'Alpha\n\nBeta\n\nGamma',
      chunkSize: 12,
      chunkOverlap: 2,
    })

    expect(chunks.map((chunk) => chunk.content)).toEqual([
      'Alpha\n\nBeta',
      'Gamma',
    ])
  })
})
