# Repository Factory Map

This map explains how the repository quality factory works. It describes the mechanisms, their responsibilities, their configuration points, and concrete examples of how they enforce quality.

## Factory Execution Pipeline

### Local commit gate

Files:

- `.husky/pre-commit`
- `.husky/commit-msg`
- `package.json`

Execution:

1. `.husky/pre-commit` runs `npx lint-staged && pnpm run verify`.
2. `lint-staged` formats and auto-fixes staged TypeScript files with Prettier and ESLint.
3. `pnpm run verify` runs:
   - `nx run-many -t lint-md role-check build depcruise lint typecheck test check-generated-docs knip --exclude=eclair`
4. `.husky/commit-msg` runs commitlint against the commit message.

Factory implications:

- A guardrail that belongs in the local development loop should attach to one of the targets already included in `pnpm run verify`.
- A new target is weaker unless it is wired into `verify`, the Nx graph, CI, or a workflow command.
- Formatting-only fixes belong to lint-staged or ESLint autofix. Quality rejection belongs to lint, role-check, depcruise, test, or check-generated-docs.

### Pull request CI gate

Files:

- `.github/workflows/ci.yml`
- `nx.json`
- `project.json`
- package `project.json` files

Execution:

- PRs run `pnpm exec nx affected -t lint test build typecheck check-generated-docs smoke-test --verbose`.
- Main runs `pnpm exec nx run-many -t lint test build typecheck --verbose`.
- SonarCloud scan waits for the quality gate.
- Browser tests run separately for Chromium, Firefox, and WebKit.
- Dead-code checks run through `pnpm knip`.
- Markdown lint runs through `pnpm lint:md`.
- ShellCheck runs against `scripts/*.sh`, `.husky/commit-msg`, and `.husky/pre-commit`.

Factory implications:

- A guardrail that must block PRs needs to be attached to a target included in affected CI or to a separate CI job.
- Repository-wide checks live in root `project.json`: `lint-md`, `depcruise`, `knip`, and `role-check`.
- Nx target dependencies in `nx.json` mean `lint`, `build`, and `test` already force role-check and upstream builds.
- Generated documentation is checked by `check-generated-docs`; changes that alter generated output must keep generated sources and checked output synchronized.

## Enforcement Surfaces

### ESLint: syntax, AST, imports, naming, test smell, and local code shape

Files:

- `eslint.config.mjs`
- `.eslint-rules/no-generic-names.js`
- `packages/riviere-extract-conventions/src/eslint/*.cjs`
- `packages/riviere-extract-conventions/src/eslint/*.spec.ts`

What it currently enforces:

- TypeScript safety:
  - no explicit `any`
  - no unsafe assignment
  - no unsafe member access
  - no unsafe call
  - no unsafe return
  - no type assertions through `@typescript-eslint/consistent-type-assertions` with `assertionStyle: never`
  - no non-null assertions
- Mutation avoidance:
  - bans `let`
  - bans `var`
  - enforces `prefer-const`
- Fail-fast pressure:
  - bans `new Error()` so precise custom errors are used instead of generic errors
  - bans `?? ''` through a `no-restricted-syntax` selector
  - prefers nullish coalescing and optional chains where TypeScript can prove safety
- Self-documenting code pressure:
  - bans inline comments
  - disables comment-format rules because comments should not be present as implementation crutches
- Naming:
  - enforces naming conventions for variables, functions, parameters, type-like declarations, enum members, and object literal properties
  - runs `custom/no-generic-names`
  - `.eslint-rules/no-generic-names.js` rejects generic filename and class-name fragments such as `utils`, `helpers`, `helper`, `service`, `manager`, `processor`, and `data`
- Structure and imports:
  - requires extensionless TypeScript imports
  - rejects duplicate imports
  - rejects imports from generic folders: `utils`, `helpers`, `common`, `shared`, `core`, and project-local `lib`
  - rejects CommonJS globals `__dirname` and `__filename`
