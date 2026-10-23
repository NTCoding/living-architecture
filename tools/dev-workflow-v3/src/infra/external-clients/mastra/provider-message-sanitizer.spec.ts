import { describe, expect, it } from 'vitest'
import { ProviderMessageSanitizer, sanitizePrompt } from './provider-message-sanitizer'
import type { ProcessLLMRequestArgs } from '@mastra/core/processors'

type Prompt = ProcessLLMRequestArgs['prompt']

function aPrompt(messages: Prompt): Prompt {
  return messages
}

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
  it('keeps a well-shaped history untouched', () => {
    const prompt = aPrompt([
      system('behave'),
      user('the task'),
      assistantWithText('working'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'done'),
    ])

    expect(sanitizePrompt(prompt)).toStrictEqual(prompt)
  })

  it('drops assistant messages left empty by tool-call filtering', () => {
    const prompt = aPrompt([
      user('the task'),
      { role: 'assistant', content: [] },
      assistantWithText('working'),
    ])

    expect(sanitizePrompt(prompt)).toStrictEqual([user('the task'), assistantWithText('working')])
  })

  it('drops tool results whose assistant tool call was trimmed away', () => {
    const prompt = aPrompt([
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'done'),
      toolResult('call-gone', 'lost'),
    ])

    const sanitized = sanitizePrompt(prompt)

    expect(sanitized).toStrictEqual([
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'done'),
    ])
  })

  it('keeps only the tool result that still has its assistant tool call', () => {
    const prompt = aPrompt([
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'kept'),
      toolResult('call-gone', 'lost'),
    ])

    expect(sanitizePrompt(prompt)).toStrictEqual([
      user('the task'),
      assistantWithToolCall('call-1'),
      toolResult('call-1', 'kept'),
    ])
  })
})

describe('ProviderMessageSanitizer', () => {
  it('returns the tidied prompt when the history lost its shape', () => {
    const sanitizer = new ProviderMessageSanitizer()

    const result = sanitizer.processLLMRequest({
      prompt: aPrompt([user('the task'), { role: 'assistant', content: [] }]),
    })

    expect(result).toStrictEqual({ prompt: [user('the task')] })
  })

  it('returns undefined and leaves the prompt alone when the history is well-shaped', () => {
    const sanitizer = new ProviderMessageSanitizer()

    const result = sanitizer.processLLMRequest({
      prompt: aPrompt([user('the task'), assistantWithText('working')]),
    })

    expect(result).toBeUndefined()
  })
})
