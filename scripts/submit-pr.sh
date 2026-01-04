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

# Get latest CodeRabbit review body
get_latest_review_body() {
    local pr_number=$1
    gh api "repos/${REPO}/pulls/${pr_number}/reviews" \
        --jq '[.[] | select(.user.login | startswith("coderabbitai"))] | last | .body // empty' 2>/dev/null
}

# Get nitpick count from review body
get_nitpick_count() {
    local pr_number=$1
    local review_body
    review_body=$(get_latest_review_body "$pr_number")
    if [[ -n "$review_body" ]]; then
        local count
        count=$(echo "$review_body" | sed -n 's/.*🧹 Nitpick comments (\([0-9]*\)).*/\1/p' | head -1)
        echo "${count:-0}"
    else
        echo "0"
    fi
}

# Get CodeRabbit feedback (inline comments and nitpicks)
get_coderabbit_feedback() {
    local pr_number=$1

    # Get inline review comments from CodeRabbit
    echo "## Inline Comments"
    gh api "repos/${REPO}/pulls/${pr_number}/comments" \
        --jq '.[] | select(.user.login | startswith("coderabbitai")) | "- \(.path):\(.line // .original_line // "?") \(.body | split("\n")[0] | gsub("^_⚠️ Potential issue_ \\| _🟡 Minor_"; "[MINOR]") | gsub("^_⚠️ Potential issue_ \\| _🔴 Major_"; "[MAJOR]"))"' 2>/dev/null || echo "  (none)"

    echo ""

    # Get review body and extract stats
    local review_body
    review_body=$(get_latest_review_body "$pr_number")

    if [[ -n "$review_body" ]]; then
        # Extract actionable count (macOS-compatible)
        local actionable
        actionable=$(echo "$review_body" | sed -n 's/.*Actionable comments posted: \([0-9]*\).*/\1/p' | head -1)
        actionable="${actionable:-0}"
        echo "Actionable comments: $actionable"

        # Extract nitpick count using shared helper
        local nitpick_count
        nitpick_count=$(get_nitpick_count "$pr_number")
        if [[ "$nitpick_count" != "0" ]]; then
            echo ""
            echo "## Nitpicks to Consider ($nitpick_count)"
            echo "  (see PR for details)"
        fi
    fi
}

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
            echo ""
            get_coderabbit_feedback "$PR_NUMBER"
            echo ""
            echo "PR #$PR_NUMBER: $PR_URL"
            echo ""
            echo "Fix required issues and run: ./scripts/submit-pr.sh --update"
            echo "=========================================="
            exit 1
        fi
    fi

    # Success - show any nitpicks as suggestions
    echo "=========================================="
    echo "All checks passed! PR ready for review."
    echo "=========================================="
    echo ""

    # Show nitpicks as suggestions (non-blocking)
    NITPICKS=$(get_nitpick_count "$PR_NUMBER")

    if [[ "$NITPICKS" != "0" && -n "$NITPICKS" ]]; then
        echo "## Suggestions to consider ($NITPICKS nitpicks):"
        echo "  See PR comments for optional improvements"
        echo ""
    fi

    echo "PR #$PR_NUMBER: $PR_URL"
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
