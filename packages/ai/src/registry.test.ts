import { describe, expect, it, vi } from 'vitest'

import { createModelRegistry } from './registry'

describe('createModelRegistry', () => {
  it('resolves configured models with provider capabilities', () => {
    const registry = createModelRegistry({
      providers: [
        {
          id: 'openai',
          capabilities: {
            streaming: true,
            embeddings: true,
          },
          isConfigured: () => true,
          generateGroundedAnswer: vi.fn(),
          streamGroundedAnswer: vi.fn(),
        },
        {
          id: 'deepseek',
          capabilities: {
            streaming: true,
            embeddings: false,
          },
          isConfigured: () => true,
          generateGroundedAnswer: vi.fn(),
          streamGroundedAnswer: vi.fn(),
        },
      ],
    })

    expect(registry.requireModel('openai:gpt-4.1')).toMatchObject({
      id: 'openai:gpt-4.1',
      provider: 'openai',
      model: 'gpt-4.1',
      status: 'connected',
      capabilities: {
        streaming: true,
        embeddings: true,
      },
    })

    expect(registry.requireModel('deepseek:deepseek-chat')).toMatchObject({
      id: 'deepseek:deepseek-chat',
      provider: 'deepseek',
      model: 'deepseek-chat',
      status: 'connected',
      capabilities: {
        streaming: true,
        embeddings: false,
      },
    })
  })

  it('marks models as not configured when the provider is unavailable', () => {
    const registry = createModelRegistry({
      providers: [
        {
          id: 'deepseek',
          capabilities: {
            streaming: true,
            embeddings: false,
          },
          isConfigured: () => false,
          generateGroundedAnswer: vi.fn(),
          streamGroundedAnswer: vi.fn(),
        },
      ],
    })

    expect(registry.listModels(['deepseek:deepseek-chat'])).toEqual([
      expect.objectContaining({
        id: 'deepseek:deepseek-chat',
        status: 'not_configured',
        capabilities: {
          streaming: true,
          embeddings: false,
        },
      }),
    ])

    expect(() => registry.requireModel('deepseek:deepseek-chat')).toThrow(
      'Model is not configured: deepseek:deepseek-chat',
    )
  })
})
