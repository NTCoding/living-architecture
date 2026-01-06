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

# If no PR number provided, get from current branch
if [[ -z "$PR_NUMBER" ]]; then
    PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null || echo "")
    if [[ -z "$PR_NUMBER" ]]; then
        echo "Error: No PR found for current branch" >&2
        exit 1
    fi
fi

# Check if CodeRabbit has reviewed
REVIEW_STATE=$(gh pr view "$PR_NUMBER" --json reviews \
    --jq '[.reviews[] | select(.author.login | startswith("coderabbitai"))] | last | .state // empty')

if [[ -z "$REVIEW_STATE" ]]; then
    echo "CodeRabbit review: pending"
    exit 2
fi

# Get review decision
REVIEW_DECISION=$(gh pr view "$PR_NUMBER" --json reviewDecision --jq '.reviewDecision // empty')

# Use the dedicated feedback script for details
./scripts/get-pr-feedback.sh "$PR_NUMBER"

# Exit based on decision
if [[ "$REVIEW_DECISION" == "CHANGES_REQUESTED" ]]; then
    exit 1
fi

exit 0
