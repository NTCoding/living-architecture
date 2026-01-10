#!/bin/bash
# create-tech-improvement-task.sh - Create a GitHub issue for a tech improvement task
# Usage: ./scripts/create-tech-improvement-task.sh <title> <references> <summary> <full-details> <acceptance-criteria>

set -e

if [[ -z "$1" || -z "$2" || -z "$3" || -z "$4" || -z "$5" ]]; then
    echo "Usage: ./scripts/create-tech-improvement-task.sh <title> <references> <summary> <full-details> <acceptance-criteria>" >&2
    echo "" >&2
    echo "All 5 parameters are required:" >&2
    echo "  <title>                - Task title" >&2
    echo "  <references>           - GitHub issues, PRs, or explanation of origin" >&2
    echo "  <summary>              - One paragraph: what and why" >&2
    echo "  <full-details>         - Implementation approach, affected files, context" >&2
    echo "  <acceptance-criteria>  - Checkboxes for completion criteria" >&2
    exit 1
fi

TITLE="$1"
REFERENCES="$2"
SUMMARY="$3"
FULL_DETAILS="$4"
ACCEPTANCE_CRITERIA="$5"

BODY="## References
${REFERENCES}

## Summary
${SUMMARY}

## Full Details
${FULL_DETAILS}

## Acceptance Criteria
${ACCEPTANCE_CRITERIA}"

echo "Creating tech improvement task: $TITLE"
gh issue create \
    --title "$TITLE" \
    --body "$BODY" \
    --label "tech improvement"

echo ""
echo "Tech improvement task created."
