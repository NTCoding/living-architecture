#!/bin/bash
# list-tasks.sh - Find available tasks for the current active PRD
# Usage: ./scripts/list-tasks.sh [--label <label>]

set -e

# Parse arguments
LABEL_FILTER=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --label)
            LABEL_FILTER="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage: ./scripts/list-tasks.sh [--label <label>]" >&2
            exit 1
            ;;
    esac
done

# Find active PRD
PRD_DIR="docs/project/PRD/active"
if [[ ! -d "$PRD_DIR" ]]; then
    echo "Error: Active PRD directory not found at $PRD_DIR" >&2
    exit 1
fi

PRD_FILE=$(ls "$PRD_DIR"/*.md 2>/dev/null | head -1)
if [[ -z "$PRD_FILE" ]]; then
    echo "Error: No active PRD found in $PRD_DIR" >&2
    exit 1
fi

# Extract milestone name (filename without PRD- prefix and .md suffix)
PRD_BASENAME=$(basename "$PRD_FILE")
MILESTONE="${PRD_BASENAME#PRD-}"
MILESTONE="${MILESTONE%.md}"

echo "Active PRD: $PRD_BASENAME"
echo "Milestone: $MILESTONE"
echo ""

# Build gh arguments
GH_ARGS=(issue list --milestone "$MILESTONE" --state open --assignee "")

if [[ -n "$LABEL_FILTER" ]]; then
    GH_ARGS+=(--label "$LABEL_FILTER")
fi

# Execute and format output
echo "Available tasks:"
echo "----------------"
gh "${GH_ARGS[@]}" --json number,title,labels --jq '.[] | "#\(.number): \(.title)"'
