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
if [[ -z "$REPO" ]]; then
    echo "Error: Could not determine repository. Are you in a git repo with a GitHub remote?" >&2
    exit 1
fi

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

# Get latest CodeRabbit review body (supersedes earlier reviews)
get_latest_review_body() {
    gh api "repos/${REPO}/pulls/${PR_NUMBER}/reviews" \
        --jq '[.[] | select(.user.login | startswith("coderabbitai"))] | last | .body // empty' 2>/dev/null
}

# Get review body stats from latest review
get_review_stats() {
    local review_body
    review_body=$(get_latest_review_body)

    if [[ -n "$review_body" ]]; then
        local actionable
        local nitpicks
        actionable=$(echo "$review_body" | sed -n 's/.*Actionable comments posted: \([0-9]*\).*/\1/p' | head -1)
        nitpicks=$(echo "$review_body" | sed -n 's/.*🧹 Nitpick comments (\([0-9]*\)).*/\1/p' | head -1)
        echo "${actionable:-0} ${nitpicks:-0}"
    else
        echo "0 0"
    fi
}

# Extract nitpick details from review body (file:line - title format)
get_nitpick_details() {
    local review_body
    review_body=$(get_latest_review_body)

    if [[ -z "$review_body" ]]; then
        return
    fi

    # Parse the nested structure: <summary>filename (count)</summary> then `line`: **title**
    # Extract filename from <summary> tags and line:title from backtick patterns
    local current_file=""
    echo "$review_body" | while IFS= read -r line; do
        # Match file summary: <summary>scripts/foo.sh (2)</summary>
        if [[ "$line" =~ \<summary\>([^[:space:]]+)[[:space:]]*\([0-9]+\)\</summary\> ]]; then
            current_file="${BASH_REMATCH[1]}"
        fi
        # Match nitpick: `52-63`: **Title here.**
        if [[ "$line" =~ \`([0-9]+-?[0-9]*)\`:[[:space:]]*\*\*([^*]+)\*\* ]]; then
            local line_range="${BASH_REMATCH[1]}"
            local title="${BASH_REMATCH[2]}"
            if [[ -n "$current_file" ]]; then
                echo "${current_file}:${line_range} - ${title}"
            fi
        fi
    done
}

# Main logic
REVIEW_STATE=$(get_coderabbit_review_state)

if [[ -z "$REVIEW_STATE" ]]; then
    echo "CodeRabbit review: pending"
    exit 2
fi

REVIEW_DECISION=$(get_review_decision)
read -r ACTIONABLE NITPICKS <<< "$(get_review_stats)"

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
    # Handle potential malformed JSON gracefully
    if echo "$COMMENTS" | jq -r '"- [\(.severity)] \(.path):\(.line) - \(.title)"' 2>/dev/null; then
        :  # Success - output already printed
    else
        echo "  (unable to parse inline comments)"
    fi
    echo ""
fi

# Show nitpicks with details
if [[ "$NITPICKS" != "0" ]]; then
    echo "## Suggestions to Consider ($NITPICKS nitpicks)"
    NITPICK_DETAILS=$(get_nitpick_details)
    if [[ -n "$NITPICK_DETAILS" ]]; then
        echo "$NITPICK_DETAILS" | while IFS= read -r detail; do
            echo "- $detail"
        done
    fi
    echo ""
    echo "Fix these unless you have a good reason not to. See PR for full details."
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
