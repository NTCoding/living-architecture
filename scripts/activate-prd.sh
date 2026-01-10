#!/bin/bash
# activate-prd.sh - Move a PRD from notstarted to active and create milestone
# Usage: ./scripts/activate-prd.sh <prd-name>

set -e

if [[ -z "$1" ]]; then
    echo "Usage: ./scripts/activate-prd.sh <prd-name>" >&2
    echo "Example: ./scripts/activate-prd.sh phase-10-features" >&2
    exit 1
fi

PRD_NAME="$1"
PRD_FILE="PRD-${PRD_NAME}.md"
SOURCE="docs/project/PRD/notstarted/${PRD_FILE}"
DEST="docs/project/PRD/active/${PRD_FILE}"

if [[ ! -f "$SOURCE" ]]; then
    echo "Error: PRD not found at $SOURCE" >&2
    exit 1
fi

echo "Activating PRD: $PRD_NAME"

# Get repository from git remote
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Move the file
git mv "$SOURCE" "$DEST"

# Create the milestone
gh api "repos/${REPO}/milestones" \
    --method POST \
    --field title="$PRD_NAME" \
    --field description="See https://github.com/${REPO}/blob/main/${DEST}"

# Create the PRD label for filtering in Linear (--force updates if exists)
LABEL_NAME="prd:${PRD_NAME}"
gh label create "$LABEL_NAME" \
    --description "PRD: ${PRD_NAME}" \
    --color 0052CC \
    --force

# Commit only the moved file
git commit -m "chore: activate PRD $PRD_NAME"

echo ""
echo "PRD activated: $PRD_NAME"
echo "Milestone created: $PRD_NAME"
