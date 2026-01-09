#!/bin/bash
# Extracts issue number from current branch name
# Usage: ./scripts/get-issue-number.sh
# Output: issue number or empty string

set -euo pipefail

BRANCH=$(git branch --show-current)
echo "$BRANCH" | grep -oE 'issue-[0-9]+' | head -1 | grep -oE '[0-9]+' || true
