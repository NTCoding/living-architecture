#!/bin/bash
# list-tasks.sh - Find available tasks across all active PRDs
# Usage: ./scripts/list-tasks.sh              # All tasks (milestone + non-milestone) as JSON
#        ./scripts/list-tasks.sh --ideas      # Non-milestone: idea label only
#        ./scripts/list-tasks.sh --bugs       # Non-milestone: bug label only
#        ./scripts/list-tasks.sh --tech       # Non-milestone: tech improvement label only

set -euo pipefail

# Parse arguments
NON_MILESTONE_LABEL=""

check_exclusive() {
    if [[ -n "$NON_MILESTONE_LABEL" ]]; then
        echo "Error: Only one of --ideas, --bugs, or --tech can be specified" >&2
        exit 1
    fi
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --ideas)
            check_exclusive
            NON_MILESTONE_LABEL="idea"
            shift
            ;;
        --bugs)
            check_exclusive
            NON_MILESTONE_LABEL="bug"
            shift
            ;;
        --tech)
            check_exclusive
            NON_MILESTONE_LABEL="tech improvement"
            shift
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage: ./scripts/list-tasks.sh              # All tasks as JSON" >&2
            echo "       ./scripts/list-tasks.sh --ideas      # Ideas only" >&2
            echo "       ./scripts/list-tasks.sh --bugs       # Bugs only" >&2
            echo "       ./scripts/list-tasks.sh --tech       # Tech improvements only" >&2
            exit 1
            ;;
    esac
done

# Non-milestone mode: query by label only (backward compatible, simple output)
if [[ -n "$NON_MILESTONE_LABEL" ]]; then
    # Format display name for user-friendly output
    case "$NON_MILESTONE_LABEL" in
        idea) LABEL_DISPLAY="Ideas" ;;
        bug) LABEL_DISPLAY="Bugs" ;;
        "tech improvement") LABEL_DISPLAY="Tech Improvements" ;;
        *) LABEL_DISPLAY="$NON_MILESTONE_LABEL" ;;
    esac
    echo "Non-milestone tasks: $LABEL_DISPLAY"
    echo ""
    echo "Available tasks:"
    echo "----------------"
    gh issue list --label "$NON_MILESTONE_LABEL" --state open --assignee "" --json number,title --jq '.[] | "#\(.number): \(.title)"'
    exit 0
fi

# Default mode: JSON output with all tasks
PRD_DIR="docs/project/PRD/active"
if [[ ! -d "$PRD_DIR" ]]; then
    echo '{"milestone_tasks":[],"non_milestone_tasks":[],"error":"Active PRD directory not found"}' >&2
    exit 1
fi

# Find ALL active PRDs (no -quit)
PRD_FILES=$(find "$PRD_DIR" -maxdepth 1 -name "PRD-*.md" -type f 2>/dev/null || true)

# Collect milestone tasks from all active PRDs
MILESTONE_TASKS="[]"
for PRD_FILE in $PRD_FILES; do
    if [[ -z "$PRD_FILE" ]]; then
        continue
    fi

    # Extract milestone name (filename without PRD- prefix and .md suffix)
    PRD_BASENAME=$(basename "$PRD_FILE")
    MILESTONE="${PRD_BASENAME#PRD-}"
    MILESTONE="${MILESTONE%.md}"

    # Query tasks for this milestone
    TASKS=$(gh issue list --milestone "$MILESTONE" --state open \
        --json number,title,assignees,milestone,body 2>/dev/null || echo "[]")

    # Merge into milestone_tasks array
    MILESTONE_TASKS=$(echo "$MILESTONE_TASKS" "$TASKS" | jq -s 'add')
done

# Query non-milestone tasks (bugs, ideas, tech improvements)
NON_MILESTONE_TASKS=$(gh issue list --state open \
    --json number,title,assignees,labels,body \
    --jq '[.[] | select(.labels | map(.name) | any(. == "bug" or . == "idea" or . == "tech improvement"))]' \
    2>/dev/null || echo "[]")

# Output combined JSON
jq -n \
    --argjson milestone "$MILESTONE_TASKS" \
    --argjson non_milestone "$NON_MILESTONE_TASKS" \
    '{milestone_tasks: $milestone, non_milestone_tasks: $non_milestone}'
