#!/bin/bash
# list-tasks.sh - Find available tasks
# Usage: ./scripts/list-tasks.sh              # Milestone tasks (from active PRD)
#        ./scripts/list-tasks.sh --ideas      # Non-milestone: idea label
#        ./scripts/list-tasks.sh --bugs       # Non-milestone: bug label
#        ./scripts/list-tasks.sh --tech       # Non-milestone: tech improvement label

set -e

# Parse arguments
NON_MILESTONE_LABEL=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --ideas)
            NON_MILESTONE_LABEL="idea"
            shift
            ;;
        --bugs)
            NON_MILESTONE_LABEL="bug"
            shift
            ;;
        --tech)
            NON_MILESTONE_LABEL="tech improvement"
            shift
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage: ./scripts/list-tasks.sh              # Milestone tasks" >&2
            echo "       ./scripts/list-tasks.sh --ideas      # Ideas" >&2
            echo "       ./scripts/list-tasks.sh --bugs       # Bugs" >&2
            echo "       ./scripts/list-tasks.sh --tech       # Tech improvements" >&2
            exit 1
            ;;
    esac
done

# Non-milestone mode: query by label only
if [[ -n "$NON_MILESTONE_LABEL" ]]; then
    echo "Non-milestone tasks: $NON_MILESTONE_LABEL"
    echo ""
    echo "Available tasks:"
    echo "----------------"
    gh issue list --label "$NON_MILESTONE_LABEL" --state open --assignee "" --json number,title --jq '.[] | "#\(.number): \(.title)"'
    exit 0
fi

# Milestone mode: find active PRD
PRD_DIR="docs/project/PRD/active"
if [[ ! -d "$PRD_DIR" ]]; then
    echo "Error: Active PRD directory not found at $PRD_DIR" >&2
    exit 1
fi

PRD_FILE=$(find "$PRD_DIR" -maxdepth 1 -name "*.md" -type f -print -quit 2>/dev/null)
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

# Execute and format output
echo "Available tasks:"
echo "----------------"
gh issue list --milestone "$MILESTONE" --state open --assignee "" --json number,title --jq '.[] | "#\(.number): \(.title)"'
