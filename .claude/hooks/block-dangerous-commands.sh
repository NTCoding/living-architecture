#!/bin/bash
read -r input
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Block commands that bypass safety checks
if echo "$command" | grep -qE '(--no-verify|--force|--hard)'; then
    jq -n '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": "Blocked: This command bypasses safety checks (--no-verify, --force, --hard)"
      }
    }'
    exit 0
fi

# Block direct git push - agents must use /complete-task workflow
if [[ "$command" =~ (^|[[:space:]])git[[:space:]]+push($|[[:space:]]) ]]; then
    jq -n '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": "Blocked: Direct git push bypasses required workflow. Use /complete-task command instead, which runs the complete verification pipeline (lint, test, code review, PR submission) and prevents orphaned changes."
      }
    }'
    exit 0
fi

# Block ALL gh pr commands - must use dev-workflow tools
if [[ "$command" =~ (^|[[:space:]])gh[[:space:]]+pr($|[[:space:]]) ]]; then
    jq -n '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": "Blocked: Do not use gh pr directly. Use:\n- /complete-task - Create/update PR, run reviews, submit, check CI\n- pnpm nx run dev-workflow:get-pr-feedback - Check PR feedback and status (mergeable?)"
      }
    }'
    exit 0
fi

# Auto-approve safe commands without prompting
jq -n '{
    "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Command passed safety validation"
  }
}'
