#!/bin/bash
# Creates reviews directory for current branch
# Usage: ./scripts/setup-review-dir.sh
# Output: prints branch name, creates reviews/<branch>/

set -euo pipefail

BRANCH=$(git branch --show-current)
mkdir -p "reviews/$BRANCH"
echo "$BRANCH"
