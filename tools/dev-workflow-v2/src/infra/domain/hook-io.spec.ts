import {
  describe, it, expect 
} from 'vitest'
import { z } from 'zod'
import {
  parseCommonInput, parsePreToolUseInput, formatDenyDecision 
} from './hook-io'
import { WorkflowError } from './workflow-error'

const DENY_DECISION_SCHEMA = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.string(),
    permissionDecision: z.string(),
    permissionDecisionReason: z.string(),
  }),
})

describe('hook-io', () => {
  describe('parseCommonInput', () => {
    it('parses valid common hook input', () => {
      const input = JSON.stringify({
        session_id: 'sess-1',
        transcript_path: '/path/to/transcript',
        cwd: '/some/dir',
        hook_event_name: 'PreToolUse',
      })
      const result = parseCommonInput(input)
      expect(result.session_id).toStrictEqual('sess-1')
      expect(result.hook_event_name).toStrictEqual('PreToolUse')
    })

    it('throws on invalid JSON', () => {
      expect(() => parseCommonInput('not-json')).toThrow(WorkflowError)
      expect(() => parseCommonInput('not-json')).toThrow('Cannot parse hook input JSON')
    })

    it('throws on missing required fields', () => {
      const input = JSON.stringify({ session_id: 'sess-1' })
      expect(() => parseCommonInput(input)).toThrow(WorkflowError)
      expect(() => parseCommonInput(input)).toThrow('Invalid hook input for HookCommonInput')
    })
  })

  describe('parsePreToolUseInput', () => {
    it('parses valid PreToolUse input', () => {
      const input = JSON.stringify({
        session_id: 'sess-1',
        transcript_path: '/path',
        cwd: '/dir',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' },
        tool_use_id: 'tu-1',
      })
      const result = parsePreToolUseInput(input)
      expect(result.tool_name).toStrictEqual('Bash')
      expect(result.tool_input['command']).toStrictEqual('ls -la')
    })

    it('throws on invalid JSON', () => {
      expect(() => parsePreToolUseInput('{bad')).toThrow(WorkflowError)
      expect(() => parsePreToolUseInput('{bad')).toThrow('Cannot parse hook input JSON')
    })

    it('throws on missing tool fields', () => {
      const input = JSON.stringify({
        session_id: 'sess-1',
        transcript_path: '/path',
        cwd: '/dir',
        hook_event_name: 'PreToolUse',
      })
      expect(() => parsePreToolUseInput(input)).toThrow(WorkflowError)
      expect(() => parsePreToolUseInput(input)).toThrow('Invalid hook input for PreToolUseInput')
    })
  })

  describe('formatDenyDecision', () => {
    it('formats deny decision as JSON', () => {
      const result = formatDenyDecision('blocked by workflow')
      const parsed = DENY_DECISION_SCHEMA.parse(JSON.parse(result))
      expect(parsed.hookSpecificOutput.permissionDecision).toStrictEqual('deny')
      expect(parsed.hookSpecificOutput.permissionDecisionReason).toStrictEqual(
        'blocked by workflow',
      )
    })
  })
})
