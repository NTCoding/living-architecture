import {
  describe, it, expect 
} from 'vitest'
import type { PreToolUseInput } from '../hook-input-schemas'
import { handlePreToolUse } from './pre-tool-use-handler'

const baseInput: PreToolUseInput = {
  session_id: 'session-123',
  transcript_path: '/path/to/transcript',
  cwd: '/working/dir',
  permission_mode: 'default',
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'ls -la' },
}

describe('handlePreToolUse', () => {
  it('allows safe commands', () => {
    const result = handlePreToolUse(baseInput)

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('allows when tool_input has no command field', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {},
    }

    const result = handlePreToolUse(input)

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow')
    expect(result.hookSpecificOutput.permissionDecisionReason).toBe('No command to validate')
  })

  it('allows when tool_input has empty command', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { command: '' },
    }

    const result = handlePreToolUse(input)

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('denies commands with --no-verify flag', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { command: 'git commit --no-verify -m "msg"' },
    }

    const result = handlePreToolUse(input)

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('--no-verify')
  })

  it('denies commands with --force flag', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { command: 'git push --force origin main' },
    }

    const result = handlePreToolUse(input)

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('--force')
  })

  it('denies blocked git push command', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { command: 'git push origin feature' },
    }

    const result = handlePreToolUse(input)

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('/complete-task')
  })

  it('denies blocked gh pr create command', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { command: 'gh pr create --title "Fix"' },
    }

    const result = handlePreToolUse(input)

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny')
  })
})