- Complexity:
  - caps files at 400 non-blank, non-comment lines
  - caps entrypoint, command, and query orchestration files at 150 lines, with named exceptions
  - caps max nesting depth at 3
  - caps cyclomatic complexity at 12
- Entrypoint thinness:
  - bans private function declarations in `entrypoint/**`
  - bans private arrow functions in `entrypoint/**`
  - repeats `let`, generic `Error`, and `?? ''` bans for entrypoints
- Public API documentation:
  - enforces JSDoc on selected public library API files
- Eclair frontend quality:
  - bans React array index keys
  - enforces selected accessibility checks
- Vitest test quality:
  - no conditional expects
  - no conditional tests
  - prefer strict equality
  - force `it` naming
  - force `.spec.ts` and `.spec.tsx` filenames
  - cap expects per test at 4
  - require thrown error messages
  - prefer `vi.spyOn`
  - prefer `toHaveLength`
  - prefer called-with assertions

Configuration mechanics:

- `no-restricted-syntax` handles stable AST selector checks.
- Custom ESLint rules handle path-aware logic, multiple AST conditions, fixer logic, and explicit accepted/rejected examples.
- Custom rule tests live next to rules in `packages/riviere-extract-conventions/src/eslint`.
- `.eslint-rules/no-generic-names.js` handles filename and class-name naming enforcement.
- Markdown instructions are advisory and do not create deterministic ESLint rejection.

Verification commands:

- Root lint: `pnpm exec nx affected -t lint --verbose`
- Package rule tests: `pnpm exec nx test riviere-extract-conventions`
- Full local gate: `pnpm run verify`

### Riviere role enforcement: architectural roles and location-specific declarations

Files:

- `.riviere/role-enforcement.config.ts`
- `.riviere/roles.ts`
- `.riviere/role-definitions/**`
- `.riviere/canonical-role-configurations.md`
- `packages/riviere-role-enforcement/src/**`

What it currently enforces:

- Enforced packages:
  - `packages/riviere-cli`
  - `packages/riviere-extract-ts`
  - `packages/riviere-builder`
  - `packages/riviere-query`
  - `packages/riviere-role-enforcement`
  - `tools/dev-workflow-v2`
- Ignored paths:
  - specs
  - fixtures
  - generated fixture-style files listed in `ignorePatterns`
- Location rules:
  - `src/features/{feature}/entrypoint` allows `cli-entrypoint` and forbids persistence imports
  - `src/features/{feature}/commands` allows command use-case roles and forbids CLI infra imports
  - `src/features/{feature}/queries` allows query use-case and query model roles and forbids CLI infra imports
  - `src/features/{feature}/domain` allows aggregate, value object, domain service, domain error, and query model roles
  - `src/features/{feature}/infra/external-clients/{client}` allows external-client service, model, and error roles
  - `src/features/{feature}/infra/persistence` allows aggregate repositories and query-model loaders
  - `src/features/{feature}/infra/cli/output` allows CLI output formatters
  - `src/platform/domain` allows shared domain roles
  - `src/platform/infra/external-clients/{client}` allows external-client roles
  - `src/platform/infra/cli/input` allows CLI input validators
  - `src/platform/infra/cli/presentation` allows CLI output formatters and CLI errors
  - `src/shell` allows `main`
- Role behavior:
  - command use cases require `*Input` inputs and `*Result` outputs, one public method, and no command-use-case dependency
  - query use cases require query input/output roles, one public method, and no query-use-case dependency
  - repositories and loaders have allowed outputs and cannot depend on peers of the same role
  - aggregates require public behavior and have approved aggregate instances
  - `main` cannot call command use cases, query use cases, repositories, or loaders directly
  - role annotations use `/** @riviere-role <role> */`

How role enforcement works:

