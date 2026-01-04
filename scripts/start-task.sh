#!/bin/bash
# start-task.sh - Set up working environment for a GitHub issue
# Usage: ./scripts/start-task.sh <issue-number>

set -e

if [[ -z "$1" ]]; then
    echo "Usage: ./scripts/start-task.sh <issue-number>" >&2
    exit 1
fi

ISSUE_NUMBER="$1"

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

# Step 4: Get issue title and create branch
ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --json title -q .title)
echo "Issue title: $ISSUE_TITLE"

# Create short description from title (lowercase, hyphens, max 30 chars)
SHORT_DESC=$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-30)
BRANCH_NAME="issue-${ISSUE_NUMBER}-${SHORT_DESC}"

echo "Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Step 5: Assign issue to self
echo "Assigning issue to @me..."
gh issue edit "$ISSUE_NUMBER" --add-assignee @me

# Step 6: Output full issue with comments
echo ""
echo "=========================================="
echo "Branch: $BRANCH_NAME"
echo "=========================================="
echo ""
gh issue view "$ISSUE_NUMBER" --comments
echo ""
echo "Ready to begin work."
