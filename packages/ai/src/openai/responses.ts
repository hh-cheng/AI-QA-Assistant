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

export async function streamGroundedResponse(input: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  signal?: AbortSignal
  onDelta(chunk: string): void
}) {
  try {
    const client = createOpenAIClient({ apiKey: input.apiKey })
    const stream = client.responses.stream(
      {
        model: input.model,
        instructions: input.systemPrompt,
        input: input.userPrompt,
      },
      {
        signal: input.signal,
      },
    )

    let content = ''

    for await (const event of stream) {
      if (event.type !== 'response.output_text.delta' || !event.delta) {
        continue
      }

      content += event.delta
      input.onDelta(event.delta)
    }

    const response = await stream.finalResponse()

    return {
      content: response.output_text || content || 'No answer returned.',
      tokenCount: response.usage?.total_tokens,
      model: response.model,
      rawResponseId: response.id,
    }
  } catch (error) {
    throw new Error(describeOpenAIError(error, 'streaming responses request'))
  }
}
