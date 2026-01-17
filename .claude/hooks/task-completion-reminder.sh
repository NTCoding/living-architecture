#!/bin/bash
# shellcheck disable=SC2034
read -r input

jq -n '{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "REMINDER: If working on a feature task, do not stop unless you have a mergeable PR or need user feedback.\n\nCommands:\n- /complete-task - Full pipeline\n- pnpm nx run dev-workflow:get-pr-feedback - Check PR feedback and status (mergeable?)"
  }
}'
