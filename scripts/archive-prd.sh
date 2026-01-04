#!/bin/bash
# archive-prd.sh - Move a PRD from active to archived and close milestone
# Usage: ./scripts/archive-prd.sh <prd-name>

set -e

if [[ -z "$1" ]]; then
    echo "Usage: ./scripts/archive-prd.sh <prd-name>" >&2
    echo "Example: ./scripts/archive-prd.sh phase-9-launch" >&2
    exit 1
fi

PRD_NAME="$1"
PRD_FILE="PRD-${PRD_NAME}.md"
SOURCE="docs/project/PRD/active/${PRD_FILE}"
DEST="docs/project/PRD/archived/${PRD_FILE}"

if [[ ! -f "$SOURCE" ]]; then
    echo "Error: PRD not found at $SOURCE" >&2
    exit 1
fi

echo "Archiving PRD: $PRD_NAME"

# Move the file
git mv "$SOURCE" "$DEST"

# Find and close the milestone
MILESTONE_NUMBER=$(gh api repos/NTCoding/living-architecture/milestones --jq ".[] | select(.title == \"$PRD_NAME\") | .number")

if [[ -n "$MILESTONE_NUMBER" ]]; then
    gh api "repos/NTCoding/living-architecture/milestones/$MILESTONE_NUMBER" \
        --method PATCH \
        --field state=closed
    echo "Milestone closed: $PRD_NAME"
else
    echo "Warning: Milestone '$PRD_NAME' not found"
fi

# Commit
git add -A && git commit -m "chore: archive PRD $PRD_NAME"

echo ""
echo "PRD archived: $PRD_NAME"
