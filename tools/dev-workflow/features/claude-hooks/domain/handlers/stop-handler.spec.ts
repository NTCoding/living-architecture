import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import type { StopInput } from '../hook-input-schemas'

const {
  mockExistsSync, mockReadFileSync 
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}))

import { handleStop } from './stop-handler'

const baseInput: StopInput = {
  session_id: 'session-123',
  transcript_path: '/path/to/transcript.jsonl',
  cwd: '/working/dir',
  permission_mode: 'default',
  hook_event_name: 'Stop',
  stop_hook_active: false,
}

describe('handleStop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync.mockReturnValue(true)
  })

  it('blocks stop when transcript does not exist', () => {
    mockExistsSync.mockReturnValue(false)

    const result = handleStop(baseInput)

    expect(result._tag).toBe('block')
    expect(result._tag === 'block' && result.reason).toContain('MANDATORY')
  })

  it('allows stop when message has [Mergeable PR] prefix', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        type: 'assistant',
        message: { content: '[Mergeable PR] The PR is ready for review.' },
      }),
    )

    const result = handleStop(baseInput)

    expect(result._tag).toBe('allow')
  })

  it('allows stop when message has [No Mergeable PR: prefix', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        type: 'assistant',
        message: { content: '[No Mergeable PR: awaiting user input] Cannot proceed.' },
      }),
    )

    const result = handleStop(baseInput)

    expect(result._tag).toBe('allow')
  })

  it('blocks stop when message lacks required prefix', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        type: 'assistant',
        message: { content: 'I completed the task.' },
      }),
    )

    const result = handleStop(baseInput)

    expect(result._tag).toBe('block')
    expect(result._tag === 'block' && result.reason).toContain('MANDATORY')
  })

  it('handles content as array of text blocks', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: '[Mergeable PR] Done.',
            },
          ],
        },
      }),
    )

    const result = handleStop(baseInput)

    expect(result._tag).toBe('allow')
  })

  it('handles multiple lines taking last assistant message', () => {
    const userMsg = {
      type: 'user',
      message: { content: 'First' },
    }
    const assistantNoPrefix = {
      type: 'assistant',
      message: { content: 'No prefix' },
    }
    const assistantWithPrefix = {
      type: 'assistant',
      message: { content: '[Mergeable PR] Ready' },
    }
    const transcript = [
      JSON.stringify(userMsg),
      JSON.stringify(assistantNoPrefix),
      JSON.stringify(assistantWithPrefix),
    ].join('\n')
    mockReadFileSync.mockReturnValue(transcript)

    const result = handleStop(baseInput)

    expect(result._tag).toBe('allow')
  })

  it('blocks when no assistant messages found', () => {
    const userMsg = {
      type: 'user',
      message: { content: 'Hi' },
    }
    const transcript = [JSON.stringify(userMsg)].join('\n')
    mockReadFileSync.mockReturnValue(transcript)

    const result = handleStop(baseInput)

    expect(result._tag).toBe('block')
  })

  it('handles invalid JSON lines gracefully', () => {
    const validMsg = {
      type: 'assistant',
      message: { content: '[Mergeable PR] Done' },
    }
    const transcript = ['not valid json', JSON.stringify(validMsg)].join('\n')
    mockReadFileSync.mockReturnValue(transcript)

    const result = handleStop(baseInput)

    expect(result._tag).toBe('allow')
  })

  it('allows prefix with leading whitespace', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        type: 'assistant',
        message: { content: '  [Mergeable PR] With whitespace.' },
      }),
    )

    const result = handleStop(baseInput)

    expect(result._tag).toBe('allow')
  })

  it('allows stop when prefix is in a later text block', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: 'Some tool output or other text without prefix.',
            },
            {
              type: 'text',
              text: '[No Mergeable PR: awaiting user input]',
            },
          ],
        },
      }),
    )

    const result = handleStop(baseInput)

    expect(result._tag).toBe('allow')
  })

  it('blocks when no text blocks have the prefix', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: 'First block without prefix.',
            },
            {
              type: 'text',
              text: 'Second block also without prefix.',
            },
          ],
        },
      }),
    )

    const result = handleStop(baseInput)

    expect(result._tag).toBe('block')
  })

  it('allows stop when stop_hook_active is true to prevent infinite loops', () => {
    const input: StopInput = {
      ...baseInput,
      stop_hook_active: true,
    }

    const result = handleStop(input)

    expect(result._tag).toBe('allow')
  })
})
