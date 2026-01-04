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

echo "Creating task in milestone: $MILESTONE"
gh issue create \
    --title "$TITLE" \
    --body "$BODY" \
    --milestone "$MILESTONE"

echo ""
echo "Task created."