1. `.riviere/roles.ts` defines valid role names and role contracts.
2. `.riviere/role-enforcement.config.ts` maps those roles to folders.
3. Each exported top-level function, class, interface, or type alias in an enforced package must have exactly one `@riviere-role` annotation.
4. The role-enforcement command builds an oxlint config from `.riviere/role-enforcement.config.ts`.
5. The oxlint plugin checks every enforced TypeScript file except ignored specs and fixtures.
6. The plugin rejects:
   - missing role annotations on exported declarations,
   - unknown roles,
   - multiple roles on one declaration,
   - a role applied to the wrong declaration kind,
   - a role placed in a folder where it is not allowed,
   - declaration names that violate role `nameMatches` or `allowedNames`,
   - classes with too few or too many public methods,
   - function/class method inputs or outputs whose referenced types have disallowed roles,
   - imports from files exporting roles listed in `forbiddenDependencies`,
   - non-construction usage of imports whose roles are listed in `forbiddenMethodCalls`,
   - path imports matching folder-level `forbiddenImports`.

Role definition example:

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

Operational meaning:

- `targets` means only exported classes and functions may use `@riviere-role command-use-case`.
- `allowedInputs` means a function or public class method must accept exactly one parameter whose referenced type is annotated with `command-use-case-input`.
- `allowedOutputs` means the return type must resolve to declarations annotated with `command-use-case-result`.
- `forbiddenDependencies` means the file cannot import from another file exporting `command-use-case`.
- `minPublicMethods` and `maxPublicMethods` mean a command-use-case class must expose exactly one public method.

Annotated code example:

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

Failures this catches:

- `EnrichComponent` has no `@riviere-role` annotation.
- `EnrichComponent` is annotated as `domain-service` while living under `commands/`.
- `execute` accepts a type that is not annotated as `command-use-case-input`.
- `execute` returns a type that is not annotated as `command-use-case-result`.
- `EnrichComponent` has two public methods.
- `EnrichComponent` imports another command use case.

Location configuration example:

```typescript
location<RoleName>('src/features/{feature}')
  .subLocation('/entrypoint', ['cli-entrypoint'], {
    forbiddenImports: ['**/infra/persistence/**'],
  })
  .subLocation('/commands', commandRoles, {
    forbiddenImports: ['**/infra/cli/**'],
  })
  .subLocation('/domain', domainRoles)
```

Operational meaning:

- The `{feature}` placeholder expands to a wildcard feature segment.
- Every configured package receives these same folder rules under its own `src/` directory.
- Files in `src/features/<feature>/entrypoint` may export only `cli-entrypoint` declarations.
- Entrypoint files cannot import anything whose resolved path matches `**/infra/persistence/**`.
- Command files may export only command roles and cannot import CLI infra.
- Domain files may export only domain roles.

Failure example — wrong role in wrong folder:

```typescript
// packages/riviere-cli/src/features/building/domain/save-to-database.ts

/** @riviere-role external-client-service */
export function saveToDatabase(): void {}
```

Why it fails:

- `domain/` only allows `aggregate`, `value-object`, `domain-service`, `domain-error`, and `query-model`.
- `external-client-service` belongs under `infra/external-clients/{client}`.

Failure example — forbidden role dependency:

```typescript
// commands/enrich-component.ts
import { ValidateComponent } from './validate-component'

/** @riviere-role command-use-case */
export class EnrichComponent {
  execute(input: EnrichComponentInput): EnrichComponentResult {
    return new ValidateComponent().execute(input)
  }
}
```

Why it fails:

- `ValidateComponent` is exported from a file annotated with `command-use-case`.
- `command-use-case` has `forbiddenDependencies: ['command-use-case']`.
- Commands must orchestrate dependencies, not compose peer use cases.

Failure example — forbidden method call role:

```typescript
/** @riviere-role main */
export function run(): void {
  EnrichComponent.executeStatically()
}
```

Why it fails:

