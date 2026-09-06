# living-architecture

If you are not explicitly working as part of the maintainer team, read and follow @CONTRIBUTING.md. That public contribution guide replaces the Maintainer Workflow in @AGENTS.md. Do not create an issue or install the maintainer harness; make the change and raise a pull request whose description is the specification.

For planning, discovery, PRD, architecture, delivery planning, or future-project discussion, also read and follow @project-memory/AGENTS.md.

For domain modelling or architecture questions, start with the generated current model at @docs/architecture/ddd/domain-guide.md. Use it to locate the relevant subdomains, aggregates, use cases, and operations, then inspect their code and tests before drawing conclusions.

DOMAIN concepts must be modelled honestly. Do not compromise the design with a misleading name just to make role check pass.

Domain model code must not use the TypeScript `in` operator. This includes using `in` to distinguish union members, such as `'fromClassName' in rule`. Model these values as explicit discriminated unions and match them exhaustively instead.

Always strive for exhaustive type safety. Match closed unions exhaustively, and make the compiler reject every new, removed, or renamed member until all consumers handle the change. Never duplicate published language member names in unchecked string literals.

Coverage workarounds are forbidden without explicit user approval. This includes coverage ignore directives, coverage exclusions, reduced coverage thresholds, and unreachable branches added only to satisfy coverage tooling. Cover real behaviour with tests or restructure the code so the unreachable branch does not exist.

When running the Codex workflow command in a non-interactive shell, set `CI=true`. The workflow command runs pnpm dependency checks, and pnpm otherwise tries to remove `node_modules` through a TTY prompt. In the Codex sandbox, use external execution permission if `tsx` cannot create its temporary IPC socket.

> ⚠️ **NEW WORKTREE?** Run `pnpm install --frozen-lockfile` before running tests or verification.

Extract software architecture from code as living documentation, using Riviere schema for flow-based (not structural) architecture

Read `@docs/project/project-overview.md` then check `@docs/project/PRD/*/PRD.md` for the current PRD.

For planning, discovery, PRD, architecture, delivery planning, or future-project discussion, read `@project-memory/AGENTS.md` and apply the project memory rules for deferred work.

## Monorepo Structure

```text
apps/       - Applications that aggregate subdomain use cases
packages/   - Subdomains split into domain-model, use-cases, and published-language packages
tools/      - Standalone app packages; their subdomain packages live under packages/
```

Current packages:

- `packages/living-documentation/domain-model` - Living documentation architecture model and comparison
- `packages/living-documentation/use-cases` - Architecture summary and pull request architecture diff queries
- `packages/dev-workflow-v2/domain-model` - Maintainer workflow domain model
- `packages/dev-workflow-v2/use-cases` - Maintainer workflow commands and adapters
- `packages/riviere-builder/domain-model` - Browser-safe graph construction and querying domain model
- `packages/riviere-builder/use-cases` - Commands, queries and data access for graph building and querying
- `packages/riviere-schema/published-language` - Rivière graph contract
- `packages/riviere-extract-config/published-language` - Extraction config contract
- `packages/riviere-extract-conventions/published-language` - Annotations and ESLint integration for extraction conventions
- `packages/riviere-extract-ts/domain-model` - TypeScript extraction domain model using ts-morph
- `packages/riviere-extract-ts/use-cases` - TypeScript extraction commands and data access
- `packages/riviere-role-enforcement/domain-model` - Role-enforcement domain model and Oxlint plugin
- `packages/riviere-role-enforcement/use-cases` - Role-enforcement command, repository, adapter and external clients

Apps:

- `apps/cli` - CLI entrypoints and composition shell
- `apps/eclair` - Web app for viewing your software architecture via a Rivière schema
- `apps/docs` - Living architecture documentation website

Tools:

- `tools/dev-workflow-v2` - Maintainer workflow app and plugin entrypoints
- `tools/living-documentation` - CLI for generating architecture summaries and pull request architecture diffs

Key documents:

- `docs/project/PRD/` - Current PRD folders
- `project-memory/` - Cross-PRD planning memory for deferred ideas, priorities, and future-work context
- `docs/architecture/overview.md` - System design
- `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`
- `docs/architecture/adr/` - Decision records

All code must follow [ADR-002](docs/architecture/adr/ADR-002-allowed-folder-structures.md) and the executable rules in [`.riviere/role-enforcement.config.ts`](.riviere/role-enforcement.config.ts). Keep those two files aligned.

