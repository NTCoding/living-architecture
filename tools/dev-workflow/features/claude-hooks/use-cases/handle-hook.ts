import {
  hookInputSchema, type HookInput 
} from '../domain/hook-input-schemas'
import type { HookOutput } from '../domain/hook-output-schemas'
import { handlePreToolUse } from '../domain/handlers/pre-tool-use-handler'
import { handlePostToolUse } from '../domain/handlers/post-tool-use-handler'
import { handleStop } from '../domain/handlers/stop-handler'
import { CLAUDE_SDK_AGENT_ENV_VAR } from '../../../platform/infra/external-clients/claude-agent'

export function shouldSkipHooks(): boolean {
  const sdkAgentEnv = process.env[CLAUDE_SDK_AGENT_ENV_VAR]
  if (!sdkAgentEnv) {
    return false
  }
  return sdkAgentEnv.toLowerCase() === 'true' || sdkAgentEnv === '1'
}

type ParseInputResult =
  | {
    success: true
    input: HookInput
  }
  | {
    success: false
    error: string
  }

export function parseHookInput(rawJson: unknown): ParseInputResult {
  const parseResult = hookInputSchema.safeParse(rawJson)
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.message,
    }
  }
  return {
    success: true,
    input: parseResult.data,
  }
}

export function routeToHandler(input: HookInput): HookOutput {
  switch (input.hook_event_name) {
    case 'PreToolUse':
      return handlePreToolUse(input)
    case 'PostToolUse':
      return handlePostToolUse(input)
    case 'Stop':
      return handleStop(input)
    default: {
      const exhaustiveCheck: never = input
      throw exhaustiveCheck
    }
  }
}
