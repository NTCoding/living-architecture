# ADR-002: Bun for TypeScript Script Execution

**Status:** Accepted
**Date:** 2026-01-18
**Deciders:** @ntcoding

## Context

The project uses TypeScript for build-time scripts in three areas:

1. **Dev workflow tools** (`tools/dev-workflow/`) — complete-task, get-pr-feedback, respond-to-feedback
2. **Documentation generation** — CLI reference and extract-config schema docs
3. **Validation scripts** — Pre-commit checks for generated documentation

These scripts currently use `tsx` (v4.19.0) for TypeScript execution. tsx transpiles TypeScript to JavaScript on-the-fly using esbuild, providing a convenient `node` replacement for `.ts` files.

### Current Usage Pattern

```bash
# NX targets
pnpm exec npx tsx packages/riviere-cli/scripts/generate-docs.ts

# Script shebangs
#!/usr/bin/env tsx
```

tsx is installed as a devDependency in:
- Root `package.json` (v4.19.0)
- `tools/dev-workflow/package.json` (v4.19.0)

### Performance Observations

Build-time script execution is a frequent developer activity:

- Documentation generation runs on every commit (via `check-generated-docs` target)
- Dev workflow scripts run during task lifecycle (start, complete, PR feedback)
- CI runs these scripts on every push

Initial benchmarking showed:
- `bun packages/riviere-cli/scripts/generate-docs.ts` — ~5.5 seconds
- `tsx` startup overhead contributes measurable latency to short-lived scripts

### Alternative Tools Considered

**ts-node:**
- Mature and battle-tested
- Slower than tsx (uses TypeScript compiler instead of esbuild)
- Not considered due to performance

**bun:**
- All-in-one JavaScript runtime built on JavaScriptCore
- Native TypeScript support (no transpilation step)
- 2-4x faster startup than tsx
- Already installed in CI environment
- Growing ecosystem adoption

**Direct Node.js with tsc:**
- Would require separate build step for all scripts
- Slower developer feedback loop
- Rejected in favor of on-the-fly execution

## Decision

**Replace tsx with bun for all TypeScript script execution.**

This affects:
- 6 NX targets across 3 projects (riviere-cli, riviere-extract-config, dev-workflow)
- 4 script files with `#!/usr/bin/env tsx` shebangs
- CI workflow (already has bun installed)

### Migration Scope

**NX targets updated:**
- `packages/riviere-cli/project.json` — generate-docs, check-generated-docs
- `packages/riviere-extract-config/project.json` — generate-docs, check-generated-docs
- `tools/dev-workflow/project.json` — complete-task, get-pr-feedback, respond-to-feedback

**Script shebangs updated:**
- `tools/dev-workflow/complete-task/complete-task.ts`
- `tools/dev-workflow/get-pr-feedback/get-pr-feedback.ts`
- `tools/dev-workflow/respond-to-feedback/respond-to-feedback.ts`
- `tools/dev-workflow/dev-workflow-hooks/dev-workflow-hooks.ts`

**Dependencies removed:**
- tsx from root `package.json` devDependencies
- tsx from `tools/dev-workflow/package.json` devDependencies

### Justification

1. **Performance** — Faster startup reduces latency for frequent operations (doc generation, workflow scripts, CI)
2. **Simplicity** — One less tool in the dependency graph (~10MB saved)
3. **Developer experience** — Better error messages and stack traces than tsx
4. **Low risk** — Scripts are build-time only (not production runtime); bun's Node.js compatibility is mature
5. **Already available** — CI environment has bun installed; developers likely already have it
6. **Modern features** — Native ESM/CJS support, better module resolution

### Non-Goals

This decision does NOT affect:
- Production runtime (still Node.js)
- Test runner (still Vitest)
- Build tooling (still esbuild for CLI bundling)
- Package manager (still pnpm)

Bun replaces tsx only for executing TypeScript scripts directly.

## Consequences

### Positive

- **Faster builds** — Reduced latency for doc generation and workflow scripts
- **Fewer dependencies** — tsx removed from both package.json files
- **Better DX** — Superior error messages when scripts fail
- **Future-ready** — Bun's ecosystem is growing; positions project for potential future adoption

### Negative

- **New runtime dependency** — Developers must have bun installed (likely already do)
- **Potential edge cases** — Bun's Node.js compatibility is good but not 100%; may encounter subtle differences
- **Team onboarding** — New developers need to install bun (documented in CLAUDE.md)

### Neutral

- **CI unchanged** — Bun already available in GitHub Actions environment
- **Compatibility verified** — All affected scripts tested with bun before migration
- **Rollback path** — Can revert to tsx if issues arise (minimal migration effort)

## Verification

Before accepting this ADR, the following was verified:

1. ✅ All 6 NX targets execute successfully with bun
2. ✅ Documentation generation produces identical output
3. ✅ Dev workflow scripts function correctly
4. ✅ CI workflow has bun available
5. ✅ No breaking changes to script behavior

## References

- Bun documentation: <https://bun.sh/docs>
- tsx repository: <https://github.com/privatenumber/tsx>
- GitHub issue: (branch `claude/evaluate-tsx-bun-replacement-VtAVO`)
