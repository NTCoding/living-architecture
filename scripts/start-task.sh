#!/bin/bash
# start-task.sh - Set up working environment for a GitHub issue or ad-hoc task
# Usage: ./scripts/start-task.sh <issue-number> [--no-worktree]
#        ./scripts/start-task.sh --no-issue=<branch-name> [--no-worktree]
#
# By default, creates a git worktree in a sibling directory.
# Use --no-worktree to create a branch in the current repo instead.
# Use --no-issue=<name> to start a task without a GitHub issue.

set -e

# Parse arguments
ISSUE_NUMBER=""
USE_WORKTREE=true
NO_ISSUE_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-worktree)
            USE_WORKTREE=false
            shift
            ;;
        --no-issue=*)
            NO_ISSUE_NAME="${1#--no-issue=}"
            if [[ -z "$NO_ISSUE_NAME" ]]; then
                echo "Error: --no-issue requires a branch name (e.g., --no-issue=my-task)" >&2
                exit 1
            fi
            shift
            ;;
        *)
            if [[ -z "$ISSUE_NUMBER" ]]; then
                ISSUE_NUMBER="$1"
            else
                echo "Unknown option: $1" >&2
                echo "Usage: ./scripts/start-task.sh <issue-number> [--no-worktree]" >&2
                echo "       ./scripts/start-task.sh --no-issue=<branch-name> [--no-worktree]" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$ISSUE_NUMBER" ]] && [[ -z "$NO_ISSUE_NAME" ]]; then
    echo "Usage: ./scripts/start-task.sh <issue-number> [--no-worktree]" >&2
    echo "       ./scripts/start-task.sh --no-issue=<branch-name> [--no-worktree]" >&2
    exit 1
fi

if [[ -n "$ISSUE_NUMBER" ]] && [[ -n "$NO_ISSUE_NAME" ]]; then
    echo "Error: Cannot specify both issue number and --no-issue" >&2
    exit 1
fi

# Get repo info
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")

# Step 1: Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Step 2: If not on main, switch
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "Switching to main..."
    git checkout main
fi

# Step 3: Pull latest
echo "Pulling latest from origin..."
git pull origin main

# Step 4: Determine branch name
if [[ -n "$NO_ISSUE_NAME" ]]; then
    # No-issue mode: use provided name directly
    BRANCH_NAME="$NO_ISSUE_NAME"
    echo "Ad-hoc task: $BRANCH_NAME"
else
    # Issue mode: get title from GitHub
    ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --json title -q .title)
    echo "Issue title: $ISSUE_TITLE"

    # Create short description from title (lowercase, hyphens, max 30 chars)
    SHORT_DESC=$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-30)
    if [[ -z "$SHORT_DESC" ]]; then
        SHORT_DESC="task"
    fi
    BRANCH_NAME="issue-${ISSUE_NUMBER}-${SHORT_DESC}"
fi

# Step 5: Create branch (worktree or checkout)
if [[ "$USE_WORKTREE" == true ]]; then
    WORKTREE_DIR="${REPO_ROOT}/../${REPO_NAME}-${BRANCH_NAME}"
    echo "Creating worktree: $WORKTREE_DIR"
    git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR"

    # Register worktree in Claude Code permissions
    SETTINGS_LOCAL="$REPO_ROOT/.claude/settings.local.json"
    WORKTREE_ABS=$(cd "$WORKTREE_DIR" && pwd)

    if command -v jq &> /dev/null; then
        if [[ -f "$SETTINGS_LOCAL" ]]; then
            # Add to existing additionalDirectories array (or create it)
            jq --arg dir "$WORKTREE_ABS" '
              .permissions.additionalDirectories = (
                (.permissions.additionalDirectories // []) + [$dir] | unique
              )
            ' "$SETTINGS_LOCAL" > "$SETTINGS_LOCAL.tmp" && mv "$SETTINGS_LOCAL.tmp" "$SETTINGS_LOCAL"
        else
            # Create new settings.local.json (ensure directory exists first)
            mkdir -p "$(dirname "$SETTINGS_LOCAL")"
            jq -n --arg dir "$WORKTREE_ABS" '{"permissions":{"additionalDirectories":[$dir]}}' > "$SETTINGS_LOCAL"
        fi
        echo "Registered worktree in Claude Code permissions"
    else
        echo "Note: Install jq to auto-register worktrees in Claude Code permissions"
        echo "  Or run: /add-dir $WORKTREE_ABS"
    fi
else
    echo "Creating branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
fi

# Step 6: Assign issue to self (only if issue mode)
if [[ -n "$ISSUE_NUMBER" ]]; then
    echo "Assigning issue to @me..."
    gh issue edit "$ISSUE_NUMBER" --add-assignee @me
fi

# Step 7: Output summary
echo ""
echo "=========================================="
echo "Branch: $BRANCH_NAME"
if [[ "$USE_WORKTREE" == true ]]; then
    echo "Worktree: $WORKTREE_DIR"
fi
echo "=========================================="
echo ""

# Show issue details (only if issue mode)
if [[ -n "$ISSUE_NUMBER" ]]; then
    gh issue view "$ISSUE_NUMBER" --comments
    echo ""
fi

if [[ "$USE_WORKTREE" == true ]]; then
    echo "Worktree created. To start working:"
    echo "  cd $WORKTREE_DIR"
else
    echo "Ready to begin work."
fi
