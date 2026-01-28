import {
  describe, it, expect 
} from 'vitest'
import { hookInputSchema } from './hook-input-schemas'

describe('hookInputSchema', () => {
  const baseInput = {
    session_id: 'session-123',
    transcript_path: '/path/to/transcript',
    cwd: '/working/dir',
    permission_mode: 'auto',
  }

  describe('PreToolUse', () => {
    it('parses valid PreToolUse input', () => {
      const input = {
        ...baseInput,
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
      }
      const result = hookInputSchema.parse(input)
      expect(result.hook_event_name).toBe('PreToolUse')
    })

    it('rejects PreToolUse without tool_name', () => {
      const input = {
        ...baseInput,
        hook_event_name: 'PreToolUse',
        tool_input: {},
      }
      expect(() => hookInputSchema.parse(input)).toThrow('expected string')
    })
  })

  describe('PostToolUse', () => {
    it('parses valid PostToolUse input', () => {
      const input = {
        ...baseInput,
        hook_event_name: 'PostToolUse',
        tool_name: 'Bash',
        tool_response: { output: 'success' },
      }
      const result = hookInputSchema.parse(input)
      expect(result.hook_event_name).toBe('PostToolUse')
    })
  })

  describe('Stop', () => {
    it('parses valid Stop input', () => {
      const input = {
        ...baseInput,
        hook_event_name: 'Stop',
        stop_hook_active: true,
      }
      const result = hookInputSchema.parse(input)
      expect(result.hook_event_name).toBe('Stop')
    })

    it('rejects Stop without stop_hook_active', () => {
      const input = {
        ...baseInput,
        hook_event_name: 'Stop',
      }
      expect(() => hookInputSchema.parse(input)).toThrow('expected boolean')
    })
  })

  it('rejects unknown hook_event_name', () => {
    const input = {
      ...baseInput,
      hook_event_name: 'Unknown',
    }
    expect(() => hookInputSchema.parse(input)).toThrow('Invalid input')
  })
})
