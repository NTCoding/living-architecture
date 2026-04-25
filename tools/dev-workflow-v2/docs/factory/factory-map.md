# Repository Factory Map

This repository is an AI-native codebase. Product code is generated, so quality must be enforced by deterministic and reviewable factory mechanisms. Factory optimization work must start from this map, inspect the exact files listed here, and extend the map when a new factory surface is added.

## Core Factory Surfaces

### ESLint and Custom Lint Rules

Primary files:

- `eslint.config.mjs`
- `.eslint-rules/no-generic-names.js`
- `packages/riviere-extract-conventions/src/eslint/*.cjs`
- `packages/riviere-extract-conventions/src/eslint/*.spec.ts`

Current purpose:

- Enforces strong TypeScript and JavaScript rules across generated code.
- Bans generic names through `custom/no-generic-names`.
- Bans inline comments and forces self-documenting code.
- Bans `let`, `var`, generic `Error`, unsafe `any`, unsafe calls, unsafe assignments, `as` assertions, and non-null assertions.
- Bans silent empty-string nullish fallback with `?? ''`.
- Enforces import extensions, duplicate import checks, restricted generic folder imports, complexity limits, maximum depth, maximum file length, ESM globals, naming conventions, and selected Unicorn rules.
- Enforces public API JSDoc for named public library entry files.
- Enforces thin entrypoint, command, and query files through lower line limits.
- Bans private functions and private arrow functions in `entrypoint/**` files.
- Enforces React and accessibility rules for `apps/eclair/**/*.tsx`.
- Enforces Vitest test rules such as no conditional expectations, strict equality, consistent test names, max expects, throw messages, and spy usage.
- Hosts custom extractor convention ESLint rules with rule tests in `packages/riviere-extract-conventions`.

Use this surface when:

- The issue can be detected from syntax, AST shape, imports, naming, file path, test structure, or deterministic metadata.
- The desired guardrail should fail during lint.

Verification expectation:

- For custom ESLint rules, add rule tests with accepted and rejected cases.
- For `no-restricted-syntax`, provide a representative violating file or command that proves the selector fails.

### Architecture and Role Enforcement

Primary files:

- `.riviere/role-enforcement.config.ts`
- `.riviere/roles.ts`
- `.riviere/role-definitions/**`
- `.riviere/canonical-role-configurations.md`
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `docs/architecture/overview.md`

Current purpose:

- Enforces allowed package locations and architectural roles.
- Applies the ADR-002 structure: `features/{feature}/entrypoint`, `commands`, `queries`, `domain`, `infra`, `platform/domain`, `platform/infra`, and `shell`.
- Defines command roles, query roles, domain roles, external-client roles, CLI presentation roles, shell roles, and workspace package source mapping.
- Forbids selected layer imports, such as entrypoints importing persistence and commands or queries importing CLI infrastructure.
- Ignores test fixtures and spec files where role enforcement is intentionally not applied.

Use this surface when:

- The issue is about file placement, layer responsibility, role naming, forbidden imports, package structure, or architecture boundaries.

Verification expectation:

- Add or adjust role-enforcement fixtures, package checks, or role definitions so invalid placement/imports fail deterministically.
- Run the relevant role-check target.

### Dependency Boundaries

Primary files:

