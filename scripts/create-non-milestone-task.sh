#!/bin/bash
# create-non-milestone-task.sh - Create a GitHub issue for a non-milestone task
# Usage: ./scripts/create-non-milestone-task.sh --type <idea|bug|tech> <title> <references> <summary> <full-details> <acceptance-criteria>

set -euo pipefail

show_usage() {
    echo "Usage: ./scripts/create-non-milestone-task.sh --type <idea|bug|tech> <title> <references> <summary> <full-details> <acceptance-criteria>" >&2
    echo "" >&2
    echo "Options:" >&2
    echo "  --type <idea|bug|tech>  - Task type (required)" >&2
    echo "" >&2
    echo "Parameters:" >&2
    echo "  <title>                - Task title" >&2
    echo "  <references>           - GitHub issues, PRs, or explanation of origin" >&2
    echo "  <summary>              - One paragraph: what and why" >&2
    echo "  <full-details>         - Implementation approach, affected files, context" >&2
    echo "  <acceptance-criteria>  - Checkboxes for completion criteria" >&2
    exit 1
}

# Parse --type flag
TASK_TYPE=""
if [[ "${1:-}" == "--type" ]]; then
    if [[ -z "${2:-}" ]]; then
        echo "Error: --type requires a value (idea, bug, or tech)" >&2
        show_usage
    fi
    case "$2" in
        idea)
            TASK_TYPE="idea"
            LABEL="idea"
            ;;
        bug)
            TASK_TYPE="bug"
            LABEL="bug"
            ;;
        tech)
            TASK_TYPE="tech improvement"
            LABEL="tech improvement"
            ;;
        *)
            echo "Error: Invalid type '$2'. Must be idea, bug, or tech" >&2
            show_usage
            ;;
    esac
    shift 2
else
    echo "Error: --type flag is required" >&2
    show_usage
fi

# Validate remaining arguments
if [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" || -z "${5:-}" ]]; then
    echo "Error: All 5 parameters are required after --type" >&2
    show_usage
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

echo "Creating $TASK_TYPE task: $TITLE"
gh issue create \
    --title "$TITLE" \
    --body "$BODY" \
    --label "$LABEL"

echo ""
echo "$TASK_TYPE task created."
