import { describe, expect, it } from 'vitest'
import { TaskPreservingTokenLimiter, withinBudget } from './task-preserving-token-limiter'
import type { ProcessLLMRequestArgs } from '@mastra/core/processors'

type Prompt = ProcessLLMRequestArgs['prompt']

function system(text: string): Prompt[number] {
  return { role: 'system', content: text }
}

function user(text: string): Prompt[number] {
  return { role: 'user', content: [{ type: 'text', text }] }
}

function assistant(text: string): Prompt[number] {
  return { role: 'assistant', content: [{ type: 'text', text }] }
}

describe('withinBudget', () => {
  it('keeps everything when the history fits the budget', () => {
    const prompt: Prompt = [system('behave'), user('the task'), assistant('working')]

    expect(withinBudget(prompt, 1_000)).toStrictEqual(prompt)
  })

  it('keeps the system messages and the task while trimming the oldest history', () => {
    const prompt: Prompt = [
      system('behave'),
      user('the task'),
      assistant('old exchange one'),
      assistant('old exchange two'),
      assistant('the newest exchange'),
    ]

    const kept = withinBudget(prompt, 40)

    expect(kept).toStrictEqual([
      system('behave'),
      user('the task'),
      assistant('the newest exchange'),
    ])
  })

  it('rewinds past tool results whose exchange no longer fits', () => {
    const prompt: Prompt = [
      user('the task'),
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'run', input: '{}' }],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'run',
            output: { type: 'text', value: 'old result' },
          },
        ],
      },
      assistant('newest'),
    ]

    const kept = withinBudget(prompt, 30)

    expect(kept).toStrictEqual([user('the task'), assistant('newest')])
  })

  it('rewinds the window to the newest exchange when an older tool call no longer fits', () => {
    const prompt: Prompt = [
      user('the task'),
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'run', input: '{}' }],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'run',
            output: { type: 'text', value: 'old result' },
          },
        ],
      },
      assistant('newest'),
    ]

    expect(withinBudget(prompt, 70)).toStrictEqual([user('the task'), assistant('newest')])
  })

  it('stops at the first message that does not fit, keeping the window contiguous', () => {
    const prompt: Prompt = [
      user('the task'),
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'run', input: '{}' }],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'run',
            output: { type: 'text', value: 'large result' },
          },
        ],
      },
      assistant('newest'),
    ]

    const kept = withinBudget(prompt, 40)

    expect(kept).toStrictEqual([user('the task'), assistant('newest')])
    expect(JSON.stringify(kept)).not.toContain('tool-call')
    expect(JSON.stringify(kept)).not.toContain('tool-result')
  })

  it('keeps only the head when a trimmed window would start with orphaned tool results', () => {
    const prompt: Prompt = [
      user('the task'),
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'run', input: '{}' }],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'run',
            output: { type: 'text', value: 'old result' },
          },
        ],
      },
    ]

    expect(withinBudget(prompt, 51)).toStrictEqual([user('the task')])
  })

  it('keeps only the head when no user message exists', () => {
    const prompt: Prompt = [system('behave'), assistant('working')]

    expect(withinBudget(prompt, 10)).toStrictEqual([system('behave')])
  })
})

describe('TaskPreservingTokenLimiter', () => {
  it('returns the trimmed prompt when the history exceeds the budget', () => {
    const limiter = new TaskPreservingTokenLimiter({ limit: 35 })

    const result = limiter.processLLMRequest({
      prompt: [system('behave'), user('the task'), assistant('old'), assistant('newest')],
    })

    expect(result).toStrictEqual({
      prompt: [system('behave'), user('the task'), assistant('newest')],
    })
  })

  it('returns undefined and leaves the prompt alone when the history fits', () => {
    const limiter = new TaskPreservingTokenLimiter({ limit: 10_000 })

    const result = limiter.processLLMRequest({
      prompt: [system('behave'), user('the task'), assistant('working')],
    })

    expect(result).toBeUndefined()
  })
})