Use domain terminology from the contextive definitions. Do not invent new terms or use technical jargon when domain terminology exists.

When discussing domain concepts, clarify terminology with the user. Add new terms to `docs/architecture/domain-terminology/contextive/definitions.glossary.yml`.

## Commands

### Build & Test

Always use nx commands for build, test, lint. Don't try to run directly e.g. `pnpm vitest ...`

```bash
# All projects
pnpm nx run-many -t build

# Specific project
pnpm nx lint [project-name]
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

# Add a subdomain package
pnpm nx g @nx/js:library packages/SUBDOMAIN/PACKAGE_LAYER --publishable --importPath=@living-architecture/PACKAGE_NAME
```

Replace `SUBDOMAIN` and `PACKAGE_NAME` with the chosen names. Set `PACKAGE_LAYER` to `domain-model`, `use-cases`, or `published-language`.

After generating a new project:

1. Update the project's package.json with the correct published package name
2. Create the 3-file tsconfig structure (tsconfig.json, tsconfig.lib.json, tsconfig.spec.json)
3. Add vitest.config.ts if tests are needed with 100% coverage as the default
4. If importing from another project, add its published package name with `"workspace:*"` to dependencies
5. Run `pnpm nx sync` to update TypeScript project references
6. Update this AGENTS.md "Current packages" section

## Task Workflow

There are two contribution workflows. Team membership determines the workflow, not the agent provider or harness being used.

- **Maintainer workflow:** when working as part of the maintainer team, follow `docs/workflow/task-workflow.md` from start to finish. Maintainers can create GitHub issues and use `dev-workflow-v2` to run the full planning and implementation lifecycle.
- **External contribution workflow:** anyone not explicitly working as part of the maintainer team follows `CONTRIBUTING.md`. This is a lightweight pull-request workflow. Do not create a GitHub issue and do not attempt to use or install the maintainer harness. The pull request description is the specification for the change.

## Testing

Follow `docs/conventions/testing.md`.

100% test coverage is mandatory and enforced.

## Code Conventions

When writing, editing, refactoring, or reviewing code:

- always follow `docs/conventions/software-design.md`
- look for standard implementation patterns defined in `docs/conventions/standard-patterns.md`
- avoid `docs/conventions/anti-patterns.md`

CRUCIAL: If you see any code that is not aligned with our conventions, always fix it. Quality code aligned with our conventions is always the top priority. Far more important than rushing to finish a new feature.

## Role Enforcement

Enforced packages require `/** @riviere-role <role-name> */` on every exported declaration. Before writing code in an enforced package, read `.riviere/role-enforcement.config.ts` and `.riviere/role-selection-guide.md`.

Quick check: `pnpm nx lint <package-name>`

## Brand Identity, theme, design, UI, UX

All UI and UX design must conform to global brand guidelines: `/docs/brand/` (logo, colors, typography, icons)

## Security

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Do not log sensitive data (passwords, tokens, PII)
- Validate and sanitize all external input

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
- **Maintainer workflow operations** - Maintainers use the scripts and `dev-workflow-v2` commands documented in `docs/workflow/task-workflow.md`. Direct `git add`/`git commit` is fine; `git push` and `gh pr` are blocked by maintainer harness hooks. External contributors instead follow `CONTRIBUTING.md` and raise their pull request normally.
- **Command failures vs code quality issues**:
  - **Command failures** (script doesn't exist, tool errors, missing dependencies) → STOP and consult with user
  - **Code quality issues** (lint errors, unused dependencies, test failures, knip warnings) → fix them directly
  - When in doubt, use judgment: obvious fixes → proceed; non-obvious → ask
- **Do not modify root configuration files** (eslint.config.mjs, tsconfig.base.json, nx.json, vite.config, vitest.config.mts). If you believe a change is genuinely necessary, provide the suggested changes and ask the user.
- **Do not use `--no-verify`, `--force`, or `--hard` flags.** These are blocked by hooks and will fail. All commits must pass the `verify` gate.
- **Cross-project imports** use package names (e.g., `import { X } from '@living-architecture/[pkg-name]'`), not relative paths.
- **Adding dependencies between projects** requires adding `"@living-architecture/[pkg-name]": "workspace:*"` to the consuming project's package.json.
- **Browser debugging** - When building new UI features or debugging browser issues, use Chrome MCP tools instead of guessing from code inspection.
