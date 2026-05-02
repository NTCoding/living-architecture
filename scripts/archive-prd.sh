#!/bin/bash
# archive-prd.sh - Mark a folder-based PRD complete and close milestone
# Usage: ./scripts/archive-prd.sh <prd-name>

set -euo pipefail

if [[ -z "$1" ]]; then
    echo "Usage: ./scripts/archive-prd.sh <prd-name>" >&2
    echo "Example: ./scripts/archive-prd.sh phase-9-launch" >&2
    exit 1
fi

PRD_NAME="$1"
PRD_FOLDER="docs/project/PRD/${PRD_NAME}"
PRD_FILE="${PRD_FOLDER}/PRD.md"
MARKER_FILE="${PRD_FOLDER}/marker.yml"

if [[ ! -f "$PRD_FILE" ]]; then
    echo "Error: PRD not found at $PRD_FILE" >&2
    exit 1
fi

if [[ ! -f "$MARKER_FILE" ]]; then
    echo "Error: marker not found at $MARKER_FILE" >&2
    exit 1
fi

echo "Archiving PRD: $PRD_NAME"

# Get repository from git remote
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Mark the PRD complete
sed -i '' 's/^stage: .*/stage: planning-complete/' "$MARKER_FILE"

# Find and close the milestone
MILESTONE_NUMBER=$(gh api "repos/${REPO}/milestones" --jq ".[] | select(.title == \"$PRD_NAME\") | .number")

if [[ -n "$MILESTONE_NUMBER" ]]; then
    gh api "repos/${REPO}/milestones/$MILESTONE_NUMBER" \
        --method PATCH \
        --field state=closed
    echo "Milestone closed: $PRD_NAME"
else
    echo "Warning: Milestone '$PRD_NAME' not found"
fi

# Set status to Archived
sed -i '' 's/^\*\*Status:\*\* .*/**Status:** Archived/' "$PRD_FILE"
git add "$PRD_FILE" "$MARKER_FILE"

# Commit the PRD and marker update
git commit -m "chore: archive PRD $PRD_NAME"

echo ""
echo "PRD archived: $PRD_NAME"
