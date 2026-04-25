# Repository Factory Map

This map describes the factory surfaces that exist in this repository: what exists, where it is defined, and how the surfaces relate. It is not an optimization procedure and it is not a duplicated rule inventory.

Source files are authoritative. This map is an index to those sources.

## Surface Relationships

```text
developer change
  -> local commit gate
     -> package scripts and Nx targets
        -> ESLint/custom rules
        -> Riviere role enforcement
        -> dependency-cruiser
        -> tests and coverage
        -> generated-artifact checks
  -> pull request CI gate
     -> affected Nx targets
     -> external scanners and quality gates
  -> review workflow
     -> dev-workflow state machine
     -> review agents
     -> convention and architecture memory
```

Factory surfaces relate in these ways:

- Hooks and CI decide when checks run.
- ESLint checks local syntax, AST, naming, import declarations, and test-shape patterns.
- Riviere role enforcement checks exported declaration roles, role contracts, and role-specific locations.
- Dependency-cruiser checks path shape and import graph direction.
- Tests and coverage prove behavior.
- Generated-artifact checks keep generated output synchronized with source files.
- Architecture docs define placement semantics that deterministic checks and agents refer to.
- Review agents and convention docs cover semantic checks that are not encoded mechanically.
- External scanners and CodeRabbit provide hosted review or security signals.
- Dev-workflow commands, states, hooks, and plugin code govern AI workflow behavior.

## Local Commit Gate

Definition files:

- `.husky/pre-commit`
- `.husky/commit-msg`
- `package.json`

Related surfaces:

- Runs package scripts that call Nx targets.
- Pulls lint, role-check, dependency-cruiser, tests, generated-doc checks, and dead-code checks into the local path when those scripts include them.
- Commit-message enforcement is separate from code quality enforcement.

Verification entrypoints:

- `pnpm run verify`
- `.husky/pre-commit`
- `.husky/commit-msg`

## Pull Request CI Gate

Definition files:

- `.github/workflows/ci.yml`
- `nx.json`
- root `project.json`
- package `project.json` files

Related surfaces:

- Runs affected Nx targets after push.
- Connects repository checks to hosted pull-request blocking.
- Hosts external quality gates that do not live entirely in repository code.

Verification entrypoints:

- workflow jobs in `.github/workflows/ci.yml`
- target dependencies in `nx.json`
- root and package targets in `project.json` files

## ESLint and Custom Rules

Definition files:

- `eslint.config.mjs`
- `.eslint-rules/no-generic-names.js`
- `packages/riviere-extract-conventions/src/eslint/*.cjs`
- `packages/riviere-extract-conventions/src/eslint/*.spec.ts`

Surface shape:

- ESLint config is the repository-level code-shape surface.
- Custom rules hold logic that is too specific for simple config selectors.
- Rule specs provide accepted and rejected fixture examples.
- ESLint runs through package lint targets and through the local/CI gates when those gates invoke lint.

Relationship boundaries:

- ESLint is for file-local syntax and AST patterns.
- Dependency-cruiser is for resolved path graph rules.
- Riviere role enforcement is for annotated declaration roles and role contracts.
- Review agents are for semantic judgments that are not deterministic enough for lint.

Verification entrypoints:

- `pnpm exec nx affected -t lint --verbose`
- `pnpm exec nx test riviere-extract-conventions`
- `pnpm run verify`

## Riviere Role Enforcement

Definition files:

- `.riviere/role-enforcement.config.ts`
- `.riviere/roles.ts`
- `.riviere/role-definitions/**`
- `.riviere/canonical-role-configurations.md`
- `packages/riviere-role-enforcement/src/**`
- `packages/riviere-role-enforcement/role-enforcement-plugin.mjs`

Surface shape:

- `.riviere/roles.ts` defines role names and role contracts.
- `.riviere/role-enforcement.config.ts` maps roles to package locations and folder constraints.
- The role-enforcement package turns that configuration into an oxlint plugin check.
- Role definition docs explain roles for humans and generated diagnostics.

Illustrative role concept:

```typescript
role('command-use-case', {
  targets: ['class', 'function'],
  allowedInputs: ['command-use-case-input'],
  allowedOutputs: ['command-use-case-result'],
  forbiddenDependencies: ['command-use-case'],
  minPublicMethods: 1,
  maxPublicMethods: 1,
})
```

Illustrative location concept:

```typescript
location<RoleName>('src/features/{feature}')
  .subLocation('/entrypoint', ['cli-entrypoint'])
  .subLocation('/commands', commandRoles)
  .subLocation('/domain', domainRoles)
```

These snippets explain the concept only. Inspect `.riviere/roles.ts` and `.riviere/role-enforcement.config.ts` for actual role and location definitions.

Relationship boundaries:

- Role enforcement owns annotated exported declaration responsibility.
- Dependency-cruiser owns path graph direction when no role semantics are needed.
- Architecture docs explain the intent behind role and folder boundaries.

Verification entrypoints:

- `pnpm exec nx run @living-architecture/source:role-check`
- `pnpm exec tsx packages/riviere-role-enforcement/src/shell/bin.ts .riviere/role-enforcement.config.ts --package <package-path>`
- `pnpm exec nx test riviere-role-enforcement`

## Dependency Cruiser

Definition files:

- `.dependency-cruiser.mjs`
- `.dependency-cruiser.frontend.mjs`
- `.dependency-cruiser.specs.mjs`
- `package.json`

Surface shape:

