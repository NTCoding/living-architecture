#!/bin/bash
# get-pr-feedback.sh - Get unresolved PR review feedback using GitHub's native GraphQL API
#
# Usage:
#   ./scripts/get-pr-feedback.sh [PR_NUMBER]
#   (if no PR number, uses current branch's PR)
#
# Output: Clean, actionable list of unresolved review comments
# Exit codes:
#   0 - Success (output may be empty if no unresolved items)
#   1 - Error (no PR, API failure, etc.)

set -e

PR_NUMBER="${1:-}"

# Get repo info
REPO_INFO=$(gh repo view --json owner,name 2>/dev/null || echo "")
if [[ -z "$REPO_INFO" ]]; then
    echo "Error: Could not determine repository" >&2
    exit 1
fi

OWNER=$(echo "$REPO_INFO" | jq -r '.owner.login')
REPO_NAME=$(echo "$REPO_INFO" | jq -r '.name')

# If no PR number provided, get from current branch
if [[ -z "$PR_NUMBER" ]]; then
    PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null || echo "")
    if [[ -z "$PR_NUMBER" ]]; then
        echo "Error: No PR found for current branch" >&2
        exit 1
    fi
fi

# Execute GraphQL query
RESPONSE=$(cat << 'GRAPHQL_INPUT' | sed "s/OWNER_PLACEHOLDER/$OWNER/g; s/REPO_PLACEHOLDER/$REPO_NAME/g; s/PR_PLACEHOLDER/$PR_NUMBER/g" | gh api graphql --input -
{
  "query": "query($owner: String!, $repo: String!, $pr: Int!) { repository(owner: $owner, name: $repo) { pullRequest(number: $pr) { reviewDecision reviewThreads(first: 100) { nodes { isResolved isOutdated path line comments(first: 1) { nodes { author { login } body } } } } } } }",
  "variables": {
    "owner": "OWNER_PLACEHOLDER",
    "repo": "REPO_PLACEHOLDER",
    "pr": PR_PLACEHOLDER
  }
}
GRAPHQL_INPUT
)

# Check for errors
if echo "$RESPONSE" | jq -e '.errors' >/dev/null 2>&1; then
    echo "Error: GraphQL query failed" >&2
    echo "$RESPONSE" | jq '.errors' >&2
    exit 1
fi

# Extract review decision
REVIEW_DECISION=$(echo "$RESPONSE" | jq -r '.data.repository.pullRequest.reviewDecision // "NONE"')

# Extract unresolved, non-outdated threads (from any reviewer, not just CodeRabbit)
UNRESOLVED_THREADS=$(echo "$RESPONSE" | jq '
  .data.repository.pullRequest.reviewThreads.nodes
  | map(select(.isResolved == false and .isOutdated == false))
')

UNRESOLVED_COUNT=$(echo "$UNRESOLVED_THREADS" | jq 'length')

# Output header
printf "\n"
printf "  PR #%s · %s · %s unresolved\n" "$PR_NUMBER" "$REVIEW_DECISION" "$UNRESOLVED_COUNT"
printf "\n"

if [[ "$UNRESOLVED_COUNT" -eq 0 ]]; then
    printf "  ✓ No unresolved feedback\n\n"
    exit 0
fi

# Process each unresolved thread
echo "$UNRESOLVED_THREADS" | jq -c '.[]' | while read -r thread; do
    PATH_FILE=$(echo "$thread" | jq -r '.path // "unknown"')
    LINE=$(echo "$thread" | jq -r '.line // "?"')
    BODY=$(echo "$thread" | jq -r '.comments.nodes[0].body // ""')

    # Extract severity from body (CodeRabbit format)
    if echo "$BODY" | grep -q "_⚠️ Potential issue_ | _🔴"; then
        SEVERITY="critical"
        ICON="●"
    elif echo "$BODY" | grep -q "_⚠️ Potential issue_ | _🟠 Major_"; then
        SEVERITY="major"
        ICON="●"
    elif echo "$BODY" | grep -q "_🛠️ Refactor suggestion_ | _🟠 Major_"; then
        SEVERITY="major"
        ICON="●"
    elif echo "$BODY" | grep -q "_🧹 Nitpick_ | _🔵 Trivial_"; then
        SEVERITY="nitpick"
        ICON="○"
    else
        SEVERITY="info"
        ICON="·"
    fi

    # Extract title (bold text after severity markers)
    TITLE=$(echo "$BODY" | grep -m1 '^\*\*[^*]' | sed 's/^\*\*//;s/\*\*.*$//')
    if [[ -z "$TITLE" ]]; then
        TITLE="(see PR for details)"
    fi

    # Extract AI prompt if present
    AI_PROMPT=$(echo "$BODY" | grep -A 20 "🤖 Prompt for AI Agents" | grep -v "🤖 Prompt" | grep -v "^<" | grep -v "^$" | grep -v '```' | head -12)

    printf "  %s %s\n" "$ICON" "$SEVERITY"
    printf "    %s:%s\n" "$PATH_FILE" "$LINE"
    printf "    %s\n" "$TITLE"
    printf "\n"

    if [[ -n "$AI_PROMPT" ]]; then
        printf "    Prompt:\n"
        echo "$AI_PROMPT" | while IFS= read -r line; do
            printf "    %s\n" "$line"
        done
        printf "\n"
    fi
done

printf "  ─────────────────────────────────────────────────────────\n"
printf "\n"
printf "  Actions:\n"
printf "    1. Fix it (use the prompt above)\n"
printf "    2. Decline with: gh pr comment %s --body \"Not fixing: <reason>\"\n" "$PR_NUMBER"
printf "\n"
printf "  Then: ./scripts/submit-pr.sh --update\n"
printf "\n"
