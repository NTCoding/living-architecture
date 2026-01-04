#!/bin/bash
# check-coderabbit-review.sh - Check CodeRabbit review status and show feedback
# Usage:
#   ./scripts/check-coderabbit-review.sh [PR_NUMBER]
#   (if no PR number, uses current branch's PR)
#
# Exit codes:
#   0 - Reviews approved or no blocking issues
#   1 - Changes requested (must fix)
#   2 - Review still pending

set -e

PR_NUMBER="${1:-}"

# Get repo info
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

# If no PR number provided, get from current branch
if [[ -z "$PR_NUMBER" ]]; then
    PR_INFO=$(gh pr view --json number,url 2>/dev/null || echo "")
    if [[ -z "$PR_INFO" ]]; then
        echo "Error: No PR found for current branch" >&2
        exit 1
    fi
    PR_NUMBER=$(echo "$PR_INFO" | jq -r '.number')
fi

# Check if CodeRabbit has reviewed
get_coderabbit_review_state() {
    gh pr view "$PR_NUMBER" --json reviews \
        --jq '[.reviews[] | select(.author.login | startswith("coderabbitai"))] | last | .state // empty'
}

# Get review decision
get_review_decision() {
    gh pr view "$PR_NUMBER" --json reviewDecision --jq '.reviewDecision // empty'
}

# Get inline comments from CodeRabbit
get_inline_comments() {
    gh api "repos/${REPO}/pulls/${PR_NUMBER}/comments" \
        --jq '.[] | select(.user.login | startswith("coderabbitai")) | {
            path: .path,
            line: (.line // .original_line // "?"),
            severity: (if (.body | startswith("_⚠️ Potential issue_ | _🔴")) then "MAJOR" elif (.body | startswith("_⚠️ Potential issue_ | _🟡")) then "MINOR" else "INFO" end),
            title: (.body | split("\n")[2] | gsub("^\\*\\*"; "") | gsub("\\*\\*$"; "") | gsub("\\*\\*\\."; "."))
        }' 2>/dev/null
}

# Get review body stats
get_review_stats() {
    local review_body=$(gh api "repos/${REPO}/pulls/${PR_NUMBER}/reviews" \
        --jq '[.[] | select(.user.login | startswith("coderabbitai"))] | last | .body // empty' 2>/dev/null)

    if [[ -n "$review_body" ]]; then
        local actionable=$(echo "$review_body" | sed -n 's/.*Actionable comments posted: \([0-9]*\).*/\1/p' | head -1)
        local nitpicks=$(echo "$review_body" | sed -n 's/.*🧹 Nitpick comments (\([0-9]*\)).*/\1/p' | head -1)
        echo "${actionable:-0} ${nitpicks:-0}"
    else
        echo "0 0"
    fi
}

# Main logic
REVIEW_STATE=$(get_coderabbit_review_state)

if [[ -z "$REVIEW_STATE" ]]; then
    echo "CodeRabbit review: pending"
    exit 2
fi

REVIEW_DECISION=$(get_review_decision)
read ACTIONABLE NITPICKS <<< $(get_review_stats)

echo "=========================================="
echo "CodeRabbit Review Status"
echo "=========================================="
echo ""
echo "State: $REVIEW_STATE"
echo "Decision: ${REVIEW_DECISION:-"none"}"
echo "Actionable comments: $ACTIONABLE"
echo "Nitpicks: $NITPICKS"
echo ""

# Show inline comments
COMMENTS=$(get_inline_comments)
if [[ -n "$COMMENTS" ]]; then
    echo "## Comments to Address"
    echo "$COMMENTS" | jq -r '"- [\(.severity)] \(.path):\(.line) - \(.title)"'
    echo ""
fi

# Show nitpicks note
if [[ "$NITPICKS" != "0" ]]; then
    echo "## Suggestions to Consider ($NITPICKS nitpicks)"
    echo "  See PR for optional improvements"
    echo ""
fi

# Exit based on decision
if [[ "$REVIEW_DECISION" == "CHANGES_REQUESTED" ]]; then
    echo "Fix required issues and run: ./scripts/submit-pr.sh --update"
    echo "=========================================="
    exit 1
fi

echo "No blocking issues. PR ready for review."
echo "=========================================="
exit 0