- The `main` role lists `command-use-case`, `query-model-use-case`, `aggregate-repository`, and `query-model-loader` in `forbiddenMethodCalls`.
- A `main` file may construct wiring objects, but it cannot use imported use cases, repositories, or loaders as collaborators directly.
- The plugin accepts `new EnrichComponent(...)` but rejects `EnrichComponent.someMethod`, passing `EnrichComponent` as a value, or other non-construction usage.

When to choose role enforcement instead of dependency-cruiser:

- Choose role enforcement when the rule is about what an exported declaration is allowed to be.
- Choose role enforcement when the rule depends on annotations such as `command-use-case`, `aggregate-repository`, or `main`.
- Choose role enforcement when a class/function contract must be constrained by input/output roles or public-method count.
- Choose role enforcement when a role must not depend on another role even if the folders would otherwise permit the import.
- Choose dependency-cruiser when the rule is only about path-to-path imports or folder shape.

Role-enforcement extension points:

| Problem | Change | Example implementation target |
| --- | --- | --- |
| A new kind of declaration needs a role | Add a role to `RoleName`, `allRoles`, and `.riviere/role-definitions/<role>.md` | `.riviere/roles.ts` |
| Existing role appears in the wrong folder | Adjust allowed roles for a `.subLocation(...)` or add a new sublocation | `.riviere/role-enforcement.config.ts` |
| A layer imports a forbidden technical folder | Add `forbiddenImports` to that sublocation | `.riviere/role-enforcement.config.ts` |
| A role imports another role it should not know about | Add `forbiddenDependencies` to the role definition | `.riviere/roles.ts` |
| A wiring role constructs dependencies but must not call them | Add `forbiddenMethodCalls` | `.riviere/roles.ts` |
| A role must have a precise input or output type | Add `allowedInputs` or `allowedOutputs` | `.riviere/roles.ts` |
| A role must expose only one public method | Add `minPublicMethods` and `maxPublicMethods` | `.riviere/roles.ts` |
| A role name must follow a convention | Add `nameMatches` or `allowedNames` | `.riviere/roles.ts` |

Configuration mechanics:

- `.riviere/roles.ts` defines declaration responsibilities, role target types, name matching, allowed inputs, allowed outputs, public-method counts, forbidden dependencies, and forbidden method calls.
- `.riviere/role-enforcement.config.ts` defines where roles are allowed and which folder-specific imports are forbidden.
- `forbiddenImports` handles layer dependencies that follow path patterns.
- `forbiddenDependencies` and `forbiddenMethodCalls` handle role-to-role constraints rather than path-only constraints.

Verification commands:

- Whole workspace: `pnpm exec nx run @living-architecture/source:role-check`
- Package-scoped: `pnpm exec tsx packages/riviere-role-enforcement/src/shell/bin.ts .riviere/role-enforcement.config.ts --package <package-path>`
- Role-enforcement package tests: `pnpm exec nx test riviere-role-enforcement`

### Dependency Cruiser: path-level architecture and import graph rules

Files:

- `.dependency-cruiser.mjs`
- `.dependency-cruiser.frontend.mjs`
- `.dependency-cruiser.specs.mjs`
- `package.json`

What it currently enforces:

- Backend/package graph rules in `.dependency-cruiser.mjs`:
  - `src/` root contains only `features/`, `platform/`, `shell/`, and `index.ts` for layered packages
  - `platform/` contains only `domain/` and `infra/`
  - feature folders contain only `entrypoint/`, `commands/`, `queries/`, `domain/`, and `infra/`
  - commands and queries are flat; nested command/query folders fail
  - entrypoints cannot import domain
  - entrypoints can only import own commands, own queries, own infra, and platform infra
  - entrypoints cannot import platform persistence or external-client infra
  - domain cannot import commands, queries, entrypoint, shell, or any infra
  - features cannot import other features
  - commands cannot import entrypoints, HTTP infra, CLI infra, mappers, middleware, queries, or other features
  - queries cannot import commands, entrypoints, messaging infra, CLI infra, mappers, or middleware
  - shell cannot import domain
  - platform cannot import features
  - circular dependencies fail
