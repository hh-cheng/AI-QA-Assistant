import type { RetrievedChunk } from '@Intelligent-QA-Assistant/ai'

type ResponseLength = 'concise' | 'standard' | 'detailed'

export function buildGroundedAnswerPrompt(input: {
  question: string
  responseLength: ResponseLength
  chunks: RetrievedChunk[]
}) {
  const tone =
    input.responseLength === 'concise'
      ? 'Answer concisely in 3-5 sentences.'
      : input.responseLength === 'detailed'
        ? 'Answer in detail with clear structure.'
        : 'Answer clearly and directly.'

  const context = input.chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}] ${chunk.fileName}${chunk.pageNumber ? ` p.${chunk.pageNumber}` : ''}\n${chunk.content}`,
    )
    .join('\n\n')

  return {
    systemPrompt: `You are a document-grounded assistant. Use only the provided context. If the answer is unavailable in the context, say so. ${tone}`,
    userPrompt: `Question:\n${input.question}\n\nContext:\n${context}`,
  }
}
