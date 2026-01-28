import {
  describe, it, expect 
} from 'vitest'
import {
  preToolUseOutputSchema,
  postToolUseOutputSchema,
  stopOutputSchema,
} from './hook-output-schemas'
import type {
  PreToolUseOutput,
  PostToolUseOutput,
  StopOutput,
  HookOutput,
} from './hook-output-schemas'

describe('hook output schemas', () => {
  describe('preToolUseOutputSchema', () => {
    it('parses valid PreToolUse output', () => {
      const output = preToolUseOutputSchema.parse({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          permissionDecisionReason: 'allowed',
        },
      })

      expect(output.hookSpecificOutput.permissionDecision).toStrictEqual('allow')
    })

    it('parses deny decision', () => {
      const output = preToolUseOutputSchema.parse({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: 'blocked',
        },
      })

      expect(output.hookSpecificOutput.permissionDecision).toStrictEqual('deny')
    })

    it('parses ask decision', () => {
      const output = preToolUseOutputSchema.parse({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: 'needs confirmation',
        },
      })

      expect(output.hookSpecificOutput.permissionDecision).toStrictEqual('ask')
    })

    it('rejects invalid permission decision', () => {
      expect(() =>
        preToolUseOutputSchema.parse({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'invalid',
            permissionDecisionReason: 'test',
          },
        }),
      ).toThrow('Invalid option')
    })
  })

  describe('postToolUseOutputSchema', () => {
    it('parses valid PostToolUse output', () => {
      const output = postToolUseOutputSchema.parse({hookSpecificOutput: { hookEventName: 'PostToolUse' },})

      expect(output.hookSpecificOutput.hookEventName).toStrictEqual('PostToolUse')
    })

    it('parses PostToolUse output with additionalContext', () => {
      const output = postToolUseOutputSchema.parse({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: 'extra info',
        },
      })

      expect(output.hookSpecificOutput.additionalContext).toStrictEqual('extra info')
    })
  })

  describe('stopOutputSchema', () => {
    it('parses allow tag', () => {
      const output = stopOutputSchema.parse({ _tag: 'allow' })

      expect(output._tag).toBe('allow')
    })

    it('parses block tag with reason', () => {
      const output = stopOutputSchema.parse({
        _tag: 'block',
        reason: 'must wait for CI',
      })

      expect(output._tag).toBe('block')
      expect(output._tag === 'block' && output.reason).toStrictEqual('must wait for CI')
    })
  })
})

describe('hook output types', () => {
  describe('PreToolUseOutput', () => {
    it('allows valid PreToolUse output', () => {
      const output: PreToolUseOutput = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          permissionDecisionReason: 'allowed',
        },
      }
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow')
    })

    it('supports deny decision', () => {
      const output: PreToolUseOutput = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: 'blocked',
        },
      }
      expect(output.hookSpecificOutput.permissionDecision).toBe('deny')
    })

    it('supports ask decision', () => {
      const output: PreToolUseOutput = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: 'needs confirmation',
        },
      }
      expect(output.hookSpecificOutput.permissionDecision).toBe('ask')
    })
  })

  describe('PostToolUseOutput', () => {
    it('allows valid PostToolUse output', () => {
      const output: PostToolUseOutput = { hookSpecificOutput: { hookEventName: 'PostToolUse' } }
      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    })

    it('supports optional additionalContext', () => {
      const output: PostToolUseOutput = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: 'extra info',
        },
      }
      expect(output.hookSpecificOutput.additionalContext).toBe('extra info')
    })
  })

  describe('StopOutput', () => {
    it('allows allow tag', () => {
      const output: StopOutput = { _tag: 'allow' }
      expect(output._tag).toBe('allow')
    })

    it('allows block tag with reason', () => {
      const output: StopOutput = {
        _tag: 'block',
        reason: 'must wait for CI',
      }
      expect(output._tag).toBe('block')
      expect(output.reason).toBe('must wait for CI')
    })
  })

  describe('HookOutput union', () => {
    it('accepts PreToolUseOutput', () => {
      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          permissionDecisionReason: 'ok',
        },
      }
      expect('hookSpecificOutput' in output).toBe(true)
      const parsed = preToolUseOutputSchema.safeParse(output)
      expect(parsed.success).toBe(true)
    })

    it('accepts StopOutput', () => {
      const output: HookOutput = {
        _tag: 'block',
        reason: 'test',
      }
      expect('_tag' in output).toBe(true)
      const parsed = stopOutputSchema.safeParse(output)
      expect(parsed.success).toBe(true)
    })
  })
})