- Frontend graph rules in `.dependency-cruiser.frontend.mjs`:
  - permits React-specific `components/` and `hooks/` feature subfolders
  - permits frontend `main.tsx` and test support folders
  - enforces frontend entrypoint, domain, command, query, shell, platform, cross-feature, peer-command, and circular restrictions
- Spec graph rules in `.dependency-cruiser.specs.mjs`:
  - spec files must be colocated with production code, not at `src/` root
  - feature files must live in approved structural subfolders
- Root script:
  - `pnpm depcruise` runs backend, frontend, and spec cruiser configs.

Configuration mechanics:

- `.dependency-cruiser.mjs` contains backend and package-source path/import graph rules.
- `.dependency-cruiser.frontend.mjs` contains frontend-specific structural rules.
- `.dependency-cruiser.specs.mjs` contains test-file placement rules.
- Dependency Cruiser operates on resolved imports and paths; role enforcement operates on annotated declaration roles.

Verification command:

- `pnpm depcruise`

### ADR and architecture docs: source of truth for placement semantics

Files:

- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `docs/architecture/overview.md`

What ADR-002 defines:

- Standard feature structure:
  - `entrypoint/` translates external input/output and must stay thin
  - `commands/` orchestrates write operations and delegates business rules to domain
  - `queries/` reads without modifying state
  - `domain/` contains business rules and no I/O
  - `infra/` contains feature-specific infrastructure and must use subfolders
  - `platform/domain/` contains shared business rules and depends on nothing
  - `platform/infra/` contains shared technical concerns
  - `shell/` wires startup only and contains no business logic
- Library packages use the same `features/` and `platform/` structure.
- Library `src/index.ts` is a pure barrel export file.
- React apps add `components/` and `hooks/`.
- Flat packages are allowed only for packages too small for internal layering.

Configuration mechanics:

- ADR-002 records architectural placement decisions.
- Dependency-cruiser and role enforcement encode enforceable ADR-002 rules.
- ADR-only text remains advisory unless paired with deterministic enforcement.

Verification expectation:

- Pair ADR changes with a deterministic rule change when the rule is enforceable.
- Run markdown lint and the relevant enforcement command.

### Vitest coverage and test execution

Files:

- `tools/dev-workflow-v2/vitest.config.mts`
- package-level Vitest configs
- project `test` targets inferred by Nx/Vitest

What it currently enforces:

- `tools/dev-workflow-v2` coverage includes `src/**/*.ts`.
- Excludes specs, test fixtures, shell, and `src/features/workflow/infra/external-clients/git/**`.
- Requires 100% lines, statements, functions, and branches.
- Test execution is part of `pnpm run verify`, Nx affected CI, and package test targets.

Configuration mechanics:

- Coverage include/exclude patterns determine which production files are measured.
- Behavior tests provide deterministic proof beyond coverage percentages.
- Coverage excludes create unmeasured production surfaces.
- Custom lint rules are usually verified by rule tests rather than coverage-only checks.

Verification commands:

- Dev workflow package: `pnpm exec nx test dev-workflow-v2`
- Affected tests: `pnpm exec nx affected -t test --verbose`
- Full tests: `pnpm test`

### CodeRabbit configuration and knowledge base

Files:

- `.coderabbit.yaml`
- `docs/conventions/software-design.md`
- `docs/conventions/anti-patterns.md`
- `docs/conventions/testing.md`
- `docs/conventions/standard-patterns.md`
- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `docs/architecture/overview.md`
- `docs/workflow/code-review.md`

What it currently enforces:

- Review profile is assertive.
- Request-changes workflow is enabled.
- Linked issue assessment is enabled.
- Sequence diagrams are enabled.
- Auto-review is enabled.
- Pre-merge issue assessment is an error.
- Docstring pre-merge check is off.
- Tools enabled:
  - gitleaks
  - semgrep
  - actionlint
