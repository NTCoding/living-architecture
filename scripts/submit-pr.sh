#!/bin/bash
# submit-pr.sh - Create or update a PR and watch CI checks
# Usage:
#   ./scripts/submit-pr.sh --title "..." --body "..."  (create new PR)
#   ./scripts/submit-pr.sh --update                     (re-check existing PR)

set -e

# Parse arguments
MODE=""
TITLE=""
BODY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --title)
            TITLE="$2"
            MODE="create"
            shift 2
            ;;
        --body)
            BODY="$2"
            shift 2
            ;;
        --update)
            MODE="update"
            shift
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage:" >&2
            echo "  ./scripts/submit-pr.sh --title \"...\" --body \"...\"" >&2
            echo "  ./scripts/submit-pr.sh --update" >&2
            exit 1
            ;;
    esac
done

if [[ -z "$MODE" ]]; then
    echo "Error: Must specify --title/--body (create) or --update" >&2
    exit 1
fi

# Precondition: check for uncommitted changes
UNCOMMITTED=$(git status --porcelain)
if [[ -n "$UNCOMMITTED" ]]; then
    echo "Error: Uncommitted changes detected. Commit and push first." >&2
    echo "$UNCOMMITTED" >&2
    exit 1
fi

if [[ "$MODE" == "update" ]]; then
    # UPDATE mode: PR must exist
    if ! gh pr view --json number,url >/dev/null 2>&1; then
        echo "Error: No PR exists for this branch. Use --title/--body to create one." >&2
        exit 1
    fi
    echo "Checking existing PR..."
elif [[ "$MODE" == "create" ]]; then
    # CREATE mode: PR must NOT exist
    if gh pr view --json number,url >/dev/null 2>&1; then
        echo "Error: PR already exists. Use --update to re-check." >&2
        exit 1
    fi

    if [[ -z "$TITLE" ]]; then
        echo "Error: --title is required for creating a PR" >&2
        exit 1
    fi

    echo "Creating PR..."
    gh pr create --title "$TITLE" --body "$BODY"
fi

# Wait for CI to start
echo "Waiting for CI checks to start..."
sleep 5

# Watch checks
echo "Watching CI checks..."
if gh pr checks --watch --fail-fast -i 30; then
    CHECK_STATUS="pass"
else
    CHECK_STATUS="fail"
fi

# Get PR info
echo ""
echo "=========================================="
PR_INFO=$(gh pr view --json number,url)
PR_NUMBER=$(echo "$PR_INFO" | jq -r '.number')
PR_URL=$(echo "$PR_INFO" | jq -r '.url')

if [[ "$CHECK_STATUS" == "pass" ]]; then
    echo "All checks passed!"
    echo "PR #$PR_NUMBER ready for review: $PR_URL"
else
    echo "Some checks failed."
    echo "PR #$PR_NUMBER: $PR_URL"
    echo ""
    echo "PR Comments:"
    gh pr view --comments
    echo ""
    echo "Fix issues and run: ./scripts/submit-pr.sh --update"
fi
echo "=========================================="