- Backend/package import graph rules live in `.dependency-cruiser.mjs`.
- Frontend import graph rules live in `.dependency-cruiser.frontend.mjs`.
- Spec placement rules live in `.dependency-cruiser.specs.mjs`.
- The package script connects those configs to the repository verification path.

Relationship boundaries:

- Dependency-cruiser owns resolved import path relationships.
- Riviere role enforcement owns declaration-role relationships.
- ADR-002 describes the intended folder semantics that these configs encode.

Verification entrypoint:

- `pnpm depcruise`

## Architecture Documentation

Definition files:

- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `docs/architecture/overview.md`

Surface shape:

- Architecture docs are the human-readable source for placement and responsibility semantics.
- Deterministic surfaces encode the parts that can be enforced mechanically.
- Review agents use these docs for semantic architecture review.

Relationship boundaries:

- Architecture docs define intent.
- Role enforcement and dependency-cruiser enforce mechanical parts of that intent.
- Review agents handle semantic parts that cannot be encoded safely.

Verification entrypoints:

- `pnpm lint:md`
- related role-check or dependency-cruiser command when architecture docs and deterministic checks change together

## Tests and Coverage

Definition files:

- `tools/dev-workflow-v2/vitest.config.mts`
- package-level Vitest configs
- package `project.json` test targets
- colocated spec files

Surface shape:

- Vitest configs define test execution and coverage boundaries.
- Specs prove behavior and edge cases.
- Nx test targets connect package tests to local and CI gates.

Relationship boundaries:

- Tests prove behavior.
- ESLint and role/dependency checks prove structural constraints.
- Coverage config defines which production files are measured.

Verification entrypoints:

- `pnpm exec nx test dev-workflow-v2`
- `pnpm exec nx affected -t test --verbose`
- `pnpm test`

## Generated Documentation and Generated Artifacts

Definition files:

- package generation scripts
- package `project.json` generated-doc targets
- `apps/docs` copy/build scripts
- checked generated output directories

Surface shape:

- Generation scripts create derived docs or artifacts.
- Check targets compare generated output with checked files.
- Docs build scripts consume generated outputs from packages.

Relationship boundaries:

- Source files own truth.
- Generated files expose derived documentation.
- Generated-doc checks keep the two synchronized.

Verification entrypoints:

- relevant package generated-doc check target
- `pnpm exec nx affected -t check-generated-docs --verbose`
- `pnpm run verify`

## External Review and Scanners

Definition files:

- `.coderabbit.yaml`
- `.github/workflows/ci.yml`
- knowledge-base docs referenced by `.coderabbit.yaml`

Surface shape:

- CodeRabbit configuration controls hosted review behavior and enabled tools.
- CI connects external quality signals to pull-request status.
- Knowledge-base docs provide repository context to hosted review.

Relationship boundaries:

- External scanners provide hosted analysis.
- Repository-local deterministic checks remain the local proof surface.
- Convention and architecture docs provide context for hosted review.

Verification entrypoints:

- repository-side config review
- hosted scanner or service result when local proof is unavailable

## Dev Workflow System

Definition files:

- `tools/dev-workflow-v2/commands/*.md`
- `tools/dev-workflow-v2/states/*.md`
- `tools/dev-workflow-v2/hooks/**`
- `tools/dev-workflow-v2/src/features/workflow/domain/workflow.ts`
- `tools/dev-workflow-v2/src/features/workflow/domain/states/*.ts`
- `tools/dev-workflow-v2/src/features/workflow/domain/registry.ts`
- `tools/dev-workflow-v2/src/features/workflow/entrypoint/workflow-cli.ts`
- `tools/dev-workflow-v2/src/features/workflow/infra/persistence/workflow-definition.ts`
- `tools/dev-workflow-v2/src/shell/opencode-plugin.ts`
- `tools/dev-workflow-v2/.claude-plugin/plugin.json`

Surface shape:

- Command markdown defines user-facing workflow instructions.
- State markdown defines state-specific workflow instructions.
- TypeScript workflow code enforces state transitions and records events.
- Hooks block selected tool actions before execution.
- OpenCode plugin code bridges Claude Code plugin behavior into OpenCode.
- Plugin metadata controls Claude Code plugin cache identity.

Relationship boundaries:

- Markdown instructions guide agent behavior.
- TypeScript state and hooks mechanically constrain behavior.
- Tests prove state-machine and hook behavior.

Verification entrypoints:

- `pnpm exec nx test dev-workflow-v2`
- `pnpm exec nx typecheck dev-workflow-v2`
- `pnpm exec nx lint dev-workflow-v2`
- `pnpm run verify`

## Review Agents and Convention Memory

Definition files:

- `tools/dev-workflow-v2/agents/architecture-review.md`
- `tools/dev-workflow-v2/agents/code-review.md`
- `tools/dev-workflow-v2/agents/bug-scanner.md`
- `tools/dev-workflow-v2/agents/task-check.md`
- `docs/conventions/software-design.md`
- `docs/conventions/standard-patterns.md`
- `docs/conventions/anti-patterns.md`
- `docs/conventions/testing.md`
- `docs/conventions/review-feedback-checks.md`

Surface shape:

- Agent prompts define semantic review behavior.
- Convention docs store durable review knowledge.
- Review-feedback checks store learned PR feedback patterns.

Relationship boundaries:

- Agents and conventions cover semantic review gaps.
- Deterministic checks should own patterns that can be enforced mechanically.
- CodeRabbit can consume related docs through its knowledge-base configuration.

Verification entrypoints:

- `pnpm lint:md`
- workflow review path when practical
- deterministic workflow tests when agent behavior is backed by TypeScript state or hook changes