- Knowledge-base guidance includes software design, anti-patterns, testing, standard patterns, ADR-002, architecture overview, and code review workflow docs.

Configuration mechanics:

- `.coderabbit.yaml` controls CodeRabbit review behavior and enabled external tools.
- Knowledge-base documents provide review context to CodeRabbit.
- Stable convention rule IDs make review guidance citeable.
- `docs/conventions/review-feedback-checks.md` is also consumed locally by `bug-scanner`.

Verification expectation:

- Markdown lint for docs changes.
- If the rule is added to `review-feedback-checks.md`, confirm `bug-scanner` already reads that file.

### Dev-workflow command and state machine

Files:

- `tools/dev-workflow-v2/commands/*.md`
- `tools/dev-workflow-v2/states/*.md`
- `tools/dev-workflow-v2/src/features/workflow/domain/workflow.ts`
- `tools/dev-workflow-v2/src/features/workflow/domain/states/*.ts`
- `tools/dev-workflow-v2/src/features/workflow/domain/registry.ts`
- `tools/dev-workflow-v2/src/features/workflow/entrypoint/workflow-cli.ts`
- `tools/dev-workflow-v2/src/features/workflow/infra/persistence/workflow-definition.ts`
- `tools/dev-workflow-v2/src/shell/opencode-plugin.ts`
- `tools/dev-workflow-v2/.claude-plugin/plugin.json`

What it currently enforces:

- Commands:
  - `choose-next-task` selects work from available tracks and asks before assignment
  - `start-implementation` sets branch context, reads the issue, initializes workflow state, and records the issue
  - `workflow` routes state-machine operations through the TypeScript CLI
  - `optimize-factory` designs factory guardrail issues from `[FACTORY]` feedback
- State machine:
  - implementation moves to review
  - review must pass architecture-review, code-review, and bug-scanner before PR submission
  - PR submission records the PR
  - CI failure returns to implementation
  - PR feedback routes to reflecting or addressing feedback
  - blocked state exists for explicit stops
- Workflow CLI operations:
  - records issue, branch, review verdicts, PR, CI result, and feedback verification
  - exposes pre-tool-use policy through `PRE_TOOL_USE_POLICY`
- OpenCode integration:
  - `opencode-plugin.ts` registers review subagents from Claude agent files
  - command template remaps `/dev-workflow-v2:workflow` to the OpenCode workflow tool
- Plugin cache rule:
  - changing commands, agents, skills, hooks, or plugin metadata requires a patch bump in `tools/dev-workflow-v2/.claude-plugin/plugin.json`

Configuration mechanics:

- Command markdown controls workflow instructions.
- State markdown controls state-specific instructions.
- TypeScript state-machine code mechanically blocks, records, or transitions workflow behavior.
- Hooks prevent selected tool actions before execution.
- `opencode-plugin.ts` controls OpenCode registration and command behavior.
- Workflow tests live under `tools/dev-workflow-v2/src/features/workflow/**`.

Verification commands:

- `pnpm exec nx test dev-workflow-v2`
- `pnpm exec nx typecheck dev-workflow-v2`
- `pnpm exec nx lint dev-workflow-v2`
- `pnpm run verify`

### Review agents and semantic review checks

Files:

- `tools/dev-workflow-v2/agents/architecture-review.md`
- `tools/dev-workflow-v2/agents/code-review.md`
- `tools/dev-workflow-v2/agents/bug-scanner.md`
- `tools/dev-workflow-v2/agents/task-check.md`
- `docs/conventions/software-design.md`
- `docs/conventions/standard-patterns.md`
- `docs/conventions/anti-patterns.md`
- `docs/conventions/testing.md`
- `docs/conventions/review-feedback-checks.md`

What the agents currently do:

