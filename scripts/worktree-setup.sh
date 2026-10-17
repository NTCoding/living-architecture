#!/usr/bin/env bash
# Run once after creating a fresh worktree (e.g. by JetBrains Air):
# extensions and workflow commands need node_modules and build outputs,
# which are not tracked by git.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile
pnpm exec nx run-many -t build -p @living-architecture/dev-workflow-v2-use-cases @living-architecture/dev-workflow-v2-domain-model dev-workflow-v2
