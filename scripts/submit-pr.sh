#!/bin/bash
# submit-pr.sh - Create or update a PR and watch CI checks
# Usage:
#   ./scripts/submit-pr.sh --title "..." --body "..."  (create new PR)
#   ./scripts/submit-pr.sh --update                     (re-check existing PR)

set -euo pipefail

# Verify required tools are available
for cmd in gh jq; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "Error: Required command '$cmd' not found" >&2
        exit 1
    fi
done

# Parse arguments
MODE=""
TITLE=""
BODY=""
NO_ISSUE=false

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
        --no-issue)
            NO_ISSUE=true
            shift
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage:" >&2
            echo "  ./scripts/submit-pr.sh --title \"...\" --body \"...\" [--no-issue]" >&2
            echo "  ./scripts/submit-pr.sh --update" >&2
            exit 1
            ;;
    esac
done

if [[ -z "$MODE" ]]; then
    echo "Error: Must specify --title/--body (create) or --update" >&2
    exit 1
fi

# Show unresolved feedback using the dedicated script
show_pr_feedback() {
    local pr_number=$1
    echo ""
    if [[ ! -x "./scripts/get-pr-feedback.sh" ]]; then
        echo "  (could not fetch feedback: get-pr-feedback.sh not found or not executable)"
        return
    fi
    ./scripts/get-pr-feedback.sh "$pr_number" 2>/dev/null || echo "  (could not fetch feedback)"
}

# Precondition: check for uncommitted changes
UNCOMMITTED=$(git status --porcelain)
if [[ -n "$UNCOMMITTED" ]]; then
    echo "Error: Uncommitted changes detected. Commit your changes then try again." >&2
    echo "$UNCOMMITTED" >&2
    exit 1
fi

# Push changes
BRANCH=$(git rev-parse --abbrev-ref HEAD)
AHEAD=$(git rev-list --count origin/"$BRANCH"..HEAD 2>/dev/null || echo "new")
if [[ "$AHEAD" != "0" ]]; then
    echo "Pushing $AHEAD commit(s) to origin..."
    git push -u origin "$BRANCH"
fi

# Precondition: ensure branch is up-to-date with main
echo "Checking if branch is up-to-date with main..."
git fetch origin main --quiet
BEHIND_COUNT=$(git rev-list --count HEAD..origin/main)
if [[ "$BEHIND_COUNT" -gt 0 ]]; then
    echo "Branch is $BEHIND_COUNT commit(s) behind main. Merging..."
    if ! git merge origin/main --no-edit; then
        echo "Error: Merge failed. Resolve conflicts and try again." >&2
        exit 1
    fi
    echo "Merge successful. Pushing to remote..."
    git push
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

    # Prevent PR creation from main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$CURRENT_BRANCH" == "main" ]]; then
        echo "Error: Cannot create PR from main branch. Create a feature branch first." >&2
        exit 1
    fi

    if [[ -z "$TITLE" ]]; then
        echo "Error: --title is required for creating a PR" >&2
        exit 1
    fi

    # Extract issue number from branch name (e.g., issue-40-description -> 40)
    ISSUE_NUM=$(echo "$CURRENT_BRANCH" | sed -n 's/^issue-\([0-9][0-9]*\).*/\1/p')
    if [[ -z "$ISSUE_NUM" ]] && [[ "$NO_ISSUE" == false ]]; then
        echo "Error: Branch name must include issue number (e.g., issue-40-description)" >&2
        echo "Current branch: $CURRENT_BRANCH" >&2
        echo "Use --no-issue flag to create PR without linking to an issue" >&2
        exit 1
    fi

    # Prepend "Closes #<issue>" to body if issue number found
    if [[ -n "$ISSUE_NUM" ]]; then
        BODY="Closes #${ISSUE_NUM}

$BODY"
    fi

    echo "Creating PR..."
    gh pr create --title "$TITLE" --body "$BODY"
fi

# Wait for CI to start
echo "Waiting for CI checks to start..."
sleep 5

# Watch all checks (CodeRabbit is a required check, so gh pr checks waits for it)
echo "Watching CI checks..."
if gh pr checks --watch --fail-fast -i 30; then
    CHECK_STATUS="pass"
else
    CHECK_STATUS="fail"
fi

# Get PR info and show results
echo ""
echo "=========================================="
PR_INFO=$(gh pr view --json number,url)
PR_NUMBER=$(echo "$PR_INFO" | jq -r '.number')
PR_URL=$(echo "$PR_INFO" | jq -r '.url')

if [[ "$CHECK_STATUS" == "pass" ]]; then
    echo "All checks passed!"
    echo "=========================================="
    show_pr_feedback "$PR_NUMBER"
    echo ""
    echo "PR #$PR_NUMBER: $PR_URL"
else
    echo "CI checks failed."
    echo "=========================================="
    show_pr_feedback "$PR_NUMBER"
    echo ""
    echo "PR #$PR_NUMBER: $PR_URL"
    echo ""
    echo "Fix issues and run: ./scripts/submit-pr.sh --update"
fi
echo "=========================================="
