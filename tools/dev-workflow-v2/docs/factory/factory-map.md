# Repository Factory Map

This map describes the factory surfaces that exist in this repository: what exists, where it is defined, and how the surfaces relate. It is not an optimization procedure and it is not a duplicated rule inventory.

Source files are authoritative. This map is an index to those sources.

## Factory Philosophy

- Generated or AI-assisted code must be shaped by mechanisms that are reviewable and repeatable.
- Deterministic checks are preferred when a rule can be expressed accurately.
- Tests prove behavior; lint, roles, and dependency rules prove structure.
- Documentation explains intent, but source files and executable checks define enforcement.
- Review agents and conventions handle semantic judgment that is not safe to encode mechanically.
- Local hooks and CI decide when existing checks run; they are not substitutes for the checks themselves.
- Examples in this map illustrate mechanism use only. Inspect the referenced source files for full behavior.

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

Mechanism examples:

- A pre-commit hook can call a package script that runs multiple Nx targets before a commit is accepted.
- A commit-message hook can reject a message independently from source-code checks.
- A local gate can expose stale generated output before a branch reaches CI.

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

Mechanism examples:

- A workflow job can run affected lint, test, build, typecheck, and generated-doc targets for a pull request.
- A CI job can wait for an external scanner result and fail the pull request when the scanner fails.
- Nx target dependencies can make one visible target run prerequisite factory checks.

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

Mechanism examples:

- A `no-restricted-syntax` selector can reject a precise AST shape such as an unsafe fallback expression.
- A custom rule can inspect filenames and class declarations together when a simple selector is insufficient.
- A rule spec can pair rejected examples with accepted examples so the guardrail is executable documentation.

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
- `.riviere/role-selection-guide.md`
- `.riviere/role-definitions/**`
- `.riviere/canonical-role-configurations.md`
- `packages/riviere-role-enforcement/src/**`
- `packages/riviere-role-enforcement/role-enforcement-plugin.mjs`

Surface shape:

- `.riviere/roles.ts` defines role names and role contracts.
- `.riviere/role-enforcement.config.ts` maps roles to package locations and folder constraints.
- `.riviere/role-selection-guide.md` explains how to decide whether a declaration is a real domain concept or a more specific command, query, CLI, or infrastructure concern.
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

Annotated declaration concept:

```typescript
/** @riviere-role command-use-case-input */
export interface EnrichComponentInput {
  readonly componentId: string
}

/** @riviere-role command-use-case-result */
export interface EnrichComponentResult {
  readonly changed: boolean
}

/** @riviere-role command-use-case */
export class EnrichComponent {
  execute(input: EnrichComponentInput): EnrichComponentResult {
    return { changed: true }
  }
}
```

Mechanism examples:

- A role can limit which declaration kinds may carry that role.
- A role can constrain public method count on classes that carry that role.
- A role can require structural markers on a class, such as a private brand field, so anonymous adapter objects cannot masquerade as domain concepts.
- A location can limit which roles may appear under a folder pattern.
- A role dependency rule can reject one role importing or calling another role.
- A pure abstraction can still fail semantic ownership review when it lives in `domain/` only to format results for a specific consumer.

Relationship boundaries:

- Role enforcement owns annotated exported declaration responsibility.
- Role selection and role definitions answer the ownership question before code reaches oxlint.
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

Mechanism examples:

- A path rule can reject domain code importing infrastructure code.
- A path rule can reject one feature importing another feature directly.
- A spec-placement rule can keep tests colocated with production code rather than detached at a package root.
- Separate configs let frontend structure differ from backend package structure.

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

Mechanism examples:

- An ADR can define what a folder is responsible for before dependency or role checks encode the mechanical boundary.
- Architecture overview docs can explain why a relationship exists when a config file only shows the mechanical restriction.
- Review agents can use architecture docs to audit semantic responsibility where import paths alone are insufficient.

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

Mechanism examples:

- A spec can prove a command returns a specific domain result for a concrete input.
- A coverage config can define which production files count toward coverage thresholds.
- A rule test can prove a custom lint rule rejects a bad fixture and accepts a good fixture.

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

Mechanism examples:

- A generation script can derive CLI reference documentation from command metadata.
- A check target can regenerate output and fail when the working tree differs.
- A docs app can copy package-generated files into a published documentation tree.

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

Mechanism examples:

- CodeRabbit configuration can enable hosted scanners and decide how assertive review behavior should be.
- A knowledge-base path can feed architecture or convention documents into hosted review.
- CI can make an external quality gate blocking instead of advisory.

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

Mechanism examples:

- Command markdown can require a user approval point before a GitHub issue is created.
- A state-machine transition can mechanically prevent moving to the next workflow state before required events are recorded.
- A pre-tool hook can block writes when a workflow state is read-only.
- Plugin metadata version changes force Claude Code to reload changed plugin files.

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

Mechanism examples:

- An architecture review agent can audit responsibility boundaries using ADRs and architecture docs.
- A code review agent can apply durable design conventions that are too semantic for lint.
- A bug-scanner agent can reuse patterns learned from prior PR feedback.

Relationship boundaries:

- Agents and conventions cover semantic review gaps.
- Deterministic checks should own patterns that can be enforced mechanically.
- CodeRabbit can consume related docs through its knowledge-base configuration.

Verification entrypoints:

- `pnpm lint:md`
- workflow review path when practical
- deterministic workflow tests when agent behavior is backed by TypeScript state or hook changes
