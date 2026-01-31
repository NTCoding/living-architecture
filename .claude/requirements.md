## Global Guidelines

- Follow TDD: red-green-refactor
- 100% test coverage mandatory
- Follow software-design.md conventions (no comments, no `any`, fail-fast, intention-revealing names)
- Follow codebase-structure.md (feature-first, co-locate related code)
- All git operations use `execSync` from `child_process` (no git libraries)
- Working directory: `/Users/nicko/code/living-architecture-issue-169-m5-add-pr-component-extraction`

## Verification & Definition of Done

```bash
pnpm nx test riviere-cli
pnpm nx lint riviere-cli
pnpm nx build riviere-cli
pnpm verify
```

## Task 1: Add git error codes

- Add `GitNotARepository = 'GIT_NOT_A_REPOSITORY'` and `GitNotFound = 'GIT_NOT_FOUND'` to `CliErrorCode` enum
- File: `packages/riviere-cli/src/platform/infra/cli-presentation/error-codes.ts`

## Task 2: Create git-changed-files module

- File: `packages/riviere-cli/src/features/extract/commands/git-changed-files.ts`
- Test: `packages/riviere-cli/src/features/extract/commands/git-changed-files.spec.ts`
- Function: `detectChangedTypeScriptFiles(options: { base?: string }): ChangedFilesResult`
- Result type: `{ files: string[], warnings: string[] }`
- Detection order: repo check → HEAD check → uncommitted check → diff
- Base branch: `--base` flag > `git symbolic-ref refs/remotes/origin/HEAD` > `main`
- Filter to `.ts`/`.tsx` only
- Edge cases: not a repo (throw), git not found (throw), detached HEAD (HEAD~1), no TS changes (empty array), staged/unstaged warnings

## Task 3: Create format-pr-markdown module

- File: `packages/riviere-cli/src/features/extract/commands/format-pr-markdown.ts`
- Test: `packages/riviere-cli/src/features/extract/commands/format-pr-markdown.spec.ts`
- Format per PRD section 3.7: Added/Modified/Removed sections
- Accept categorized components, output markdown string

## Task 4: Add --files flag

- `--files <paths...>` variadic option
- Validate files exist (exit 3 with error listing missing file)
- Filter source files to intersection of config globs AND specified files
- Mutual exclusivity with `--pr` and `--enrich`

## Task 5: Add --pr and --base flags

- `--pr` boolean, `--base <branch>` string
- `--base` only valid with `--pr`
- Call `detectChangedTypeScriptFiles`, filter to config-matching files
- Mutual exclusivity with `--files` and `--enrich`
- Print warnings from git detection

## Task 6: Add --format flag

- `--format <type>` — "json" (default) or "markdown"
- `--format markdown` only valid with `--pr` or `--files`
- JSON: existing formatSuccess wrapper
- Markdown: use format-pr-markdown module

## Task 7: Full verification

- `pnpm verify` must pass
- `--help` shows all new flags
- Build produces working binary
