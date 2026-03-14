import type { OpenAIService } from '../index'

export type AnswerAgent = {
  generate(input: {
    model: string
    systemPrompt: string
    userPrompt: string
  }): ReturnType<OpenAIService['generateGroundedAnswer']>
}

export function createAnswerAgent(input: {
  openAIService: OpenAIService
}): AnswerAgent {
  return {
    generate(request) {
      return input.openAIService.generateGroundedAnswer(request)
    },
  }
}
