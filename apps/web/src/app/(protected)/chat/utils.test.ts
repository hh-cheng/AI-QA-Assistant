import { describe, expect, it, vi } from 'vitest'

import { consumeSseStream, createLocalMessage, parseSseBlock } from './utils'

describe('chat utils', () => {
  it('creates a local message with role and content', () => {
    const message = createLocalMessage({
      role: 'user',
      content: 'hello',
      status: 'streaming',
    })

    expect(message).toMatchObject({
      role: 'user',
      content: 'hello',
      status: 'streaming',
    })
    expect(message.id).toEqual(expect.any(String))
  })

  it('parses SSE blocks', () => {
    expect(parseSseBlock('event: delta\ndata: {"chunk":"Hi"}')).toEqual({
      event: 'delta',
      payload: { chunk: 'Hi' },
    })
    expect(parseSseBlock('event: ping')).toBeNull()
  })

  it('consumes delta and complete SSE events', async () => {
    const onDelta = vi.fn()
    const onComplete = vi.fn()
    const encoder = new TextEncoder()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: delta\ndata: {"chunk":"Hello "}\n\n' +
              'event: delta\ndata: {"chunk":"world"}\n\n' +
              'event: complete\ndata: {"message":{"id":"m-1","role":"assistant","content":"Hello world"}}\n\n',
          ),
        )
        controller.close()
      },
    })

    await consumeSseStream(new Response(body), {
      onDelta,
      onComplete,
    })

    expect(onDelta).toHaveBeenCalledTimes(2)
    expect(onDelta).toHaveBeenNthCalledWith(1, 'Hello ')
    expect(onComplete).toHaveBeenCalledWith({
      message: {
        id: 'm-1',
        role: 'assistant',
        content: 'Hello world',
      },
    })
  })

  it('throws when the stream emits an error event', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: error\ndata: {"message":"boom"}\n\n',
          ),
        )
        controller.close()
      },
    })

    await expect(
      consumeSseStream(new Response(body), {
        onDelta: vi.fn(),
        onComplete: vi.fn(),
      }),
    ).rejects.toThrow('boom')
  })
})