- `.dependency-cruiser.mjs`
- `.dependency-cruiser.frontend.mjs`
- `.dependency-cruiser.specs.mjs`
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`

Current purpose:

- Enforces dependency direction and forbidden dependency patterns beyond role annotations.
- Separates backend, frontend, and spec dependency checks.

Use this surface when:

- The issue is an import graph problem that role enforcement does not express precisely enough.

Verification expectation:

- Add a deterministic dependency rule or fixture and run the dependency-cruiser target that covers the affected area.

### Test Coverage and Vitest Configuration

Primary files:

- `tools/dev-workflow-v2/vitest.config.mts`
- package-level Vitest configs
- test files next to production code

Current purpose:

- Requires 100% lines, statements, functions, and branches for `tools/dev-workflow-v2`.
- Excludes specs, test fixtures, shell, and explicitly exempted external-client code from dev-workflow coverage.
- Works with the repository rule that generated code must be backed by deterministic tests.

Use this surface when:

- The issue is missing coverage, a coverage exclusion loophole, or a test configuration gap.

Verification expectation:

- Adjust coverage include/exclude or add tests so the relevant target proves coverage enforcement.

### CodeRabbit Configuration

Primary files:

- `.coderabbit.yaml`
- `docs/conventions/software-design.md`
- `docs/conventions/anti-patterns.md`
- `docs/conventions/testing.md`
- `docs/conventions/standard-patterns.md`
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `docs/architecture/overview.md`
- `docs/workflow/code-review.md`

Current purpose:

- Runs assertive CodeRabbit review with request-changes workflow enabled.
- Enables gitleaks, semgrep, and actionlint.
- Supplies CodeRabbit with project-specific knowledge-base documents.

Use this surface when:

- The issue should be caught by CodeRabbit review guidance or supported security/review tools.
- The guardrail is review-assistant behavior rather than a local lint/test/architecture rule.

Verification expectation:

- Update the relevant knowledge-base document or CodeRabbit config and explain how future CodeRabbit review should detect the issue.
- Prefer deterministic local enforcement when available.

### Continuous Integration and Repository Gates

Primary files:

- `.github/workflows/ci.yml`
- `.husky/pre-commit`
- `.husky/commit-msg`
- `package.json`
- `nx.json`
- `pnpm-workspace.yaml`

Current purpose:

- Runs affected PR checks: lint, test, build, typecheck, generated-doc checks, and smoke tests.
- Runs all main-branch checks for lint, test, build, and typecheck.
- Waits on the SonarCloud quality gate.
- Runs browser tests for Chromium, Firefox, and WebKit.
- Runs Knip dead-code checks.
- Runs markdown lint.
- Runs ShellCheck on scripts and Husky hooks.
- Runs local pre-commit and commit-message enforcement.

Use this surface when:

- The issue is a missing repository gate, workflow bypass, generated artifact check, security check, dead-code check, shell check, or CI-only guarantee.

Verification expectation:

- Add or adjust a CI/Husky/Nx target and document the command that proves the gate catches the violation.

### Dev Workflow Commands, States, Hooks, and Agents

Primary files:

- `tools/dev-workflow-v2/commands/*.md`
- `tools/dev-workflow-v2/agents/*.md`
- `tools/dev-workflow-v2/states/*.md`
- `tools/dev-workflow-v2/hooks/**`
- `tools/dev-workflow-v2/src/features/workflow/**`
- `tools/dev-workflow-v2/src/shell/opencode-plugin.ts`
- `tools/dev-workflow-v2/.claude-plugin/plugin.json`

Current purpose:

- Defines the deterministic implementation lifecycle: choose task, start implementation, implement, verify, review, submit PR, await CI, await feedback, reflect, and complete.
- Registers review agents for architecture review, code review, bug scanning, and task checking.
- Enforces workflow transitions and write restrictions through the state machine and hooks.
- Bridges Claude Code plugin behavior and OpenCode plugin behavior.
- Requires `.claude-plugin/plugin.json` patch version bumps whenever plugin commands, agents, skills, hooks, or plugin metadata change.

Use this surface when:

- The issue is about AI workflow behavior, review-agent behavior, command instructions, state-machine gating, PR feedback handling, OpenCode integration, or plugin packaging.

Verification expectation:

- Add workflow unit tests or command/agent instruction checks when deterministic testing is possible.
- Bump `.claude-plugin/plugin.json` patch version for plugin changes.

### Review Agents and Semantic Checks

Primary files:

- `tools/dev-workflow-v2/agents/architecture-review.md`
- `tools/dev-workflow-v2/agents/code-review.md`
- `tools/dev-workflow-v2/agents/bug-scanner.md`
- `tools/dev-workflow-v2/agents/task-check.md`
- `docs/conventions/software-design.md`
- `docs/conventions/standard-patterns.md`
- `docs/conventions/anti-patterns.md`
- `docs/conventions/testing.md`
- `docs/conventions/review-feedback-checks.md`

Current purpose:

- `architecture-review` audits production files against separation-of-concerns, ADR-002, and architecture overview.
- `code-review` audits against software design, standard patterns, anti-patterns, testing conventions, and ESLint constraints.
- `bug-scanner` audits bug patterns, dangerous config changes, security issues, framework misuse, inconsistent patterns, and review-feedback checks.
- `task-check` validates acceptance criteria, PRD traceability, architectural constraints, edge cases, and UI brand consistency.

Use this surface when:

- The issue requires semantic judgment that cannot be made deterministic with reasonable accuracy.
- A convention or agent checklist is the last-resort enforcement layer.

Verification expectation:

- Add or update convention rule IDs or review-feedback checks when possible.
- Explain why deterministic enforcement was rejected.

### SonarCloud, Security, and External Review Signals

Primary files:

- `.github/workflows/ci.yml`
- `.coderabbit.yaml`
- SonarCloud project settings outside this repository

Current purpose:

- CI waits for SonarCloud quality gate.
- CodeRabbit runs semgrep, gitleaks, and actionlint.

Use this surface when:

- The issue is best enforced by a security scanner, static-analysis service, or external quality gate.

Verification expectation:

- Prefer repository-local configuration where possible.
- If enforcement depends on external settings, the issue must state the exact external setting that remains open.

## Factory Optimization Issue Requirements

Every generated factory optimization issue must include a `Current Factory Context` section that names exact inspected files and existing enforcement. A proposal that only says "lint", "CI", "architecture", or "agent instructions" is incomplete. It must name paths such as `eslint.config.mjs`, `.riviere/role-enforcement.config.ts`, `.coderabbit.yaml`, `.github/workflows/ci.yml`, or the exact `tools/dev-workflow-v2/agents/*.md` file.
