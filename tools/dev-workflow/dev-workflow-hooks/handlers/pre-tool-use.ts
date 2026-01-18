import type { PreToolUseInput } from '../claude-code-input-schemas'
import type { PreToolUseOutput } from '../claude-code-output-schemas'

const DANGEROUS_FLAGS = ['--no-verify', '--force', '--hard']

const BLOCKED_COMMANDS = [
  {
    pattern: /\bgit\s+push\b/,
    reason:
      'Blocked: Direct git push bypasses required workflow. Use /complete-task command instead, which runs the complete verification pipeline (lint, test, code review, PR submission) and prevents orphaned changes.',
  },
  {
    pattern: /\bgh\s+pr\b/,
    reason:
      'Blocked: Do not use gh pr directly. Use:\n- /complete-task - Create/update PR, run reviews, submit, check CI\n- pnpm nx run dev-workflow:get-pr-feedback - Check PR feedback and status (mergeable?)',
  },
  {
    pattern: /\bgh\s+api\b.*(?:review|thread|comment|resolve)/i,
    reason:
      'Blocked: Do not use gh api for review threads directly. Use:\n- pnpm nx run dev-workflow:respond-to-feedback --thread-id <id> --action <fixed|rejected> --message <msg>',
  },
]

function allow(reason: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: reason,
    },
  }
}

function deny(reason: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }
}

export function handlePreToolUse(input: PreToolUseInput): PreToolUseOutput {
  const command = typeof input.tool_input.command === 'string' ? input.tool_input.command : ''

  if (!command) {
    return allow('No command to validate')
  }

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
