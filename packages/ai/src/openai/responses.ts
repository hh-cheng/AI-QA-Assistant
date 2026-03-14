import { createOpenAIClient } from './client'
import { describeOpenAIError } from './errors'

export async function createGroundedResponse(input: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}) {
  try {
    const client = createOpenAIClient({ apiKey: input.apiKey })
    const response = await client.responses.create({
      model: input.model,
      instructions: input.systemPrompt,
      input: input.userPrompt,
    })

    return {
      content: response.output_text || 'No answer returned.',
      tokenCount: response.usage?.total_tokens,
      model: response.model,
      rawResponseId: response.id,
    }
  } catch (error) {
    throw new Error(describeOpenAIError(error, 'responses request'))
  }
}