- `architecture-review`:
  - enforces separation of concerns, architecture overview, and ADR-002
  - skips tests
  - writes a full audit report
  - returns `{"verdict":"PASS"}` or `{"verdict":"FAIL"}`
  - audits every reviewed production file against every architecture rule
- `code-review`:
  - reads software design, standard patterns, anti-patterns, testing conventions, and ESLint config
  - rejects design and testing violations
  - must not suggest patterns banned by ESLint
  - writes a full audit report with findings, audit trail, and summary
- `bug-scanner`:
  - checks anti-patterns and `docs/conventions/review-feedback-checks.md`
  - scans for silent errors, type assertions, async errors, dangerous fallbacks, race conditions, logic errors, framework misuse, dangerous config changes, security issues, inconsistent patterns, and learned RFC checks
- `task-check`:
  - extracts task acceptance criteria
  - reads referenced PRD sections
  - verifies edge cases by literal scenario matching
  - checks brand consistency for UI work
  - verifies wiring behavior, not just structure

Configuration mechanics:

- Agent instructions provide semantic review checks.
- `docs/conventions/review-feedback-checks.md` stores learned PR review patterns consumed by `bug-scanner`.
- Convention rule IDs provide stable references for review agents.
- `architecture-review.md` handles responsibility checks that are not encoded in role/dependency rules.

Verification expectation:

- Agent prompt changes are verified through markdown lint and by running the workflow review path when practical.
- Deterministic tests are required for TypeScript workflow changes.
- Plugin patch version bump is required for agent changes.

### Convention documents as last-resort memory

Files:

- `docs/conventions/software-design.md`
- `docs/conventions/standard-patterns.md`
- `docs/conventions/anti-patterns.md`
- `docs/conventions/testing.md`
- `docs/conventions/review-feedback-checks.md`

Current rule sets:

- Software design:
  - fail-fast over silent fallbacks
  - no `any` and no `as`
  - illegal states unrepresentable
  - inject dependencies
  - intention-revealing names
  - no implementation comments
  - Zod for runtime validation
  - object calisthenics and feature-envy checks
- Standard patterns:
  - Zod branded types
  - discriminated unions for mixed return types
  - role annotations in enforced packages
- Anti-patterns:
  - no quality sacrifice for file limits
  - do not change assertions blindly when tests fail
  - empty-string parameter smell
  - no cross-package test fixture exports
  - justified coverage ignores only
  - use `jq` for JSON construction in shell
  - consistent patterns across related functions
- Testing:
  - test names describe outcomes
  - assertions match test titles
  - assert specific values
  - one concept per test
  - bug clusters imply related edge-case tests
  - edge-case checklists by input type
- Review feedback checks:
  - learned rules from prior PR feedback, consumed by `bug-scanner`

Configuration mechanics:

- Convention rules store advisory guidance when deterministic enforcement is not available.
- `review-feedback-checks.md` stores patterns learned from review comments.
- Stable IDs allow review agents to cite durable conventions.

Verification expectation:

- Markdown lint.
- If a review agent consumes the convention, state which agent and which instruction already loads the file.

### CodeRabbit, SonarCloud, and external scanners

Files:

- `.coderabbit.yaml`
- `.github/workflows/ci.yml`

Current mechanics:

- CodeRabbit is assertive, auto-reviews PRs, requests changes, assesses linked issues, and runs gitleaks, semgrep, and actionlint.
- CodeRabbit knowledge base is populated from convention, architecture, and workflow docs.
- CI runs SonarCloud with `sonar.qualitygate.wait=true`.

Configuration mechanics:

- CodeRabbit configuration controls enabled external review tools and knowledge-base paths.
- SonarCloud provides an external static-analysis quality gate.
- Repository-local deterministic enforcement remains the local source of truth.

Verification expectation:

- Repository-side config can be linted or reviewed.
- External setting changes may not be locally verifiable; repository-side config remains the only local source of truth.
