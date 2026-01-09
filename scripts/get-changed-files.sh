#!/bin/bash
# Lists all changed and untracked files
# Usage: ./scripts/get-changed-files.sh [--filter PATTERN]
# Output: one file per line

set -euo pipefail

FILTER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --filter)
            FILTER="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# Get all changed and untracked files
FILES=$(git diff --name-only HEAD; git ls-files --others --exclude-standard)

if [[ -n "$FILTER" ]]; then
    echo "$FILES" | grep -E "$FILTER" || true
else
    echo "$FILES"
fi
