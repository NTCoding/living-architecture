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

# Get repo info for API calls
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
if [[ -z "$REPO" ]]; then
    echo "Error: Could not determine repository. Are you in a git repo with a GitHub remote?" >&2
    exit 1
fi

# Wait for CodeRabbit review to complete (with timeout)
wait_for_coderabbit_review() {
    local pr_number=$1
    local timeout=${2:-300}  # Default 5 min timeout
    local elapsed=0

    echo "Waiting for CodeRabbit review..."

    while [[ $elapsed -lt $timeout ]]; do
        # Check if CodeRabbit has submitted a review
        local review_state
        review_state=$(gh pr view "$pr_number" --json reviews \
            --jq '[.reviews[] | select(.author.login | startswith("coderabbitai"))] | last | .state // empty')

        if [[ -n "$review_state" ]]; then
            echo "CodeRabbit review completed: $review_state"
            return 0
        fi

        sleep 15
        elapsed=$((elapsed + 15))
        echo "  Still waiting for CodeRabbit... (${elapsed}s/${timeout}s)"
    done

    echo "CodeRabbit review timeout - continuing without review"
    return 1
}

# Show unresolved feedback using the dedicated script
show_pr_feedback() {
    local pr_number=$1
    echo ""
    ./scripts/get-pr-feedback.sh "$pr_number" 2>/dev/null || echo "  (could not fetch feedback)"
}

# Precondition: check for uncommitted changes
UNCOMMITTED=$(git status --porcelain)
if [[ -n "$UNCOMMITTED" ]]; then
    echo "Error: Uncommitted changes detected. Commit and push first." >&2
    echo "$UNCOMMITTED" >&2
    exit 1
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
    echo "CI checks passed!"
    echo ""

    # Wait for CodeRabbit review
    if wait_for_coderabbit_review "$PR_NUMBER"; then
        # Check review decision
        REVIEW_DECISION=$(gh pr view "$PR_NUMBER" --json reviewDecision --jq '.reviewDecision // empty')

        if [[ "$REVIEW_DECISION" == "CHANGES_REQUESTED" ]]; then
            echo "=========================================="
            echo "CodeRabbit requested changes"
            echo "=========================================="
            show_pr_feedback "$PR_NUMBER"
            echo ""
            echo "PR #$PR_NUMBER: $PR_URL"
            echo ""
            echo "Fix required issues and run: ./scripts/submit-pr.sh --update"
            echo "=========================================="
            exit 1
        fi
    fi

    # Success
    echo "=========================================="
    echo "All checks passed! PR ready for review."
    echo "=========================================="
    show_pr_feedback "$PR_NUMBER"
    echo ""
    echo "PR #$PR_NUMBER: $PR_URL"
else
    echo "CI checks failed."
    show_pr_feedback "$PR_NUMBER"
    echo ""
    echo "PR #$PR_NUMBER: $PR_URL"
    echo ""
    echo "Fix issues and run: ./scripts/submit-pr.sh --update"
fi
echo "=========================================="
