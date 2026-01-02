# living-architecture

Extract software architecture from code as living documentation, using Riviere schema for flow-based (not structural) architecture

Read `@docs/project/project-overview.md` then check `@docs/project/PRD/active/*.md` for the current PRD.

## Monorepo Structure

```
apps/       - Deployable applications (not published)
packages/   - Shared libraries (publishable to npm)
```

Current packages:
- `living-architecture/riviere-query` - Browser-safe query library (no Node.js dependencies)
- `living-architecture/riviere-builder` - Node.js builder (depends on riviere-query)
- `living-architecture/riviere-cli` - CLI tool with binary "riviere" (depends on riviere-builder)
- `@living-architecture/riviere-schema` - Riviere schema definitions

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
pnpm nx run-many -t lint,typecheck,test
```

Coverage is always enabled in vitest configs.

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

Tasks are managed via GitHub Issues. Follow `docs/workflow/task-workflow.md` for all task management. Whenever you are told to "start task", "update task", "complete task" etc you MUST consult the workflow and follow the appropriate step.

Never commit code changes without following the task workflow.

## Testing

Follow `docs/conventions/testing.md`.

100% test coverage is mandatory and enforced.

## Code Conventions

When writing, editing, refactoring, or reviewing code: 

- always follow `docs/conventions/software-design.md` 
- look for standard implementation patterns defined in `docs/conventions/standard-patterns.md`
-  avoid `@docs/conventions/anti-patterns.md`

The automatic code review agent enforces these conventions (see `./claude/automatic-code-review/rules.md`)

Code quality is of highest importance. Rushing or taking shortcuts is never acceptable.

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
- `automatic-code-review` - Reviews code on session stop

## NX Guidelines

- **Use generators** - Don't manually create project folders. Use `pnpm nx g @nx/js:library` or `pnpm nx g @nx/node:application`.
- **Run `pnpm nx sync`** - After modifying tsconfig references or adding dependencies between projects.
- **Debugging stale cache** - If something seems stale, run `pnpm nx reset` to clear the cache.

## General Guidelines

- **Fail fast** - If a command fails or something doesn't work, STOP and discuss with the user. Do not improvise or try workarounds. Fix the underlying issue (or update the skill/docs) so it doesn't happen again.
- **Do not modify root configuration files** (eslint.config.mjs, tsconfig.base.json, nx.json, vite.config, vitest.config.mts). If you believe a change is genuinely necessary, provide the suggested changes and ask the user.
- **Do not use `--no-verify`, `--force`, or `--hard` flags.** These are blocked by hooks and will fail. All commits must pass the `verify` gate.
- **Use NX commands** for all build, test, and lint operations. Do not run npm/pnpm directly in project folders.
- **Cross-project imports** use package names (e.g., `import { X } from '@living-architecture/[pkg-name]'`), not relative paths.
- **Adding dependencies between projects** requires adding `"@living-architecture/[pkg-name]": "workspace:*"` to the consuming project's package.json.
