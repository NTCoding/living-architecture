#!/bin/bash
# create-task.sh - Create a GitHub issue for a task
# Usage: ./scripts/create-task.sh <milestone> <title> <body>

set -e

if [[ -z "$1" || -z "$2" || -z "$3" ]]; then
    echo "Usage: ./scripts/create-task.sh <milestone> <title> <body>" >&2
    exit 1
fi

MILESTONE="$1"
TITLE="$2"
BODY="$3"

LABEL_NAME="prd:${MILESTONE}"

# Validate label exists before creating issue
if ! gh label list --search "$LABEL_NAME" --json name --jq '.[].name' | grep -q "^${LABEL_NAME}$"; then
    echo "Error: Label '$LABEL_NAME' not found." >&2
    echo "Run './scripts/activate-prd.sh ${MILESTONE}' first to create the milestone and label." >&2
    exit 1
fi

echo "Creating task in milestone: $MILESTONE"
gh issue create \
    --title "$TITLE" \
    --body "$BODY" \
    --milestone "$MILESTONE" \
    --label "$LABEL_NAME"

echo ""
echo "Task created."
