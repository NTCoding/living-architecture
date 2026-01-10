#!/bin/bash
# amend-task.sh - Add an amendment to a task (clarification, not replacement)
# Usage: ./scripts/amend-task.sh <issue-number> "Amendment content"

set -euo pipefail

if [[ -z "$1" || -z "$2" ]]; then
    echo "Usage: ./scripts/amend-task.sh <issue-number> \"Amendment content\"" >&2
    exit 1
fi

ISSUE_NUMBER="$1"
AMENDMENT="$2"

# Fetch current body
CURRENT_BODY=$(gh issue view "$ISSUE_NUMBER" --json body -q .body)

# Append amendment
UPDATED_BODY="${CURRENT_BODY}

---

## Amendment

${AMENDMENT}"

echo "Adding amendment to task #$ISSUE_NUMBER..."
gh issue edit "$ISSUE_NUMBER" --body "$UPDATED_BODY"

echo ""
echo "Task amended:"
gh issue view "$ISSUE_NUMBER"
