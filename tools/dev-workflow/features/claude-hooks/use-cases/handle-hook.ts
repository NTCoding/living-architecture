import type { HookInput } from '../domain/hook-input-schemas'
import type { HookOutput } from '../domain/hook-output-schemas'
import { handlePreToolUse } from '../domain/handlers/pre-tool-use'
import { handlePostToolUse } from '../domain/handlers/post-tool-use'
import { handleStop } from '../domain/handlers/stop'

export function routeToHandler(input: HookInput): HookOutput {
  switch (input.hook_event_name) {
    case 'PreToolUse':
      return handlePreToolUse(input)
    case 'PostToolUse':
      return handlePostToolUse(input)
    case 'Stop':
      return handleStop(input)
  }
}
