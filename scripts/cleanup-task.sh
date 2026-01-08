#!/bin/bash
# cleanup-task.sh - Remove a git worktree after task is complete
# Usage: ./scripts/cleanup-task.sh
#
# Must be run from within a worktree directory.

set -e

# Get current worktree info
WORKTREE_PATH=$(git rev-parse --show-toplevel)
BRANCH_NAME=$(git branch --show-current)

# Check if we're in a worktree (not the main repo)
MAIN_REPO=$(git worktree list --porcelain | head -1 | sed 's/^worktree //')

if [[ "$WORKTREE_PATH" == "$MAIN_REPO" ]]; then
    echo "Error: Not in a worktree. This script must be run from a worktree directory." >&2
    echo "Current directory is the main repository." >&2
    exit 1
fi

echo "Worktree: $WORKTREE_PATH"
echo "Branch: $BRANCH_NAME"
echo "Main repo: $MAIN_REPO"
echo ""

# Remove worktree from Claude Code permissions
SETTINGS_LOCAL="$MAIN_REPO/.claude/settings.local.json"
if [[ -f "$SETTINGS_LOCAL" ]] && command -v jq &> /dev/null; then
    tmp=$(mktemp)
    if jq --arg dir "$WORKTREE_PATH" '
      .permissions.additionalDirectories = (
        (.permissions.additionalDirectories // []) | map(select(. != $dir))
      )
    ' "$SETTINGS_LOCAL" > "$tmp" && mv "$tmp" "$SETTINGS_LOCAL"; then
        echo "Removed worktree from Claude Code permissions"
    else
        echo "Warning: Failed to update Claude Code permissions" >&2
        rm -f "$tmp"
    fi
fi

# Check for uncommitted changes
UNCOMMITTED=$(git status --porcelain)
if [[ -n "$UNCOMMITTED" ]]; then
    echo "Error: Uncommitted changes detected. Commit or stash changes first." >&2
    echo "$UNCOMMITTED" >&2
    exit 1
fi

# Move to parent directory before removing worktree
cd "$MAIN_REPO"

# Remove the worktree
echo "Removing worktree..."
git worktree remove "$WORKTREE_PATH"

echo ""
echo "=========================================="
echo "Cleanup complete."
echo "You are now in: $MAIN_REPO"
echo "=========================================="
