#!/bin/bash
# list-tasks.sh - Wrapper that delegates to TypeScript implementation
# Usage: ./scripts/list-tasks.sh              # All tasks (milestone + non-milestone) as JSON
#        ./scripts/list-tasks.sh --ideas      # Non-milestone: idea label only
#        ./scripts/list-tasks.sh --bugs       # Non-milestone: bug label only
#        ./scripts/list-tasks.sh --tech       # Non-milestone: tech improvement label only

# Forward all arguments to the TypeScript implementation
pnpm nx list-tasks dev-workflow -- "$@"
