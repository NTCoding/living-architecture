export interface BlockedCommand {
  pattern: RegExp
  reason: string
}

export const BLOCKED_COMMANDS: BlockedCommand[] = [
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
