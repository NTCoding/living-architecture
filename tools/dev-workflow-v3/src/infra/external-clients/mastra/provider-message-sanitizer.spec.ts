import { describe, expect, it } from 'vitest'
import { ProviderMessageSanitizer, sanitizePrompt } from './provider-message-sanitizer'
import type { ProcessLLMRequestArgs } from '@mastra/core/processors'

type Prompt = ProcessLLMRequestArgs['prompt']

function system(text: string): Prompt[number] {
  return { role: 'system', content: text }
}

function user(text: string): Prompt[number] {
  return { role: 'user', content: [{ type: 'text', text }] }
}

function assistantWithToolCall(toolCallId: string): Prompt[number] {
  return {
    role: 'assistant',
    content: [{ type: 'tool-call', toolCallId, toolName: 'run', input: '{}' }],
  }
}

function assistantWithText(text: string): Prompt[number] {
  return { role: 'assistant', content: [{ type: 'text', text }] }
}

function toolResult(toolCallId: string, text: string): Prompt[number] {
  return {
    role: 'tool',
    content: [
      { type: 'tool-result', toolCallId, toolName: 'run', output: { type: 'text', value: text } },
    ],
  }
}

describe('sanitizePrompt', () => {
  it('reports no change for a well-shaped history', () => {
    const prompt: Prompt = [
      system('behave'),
      user('the task'),
      assistantWithText('working'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'done'),
    ]

    expect(sanitizePrompt(prompt)).toStrictEqual({ prompt, changed: false })
  })

  it('drops assistant messages left empty by tool-call filtering and reports the change', () => {
    const prompt: Prompt = [
      user('the task'),
      { role: 'assistant', content: [] },
      assistantWithText('working'),
    ]

    const result = sanitizePrompt(prompt)

    expect(result.prompt).toStrictEqual([user('the task'), assistantWithText('working')])
    expect(result.changed).toBe(true)
  })

  it('drops tool results whose assistant tool call was trimmed away and reports the change', () => {
    const prompt: Prompt = [
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'done'),
      toolResult('call-gone', 'lost'),
    ]

    const result = sanitizePrompt(prompt)

    expect(result.prompt).toStrictEqual([
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'done'),
    ])
    expect(result.changed).toBe(true)
  })

  it('drops the orphaned part of a tool message that still holds a kept result', () => {
    const prompt: Prompt = [
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'kept'),
      toolResult('call-gone', 'lost'),
    ]

    const result = sanitizePrompt(prompt)

    expect(result.prompt).toStrictEqual([
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'kept'),
    ])
    expect(result.changed).toBe(true)
  })

  it('reports no change when every tool result still has its assistant tool call', () => {
    const prompt: Prompt = [
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'kept'),
    ]

    expect(sanitizePrompt(prompt)).toStrictEqual({ prompt, changed: false })
  })
})

describe('ProviderMessageSanitizer', () => {
  it('returns the tidied prompt when the history lost its shape', () => {
    const sanitizer = new ProviderMessageSanitizer()

    const result = sanitizer.processLLMRequest({
      prompt: [user('the task'), { role: 'assistant', content: [] }],
    })

    expect(result).toStrictEqual({ prompt: [user('the task')] })
  })

  it('returns the tidied prompt when only a tool result part is orphaned', () => {
    const sanitizer = new ProviderMessageSanitizer()

    const result = sanitizer.processLLMRequest({
      prompt: [
        user('the task'),
        assistantWithToolCall('call-1'),
        toolResult('call-1', 'kept'),
        toolResult('call-gone', 'lost'),
      ],
    })

    expect(result).toStrictEqual({
      prompt: [user('the task'), assistantWithToolCall('call-1'), toolResult('call-1', 'kept')],
    })
  })

  it('returns undefined and leaves the prompt alone when the history is well-shaped', () => {
    const sanitizer = new ProviderMessageSanitizer()

    const result = sanitizer.processLLMRequest({
      prompt: [user('the task'), assistantWithText('working')],
    })

    expect(result).toBeUndefined()
  })
})
