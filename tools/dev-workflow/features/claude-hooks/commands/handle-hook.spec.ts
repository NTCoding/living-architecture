import {
  describe, it, expect, vi, afterEach 
} from 'vitest'
import {
  shouldSkipHooks, parseHookInput, routeToHandler 
} from './handle-hook'
import type { PreToolUseInput } from '../domain/hook-input-schemas'
import { CLAUDE_SDK_AGENT_ENV_VAR } from '../../../platform/infra/external-clients/claude-agent'

describe('shouldSkipHooks', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when env var is not set', () => {
    vi.stubEnv(CLAUDE_SDK_AGENT_ENV_VAR, '')

    expect(shouldSkipHooks()).toStrictEqual(false)
  })

  it('returns true when env var is "true"', () => {
    vi.stubEnv(CLAUDE_SDK_AGENT_ENV_VAR, 'true')

    expect(shouldSkipHooks()).toStrictEqual(true)
  })

  it('returns true when env var is "TRUE" (case insensitive)', () => {
    vi.stubEnv(CLAUDE_SDK_AGENT_ENV_VAR, 'TRUE')

    expect(shouldSkipHooks()).toStrictEqual(true)
  })

  it('returns true when env var is "1"', () => {
    vi.stubEnv(CLAUDE_SDK_AGENT_ENV_VAR, '1')

    expect(shouldSkipHooks()).toStrictEqual(true)
  })

  it('returns false when env var is other value', () => {
    vi.stubEnv(CLAUDE_SDK_AGENT_ENV_VAR, 'false')

    expect(shouldSkipHooks()).toStrictEqual(false)
  })
})

describe('parseHookInput', () => {
  const validInput = {
    session_id: 'session-123',
    transcript_path: '/path/to/transcript',
    cwd: '/working/dir',
    permission_mode: 'default',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'ls' },
  }

  it('returns success true for valid input', () => {
    const result = parseHookInput(validInput)

    expect(result.success).toStrictEqual(true)
  })

  it('returns parsed input data for valid input', () => {
    const result = parseHookInput(validInput)

    expect(result).toMatchObject({
      success: true,
      input: expect.objectContaining({ hook_event_name: 'PreToolUse' }),
    })
  })

  it('returns success false for invalid input', () => {
    const result = parseHookInput({ invalid: 'data' })

    expect(result.success).toStrictEqual(false)
  })

  it('returns error message for invalid input', () => {
    const result = parseHookInput({ invalid: 'data' })

    expect(result).toMatchObject({
      success: false,
      error: expect.any(String),
    })
  })
})

describe('routeToHandler', () => {
  const baseInput = {
    session_id: 'session-123',
    transcript_path: '/path/to/transcript',
    cwd: '/working/dir',
    permission_mode: 'default' as const,
  }

  it('routes PreToolUse to pre-tool-use handler', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    }

    const result = routeToHandler(input)

    expect(result).toMatchObject({hookSpecificOutput: expect.objectContaining({ hookEventName: 'PreToolUse' }),})
  })

  it('routes PostToolUse to post-tool-use handler', () => {
    const input = {
      ...baseInput,
      hook_event_name: 'PostToolUse' as const,
      tool_name: 'Bash',
      tool_response: { stdout: 'output' },
    }

    const result = routeToHandler(input)

    expect(result).toMatchObject({hookSpecificOutput: expect.objectContaining({ hookEventName: 'PostToolUse' }),})
  })

  it('routes Stop to stop handler', () => {
    const input = {
      ...baseInput,
      hook_event_name: 'Stop' as const,
      stop_hook_active: false,
    }

    const result = routeToHandler(input)

    expect(result).toHaveProperty('_tag')
  })
})
