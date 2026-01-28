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
    it('parses continue true', () => {
      const output = stopOutputSchema.parse({ continue: true })

      expect(output.continue).toStrictEqual(true)
    })

    it('parses continue false with stopReason', () => {
      const output = stopOutputSchema.parse({
        continue: false,
        stopReason: 'must wait for CI',
      })

      expect(output.continue).toStrictEqual(false)
      expect(output.stopReason).toStrictEqual('must wait for CI')
    })

    it('parses empty object', () => {
      const output = stopOutputSchema.parse({})

      expect(output.continue).toBeUndefined()
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
    it('allows continue true', () => {
      const output: StopOutput = { continue: true }
      expect(output.continue).toBe(true)
    })

    it('allows continue false with stopReason', () => {
      const output: StopOutput = {
        continue: false,
        stopReason: 'must wait for CI',
      }
      expect(output.continue).toBe(false)
      expect(output.stopReason).toBe('must wait for CI')
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
      expect(output).toBeDefined()
    })

    it('accepts StopOutput', () => {
      const output: HookOutput = { continue: true }
      expect(output).toBeDefined()
    })
  })
})
