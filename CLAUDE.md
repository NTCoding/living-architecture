# living-architecture

Extract software architecture from code as living documentation, using Riviere schema for flow-based (not structural) architecture

Read `@docs/project/project-overview.md` then check `@docs/project/PRD/active/*.md` for the current PRD.

## Monorepo Structure

```text
apps/       - Deployable applications (not published)
packages/   - Shared libraries (publishable to npm)
```

Current packages:
- `living-architecture/riviere-query` - Browser-safe query library (no Node.js dependencies)
- `living-architecture/riviere-builder` - Node.js builder (depends on riviere-query)
- `living-architecture/riviere-cli` - CLI tool with binary "riviere" (depends on riviere-builder)
- `@living-architecture/riviere-schema` - Riviere schema definitions
- `@living-architecture/riviere-extract-config` - JSON Schema and validation for extraction config DSL
- `@living-architecture/riviere-extract-conventions` - Decorators for marking architectural components (depends on riviere-extract-config)
- `@living-architecture/riviere-extract-ts` - TypeScript component extractor using ts-morph for AST parsing (depends on riviere-extract-config)

Apps:
- `living-architecture/eclair` - Web app for viewing your software architecture via Riviere a schema
- `living-architecture/docs` - Living architecture documentation website

Key documents:
- `docs/project/PRD/active/` - Current PRDs
- `docs/architecture/overview.md` - System design
- `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`
- `docs/architecture/adr/` - Decision records

All code must follow `docs/conventions/codebase-structure.md`.

Use domain terminology from the contextive definitions. Do not invent new terms or use technical jargon when domain terminology exists.

When discussing domain concepts, clarify terminology with the user. Add new terms to `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`.

## Commands

### Build & Test

Always use nx commands for build, test, lint. Don't try to run directly e.g. `pnpm vitest ...`

```bash
# All projects
pnpm nx run-many -t build
pnpm nx run-many -t test
pnpm nx run-many -t lint

# Specific project
pnpm nx build [project-name]
pnpm nx test [project-name]
pnpm nx lint [project-name]

# Affected only (CI optimization)
pnpm nx affected -t build
pnpm nx affected -t test
```

### Single Test File

```bash
pnpm nx test [project-name] -- --testNamePattern "should validate"
```

### Verify (Full Gate)

```bash
pnpm verify
```

### Dependency Graph

```bash
pnpm nx graph
```

### Adding New Projects

```bash
# Add backend application
pnpm nx g @nx/node:application apps/[app-name]

# Add shared library (publishable)
pnpm nx g @nx/js:library packages/[pkg-name] --publishable --importPath=@living-architecture/[pkg-name]
```

After generating a new project:
1. Update the project's package.json with correct name: `@living-architecture/[project-name]`
2. Create the 3-file tsconfig structure (tsconfig.json, tsconfig.lib.json, tsconfig.spec.json)
3. Add vitest.config.ts if tests are needed with 100% coverage as the default
4. If importing from another project, add `"@living-architecture/[pkg-name]": "workspace:*"` to dependencies
5. Run `pnpm nx sync` to update TypeScript project references
6. Update this CLAUDE.md "Current packages" section

## Task Workflow

*CRUCIAL*: Whenever working on any task, follow @docs/workflow/task-workflow.md from start to finish. Do not make any changes or commit any code without following these steps exactly.

## Testing

Follow `docs/conventions/testing.md`.

100% test coverage is mandatory and enforced.

## Code Conventions

When writing, editing, refactoring, or reviewing code:

- always follow `docs/conventions/software-design.md`
- look for standard implementation patterns defined in `docs/conventions/standard-patterns.md`
- avoid `@docs/conventions/anti-patterns.md`

Code review runs via `/code-review` and `/complete-task` commands (see `.claude/automatic-code-review/rules.md` for rules)

Code quality is of highest importance. Rushing or taking shortcuts is never acceptable. We have strong lint rules on this project so always read `eslint.config.mjs`.

## Brand Identity, theme, design, UI, UX

All UI and UX design must conform to global brand guidelines: `/docs/brand/` (logo, colors, typography, icons)

## Security

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Do not log sensitive data (passwords, tokens, PII)
- Validate and sanitize all external input

## Tools

Installed from `ntcoding/claude-skillz`:

**Skills:**
- `writing-tests` - Test naming, assertions, edge case checklists
- `software-design-principles` - Object calisthenics, fail-fast, dependency inversion

**Plugins:**
- `task-check` - Validates task completion before marking done
- `automatic-code-review` - Code review agent (used by /code-review and /complete-task)

## NX Guidelines

- **Use generators** - Don't manually create project folders. Use `pnpm nx g @nx/js:library` or `pnpm nx g @nx/node:application`.
- **Run `pnpm nx sync`** - After modifying tsconfig references or adding dependencies between projects.
- **Debugging stale cache** - If something seems stale, run `pnpm nx reset` to clear the cache.

## Release Strategy

### Bundled Package Updates

The CLI (`riviere-cli`) bundles several packages via esbuild. To ensure users always get the latest bundled content, we use NX's `updateDependents: "auto"` configuration.

**How it works:**
- When a bundled package (e.g., `riviere-extract-config`) gets released, NX automatically triggers a patch bump for `riviere-cli`
- This ensures CLI users receive updated schemas and features without manual intervention
- Only packages within the release group are updated (not external dependencies)

**Example:**
1. `riviere-extract-config` v0.2.0 → v0.2.1 (bug fix or feature)
2. NX detects that `riviere-cli` bundles `riviere-extract-config`
3. `riviere-cli` v0.7.16 → v0.7.17 automatically (with latest config schema bundled)

**Configuration:** See `nx.json` release.version section, `updateDependents: "auto"` field.

**Reference:** Follows the same pattern as employee-management repo. For details, see [NX updateDependents docs](https://nx.dev/docs/guides/nx-release/update-dependents).

## General Guidelines

- **Process before fix** - When you encounter a problem, improve the process/tooling first, then apply the fix. This ensures the same issue won't recur and benefits future work. Never just fix the symptom without addressing the root cause.
- **Use scripts, not gh/git directly** - Always use scripts in `./scripts/` for git and GitHub operations (PRs, issues, tasks). Do not use `gh` or `git` commands directly unless no script exists. If you need functionality that doesn't have a script, propose creating one rather than using raw commands.
- **Command failures vs code quality issues**:
  - **Command failures** (script doesn't exist, tool errors, missing dependencies) → STOP and consult with user
  - **Code quality issues** (lint errors, unused dependencies, test failures, knip warnings) → fix them directly
  - When in doubt, use judgment: obvious fixes → proceed; non-obvious → ask
- **Do not modify root configuration files** (eslint.config.mjs, tsconfig.base.json, nx.json, vite.config, vitest.config.mts). If you believe a change is genuinely necessary, provide the suggested changes and ask the user.
- **Do not use `--no-verify`, `--force`, or `--hard` flags.** These are blocked by hooks and will fail. All commits must pass the `verify` gate.
- **Use NX commands** for all build, test, and lint operations. Do not run npm/pnpm directly in project folders.
- **Cross-project imports** use package names (e.g., `import { X } from '@living-architecture/[pkg-name]'`), not relative paths.
- **Adding dependencies between projects** requires adding `"@living-architecture/[pkg-name]": "workspace:*"` to the consuming project's package.json.
- **Browser debugging** - When building new UI features or debugging browser issues, use Chrome MCP tools instead of guessing from code inspection.
