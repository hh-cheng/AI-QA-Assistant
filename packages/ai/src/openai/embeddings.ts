import { createOpenAIClient } from './client'
import { describeOpenAIError } from './errors'

export async function createEmbeddingVectors(input: {
  apiKey: string
  texts: string[]
  model: string
  dimensions?: number
}) {
  if (input.texts.length === 0) {
    return []
  }

  try {
    const client = createOpenAIClient({ apiKey: input.apiKey })
    const response = await client.embeddings.create({
      model: input.model,
      input: input.texts,
      dimensions: input.dimensions,
      encoding_format: 'float',
    })

    return [...response.data]
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding)
  } catch (error) {
    throw new Error(describeOpenAIError(error, 'embedding request'))
  }
}
