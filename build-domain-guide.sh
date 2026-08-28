#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$workspace_root"
pnpm exec tsx tools/living-documentation/src/shell/main.ts generate-architecture-summary
