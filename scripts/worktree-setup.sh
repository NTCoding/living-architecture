#!/usr/bin/env bash
# Run once after creating a fresh worktree (e.g. by JetBrains Air):
# extensions and workflow commands need node_modules and build outputs,
# which are not tracked by git.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile
pnpm --dir tools/dev-factory-v1 install --frozen-lockfile
pnpm --dir tools/dev-factory-v1 --filter @dev-factory-v1/ui build
