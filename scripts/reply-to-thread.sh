#!/bin/bash
# reply-to-thread.sh - Reply to a specific PR review thread
#
# Usage:
#   ./scripts/reply-to-thread.sh <thread-id> "<message>"
#
# Example:
#   ./scripts/reply-to-thread.sh PRRT_kwDOxxx "Not fixing: This is intentional behavior"
#
# The thread ID is shown in the output of get-pr-feedback.sh

set -e

THREAD_ID="${1:-}"
MESSAGE="${2:-}"

if [[ -z "$THREAD_ID" ]]; then
    echo "Error: Thread ID required" >&2
    echo "Usage: ./scripts/reply-to-thread.sh <thread-id> \"<message>\"" >&2
    exit 1
fi

if [[ -z "$MESSAGE" ]]; then
    echo "Error: Message required" >&2
    echo "Usage: ./scripts/reply-to-thread.sh <thread-id> \"<message>\"" >&2
    exit 1
fi

# Add Claude Code signature
SIGNATURE="🤖 *Via [Claude Code](https://claude.ai/claude-code)*"
FULL_MESSAGE="${MESSAGE}

${SIGNATURE}"

# Build the GraphQL mutation using jq for proper JSON escaping
RESPONSE=$(jq -n \
  --arg threadId "$THREAD_ID" \
  --arg body "$FULL_MESSAGE" \
  '{query: "mutation($threadId: ID!, $body: String!) { addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $threadId, body: $body}) { comment { id url } } }", variables: {threadId: $threadId, body: $body}}' \
  | gh api graphql --input -)

# Check for errors
if echo "$RESPONSE" | jq -e '.errors' >/dev/null 2>&1; then
    echo "Error: Failed to reply to thread" >&2
    echo "$RESPONSE" | jq '.errors' >&2
    exit 1
fi

COMMENT_URL=$(echo "$RESPONSE" | jq -r '.data.addPullRequestReviewThreadReply.comment.url // empty')

echo "✓ Replied to thread $THREAD_ID"
if [[ -n "$COMMENT_URL" ]]; then
    echo "  $COMMENT_URL"
fi