import { z } from 'zod'
import { WorkflowError } from '../../domain/workflow-error'

const HOOK_COMMON_INPUT = z.object({
  session_id: z.string(),
  transcript_path: z.string(),
  cwd: z.string(),
  permission_mode: z.string().optional(),
  hook_event_name: z.string(),
})

const PRE_TOOL_USE_INPUT = HOOK_COMMON_INPUT.extend({
  tool_name: z.string(),
  tool_input: z.record(z.unknown()),
  tool_use_id: z.string(),
})

type HookCommonInput = z.infer<typeof HOOK_COMMON_INPUT>
type PreToolUseInput = z.infer<typeof PRE_TOOL_USE_INPUT>

export const EXIT_ALLOW = 0
export const EXIT_BLOCK = 2
export const EXIT_ERROR = 1

export function parseCommonInput(raw: string): HookCommonInput {
  return parseWithSchema(HOOK_COMMON_INPUT, raw, 'HookCommonInput')
}

export function parsePreToolUseInput(raw: string): PreToolUseInput {
  return parseWithSchema(PRE_TOOL_USE_INPUT, raw, 'PreToolUseInput')
}

export function formatDenyDecision(reason: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  })
}

function parseWithSchema<T>(schema: z.ZodType<T>, raw: string, schemaName: string): T {
  const json = tryParseHookJson(raw, schemaName)
  const result = schema.safeParse(json)
  if (!result.success) {
    throw new WorkflowError(`Invalid hook input for ${schemaName}: ${result.error.message}`)
  }
  return result.data
}

function tryParseHookJson(raw: string, schemaName: string): unknown {
  try {
    return JSON.parse(raw)
  } catch (cause) {
    throw new WorkflowError(`Cannot parse hook input JSON for ${schemaName}: ${String(cause)}`)
  }
}
