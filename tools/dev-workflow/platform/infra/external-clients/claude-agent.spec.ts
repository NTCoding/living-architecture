import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { z } from 'zod'

const {
  mockSdkQuery, mockWriteFile 
} = vi.hoisted(() => ({
  mockSdkQuery: vi.fn(),
  mockWriteFile: vi.fn(),
}))

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: mockSdkQuery }))

vi.mock('node:fs/promises', () => ({ writeFile: mockWriteFile }))

import {
  claude, ClaudeQueryError, CLAUDE_SDK_AGENT_ENV_VAR 
} from './claude-agent'

describe('ClaudeQueryError', () => {
  it('creates error with name ClaudeQueryError', () => {
    const error = new ClaudeQueryError('test message')

    expect(error.name).toBe('ClaudeQueryError')
    expect(error.message).toBe('test message')
  })
})

describe('CLAUDE_SDK_AGENT_ENV_VAR', () => {
  it('exports the constant', () => {
    expect(CLAUDE_SDK_AGENT_ENV_VAR).toBe('CLAUDE_SDK_AGENT')
  })
})

describe('claude.query', () => {
  const testSchema = z.object({
    result: z.string(),
    score: z.number(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteFile.mockResolvedValue(undefined)
  })

  it('returns parsed result from structured_output', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'success',
        result: 'raw result text',
        structured_output: {
          result: 'success',
          score: 100,
        },
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    const result = await claude.query({
      prompt: 'test prompt',
      model: 'sonnet',
      outputSchema: testSchema,
      outputPath: './test-output/output.md',
    })

    expect(result).toStrictEqual({
      result: 'success',
      score: 100,
    })
  })

  it('writes result to output path', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'success',
        result: 'raw result text',
        structured_output: {
          result: 'test',
          score: 50,
        },
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    await claude.query({
      prompt: 'test',
      model: 'haiku',
      outputSchema: testSchema,
      outputPath: './test-output/test-output.md',
    })

    expect(mockWriteFile).toHaveBeenCalledWith('./test-output/test-output.md', 'raw result text')
  })

  it('parses JSON from code block when no structured_output', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'success',
        result: '```json\n{"result": "parsed", "score": 75}\n```',
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    const result = await claude.query({
      prompt: 'test',
      model: 'opus',
      outputSchema: testSchema,
      outputPath: './test-output/output.md',
    })

    expect(result).toStrictEqual({
      result: 'parsed',
      score: 75,
    })
  })

  it('parses raw JSON when no code block', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'success',
        result: '{"result": "raw", "score": 25}',
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    const result = await claude.query({
      prompt: 'test',
      model: 'sonnet',
      outputSchema: testSchema,
      outputPath: './test-output/output.md',
    })

    expect(result).toStrictEqual({
      result: 'raw',
      score: 25,
    })
  })

  it('throws ClaudeQueryError when query fails with error subtype', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'error',
        result: 'Some error',
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    await expect(
      claude.query({
        prompt: 'test',
        model: 'sonnet',
        outputSchema: testSchema,
        outputPath: './test-output/output.md',
      }),
    ).rejects.toThrow('Claude query failed: error')
  })

  it('throws when query is interrupted', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'interrupted',
        result: 'Interrupted',
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    await expect(
      claude.query({
        prompt: 'test',
        model: 'sonnet',
        outputSchema: testSchema,
        outputPath: './test-output/output.md',
      }),
    ).rejects.toThrow('Claude query failed: interrupted')
  })

  it('throws when no result message received', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'progress',
        content: 'working...',
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    await expect(
      claude.query({
        prompt: 'test',
        model: 'sonnet',
        outputSchema: testSchema,
        outputPath: './test-output/output.md',
      }),
    ).rejects.toThrow('No result message received from Claude')
  })

  it('throws when SDK does not return async iterable', async () => {
    mockSdkQuery.mockReturnValue('not an iterable')

    await expect(
      claude.query({
        prompt: 'test',
        model: 'sonnet',
        outputSchema: testSchema,
        outputPath: './test-output/output.md',
      }),
    ).rejects.toThrow('SDK query did not return an async iterable')
  })

  it('throws when SDK returns null', async () => {
    mockSdkQuery.mockReturnValue(null)

    await expect(
      claude.query({
        prompt: 'test',
        model: 'sonnet',
        outputSchema: testSchema,
        outputPath: './test-output/output.md',
      }),
    ).rejects.toThrow('SDK query did not return an async iterable')
  })

  it('throws when result is not valid JSON', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'success',
        result: 'this is not json at all',
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    await expect(
      claude.query({
        prompt: 'test',
        model: 'sonnet',
        outputSchema: testSchema,
        outputPath: './test-output/output.md',
      }),
    ).rejects.toThrow('Could not extract JSON from result')
  })

  it('throws when JSON code block is incomplete', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'success',
        result: '```json\n{"incomplete": true',
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    await expect(
      claude.query({
        prompt: 'test',
        model: 'sonnet',
        outputSchema: testSchema,
        outputPath: './test-output/output.md',
      }),
    ).rejects.toThrow('Could not extract JSON')
  })

  it('passes settingSources option to SDK', async () => {
    async function* mockAsyncIterable(): AsyncGenerator<unknown> {
      yield {
        type: 'result',
        subtype: 'success',
        result: '{}',
        structured_output: {
          result: 'test',
          score: 1,
        },
      }
    }
    mockSdkQuery.mockReturnValue(mockAsyncIterable())

    await claude.query({
      prompt: 'test',
      model: 'sonnet',
      outputSchema: testSchema,
      outputPath: './test-output/output.md',
      settingSources: ['user', 'project'],
    })

    expect(mockSdkQuery).toHaveBeenCalledWith(
      expect.objectContaining({options: expect.objectContaining({ settingSources: ['user', 'project'] }),}),
    )
  })
})
