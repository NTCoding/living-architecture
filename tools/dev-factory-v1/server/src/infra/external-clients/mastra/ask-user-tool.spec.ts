import { describe, expect, it } from 'vitest'
import { answerOf, createAskUserTool } from './ask-user-tool'

type SuspendPayload = { question: string; evidence: string | null }

function suspendCalledWith(called: SuspendPayload[]): (payload: SuspendPayload) => Promise<void> {
  return async (payload: SuspendPayload) => {
    called.push(payload)
  }
}

describe('createAskUserTool', () => {
  it('suspends with the question and the evidence when there is no answer to resume', async () => {
    const tool = createAskUserTool()
    const suspended: SuspendPayload[] = []

    const outcome = await tool.execute?.(
      { question: 'Which library should I use?', evidence: 'two candidates' },
      {
        agent: {
          agentId: 'implementer',
          toolCallId: 'call-1',
          messages: [],
          suspend: suspendCalledWith(suspended),
        },
        observe: {
          span: async <T>(_name: string, fn: () => Promise<T> | T) => await fn(),
          log: () => undefined,
        },
      },
    )

    expect(outcome).toBeUndefined()
    expect(suspended).toStrictEqual([
      { question: 'Which library should I use?', evidence: 'two candidates' },
    ])
  })

  it('returns the resumed answer when the person has answered', async () => {
    const tool = createAskUserTool()
    const suspended: SuspendPayload[] = []

    const outcome = await tool.execute?.(
      { question: 'Which library should I use?', evidence: 'two candidates' },
      {
        agent: {
          agentId: 'implementer',
          toolCallId: 'call-1',
          messages: [],
          suspend: suspendCalledWith(suspended),
          resumeData: { answer: 'the first one' },
        },
        observe: {
          span: async <T>(_name: string, fn: () => Promise<T> | T) => await fn(),
          log: () => undefined,
        },
      },
    )

    expect(outcome).toStrictEqual({ answer: 'the first one' })
    expect(suspended).toHaveLength(0)
  })
})

describe('answerOf', () => {
  it('carries the answer when the resume data has a string answer', () => {
    expect(answerOf({ answer: 'reuse the port' })).toStrictEqual({ answer: 'reuse the port' })
  })

  it('carries no answer when the resume data is not an object with a string answer', () => {
    expect(answerOf('the person refused')).toBeNull()
    expect(answerOf({ answer: 42 })).toBeNull()
  })

  it('carries no answer when the resume data is missing or empty', () => {
    expect(answerOf(undefined)).toBeNull()
    expect(answerOf(null)).toBeNull()
    expect(answerOf({})).toBeNull()
  })
})
