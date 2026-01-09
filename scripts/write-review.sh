#!/bin/bash
# Writes content from stdin to a review file
# Usage: echo "content" | ./scripts/write-review.sh <relative-path>
# Example: ./scripts/write-review.sh "issue-44/code-review.md" < content.md

set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <relative-path>" >&2
    echo "Example: echo 'content' | $0 'issue-44/code-review.md'" >&2
    exit 1
fi

REVIEW_PATH="reviews/$1"
mkdir -p "$(dirname "$REVIEW_PATH")"
cat > "$REVIEW_PATH"
echo "Wrote: $REVIEW_PATH"
