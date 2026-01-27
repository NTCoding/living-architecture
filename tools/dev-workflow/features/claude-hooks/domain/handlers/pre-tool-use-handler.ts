import { z } from 'zod'
import type { PreToolUseInput } from '../hook-input-schemas'
import type { PreToolUseOutput } from '../hook-output-schemas'
import { DANGEROUS_FLAGS } from '../safety-rules/dangerous-flags'
import { BLOCKED_COMMANDS } from '../safety-rules/blocked-commands'
import {
  allow, deny 
} from '../permission-decision'

const bashToolInputSchema = z.object({ command: z.string().min(1) })

export function handlePreToolUse(input: PreToolUseInput): PreToolUseOutput {
  const parseResult = bashToolInputSchema.safeParse(input.tool_input)

  if (!parseResult.success) {
    return allow('No command to validate')
  }

  const { command } = parseResult.data

  for (const flag of DANGEROUS_FLAGS) {
    if (command.includes(flag)) {
      return deny(`Blocked: This command bypasses safety checks (${flag})`)
    }
  }

  for (const blocked of BLOCKED_COMMANDS) {
    if (blocked.pattern.test(command)) {
      return deny(blocked.reason)
    }
  }

  return allow('Command passed safety validation')
}
