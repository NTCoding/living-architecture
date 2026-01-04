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

# Move the file
git mv "$SOURCE" "$DEST"

# Create the milestone
gh api repos/NTCoding/living-architecture/milestones \
    --method POST \
    --field title="$PRD_NAME" \
    --field description="See https://github.com/NTCoding/living-architecture/blob/main/${DEST}"

# Commit
git add -A && git commit -m "chore: activate PRD $PRD_NAME"

echo ""
echo "PRD activated: $PRD_NAME"
echo "Milestone created: $PRD_NAME"
