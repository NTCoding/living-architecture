#!/bin/bash
read -r input
stdout=$(echo "$input" | jq -r '.tool_response.stdout // ""')

if echo "$stdout" | grep -qE 'max-lines'; then
    jq -n '{
    "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": "REMINDER: max-lines is design feedback. Split the file or use it.each. Never skip tests. See docs/conventions/anti-patterns.md"
    }
    }'
    exit 0
fi

exit 0
