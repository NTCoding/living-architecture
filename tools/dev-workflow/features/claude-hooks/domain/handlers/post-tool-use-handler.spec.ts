import {
  describe, it, expect 
} from 'vitest'
import type { PostToolUseInput } from '../hook-input-schemas'
import { handlePostToolUse } from './post-tool-use-handler'

const baseInput: PostToolUseInput = {
  session_id: 'session-123',
  transcript_path: '/path/to/transcript',
  cwd: '/working/dir',
  permission_mode: 'default',
  hook_event_name: 'PostToolUse',
  tool_name: 'Bash',
  tool_response: { stdout: 'command output' },
}

describe('handlePostToolUse', () => {
  it('returns no context for regular output', () => {
    const result = handlePostToolUse(baseInput)

    expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    expect(result.hookSpecificOutput).not.toHaveProperty('additionalContext')
  })

  it('adds reminder when output contains max-lines', () => {
    const input: PostToolUseInput = {
      ...baseInput,
      tool_response: { stdout: 'Error: max-lines exceeded' },
    }

    const result = handlePostToolUse(input)

    expect(result.hookSpecificOutput.additionalContext).toContain('max-lines')
    expect(result.hookSpecificOutput.additionalContext).toContain('design feedback')
  })

  it('handles non-string stdout gracefully', () => {
    const input: PostToolUseInput = {
      ...baseInput,
      tool_response: { stdout: 123 },
    }

    const result = handlePostToolUse(input)

    expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    expect(result.hookSpecificOutput).not.toHaveProperty('additionalContext')
  })

  it('handles undefined stdout gracefully', () => {
    const input: PostToolUseInput = {
      ...baseInput,
      tool_response: {},
    }

    const result = handlePostToolUse(input)

    expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse')
  })
})
