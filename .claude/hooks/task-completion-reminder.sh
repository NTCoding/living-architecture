#!/bin/bash
# shellcheck disable=SC2034
read -r input

jq -n '{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "MANDATORY: Before stopping on a feature task, you MUST either:\n\n1. PROVE the PR is mergeable by running:\n pnpm nx run dev-workflow:get-pr-feedback\n   Show the output to the user as evidence.\n\n2. OR explain clearly why you need help:\n   \"I was not able to achieve a mergeable PR. I need help with <specific issue>.\n   <Full details of what went wrong and what you tried>\""
  }
}'
