# PRD: riviere-role-enforcement

**Status:** Draft

**Depends on:** Existing repository architecture conventions, ESLint rules, dependency-cruiser rules, and architecture review workflow

---

## 1. Problem

This repository already has meaningful architectural conventions, but enforcement is fragmented.

Today we enforce some structure through:

- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `.dependency-cruiser.mjs`
- `eslint.config.mjs`
- targeted convention enforcement in `packages/riviere-extract-conventions`

That is not enough.

AI agents and humans still regularly:

- put code in the wrong layer
- misuse `infra/`
- create classes with mixed responsibilities
- create public APIs whose location, method shape, and intent do not match their role

We need a capability that makes the right architectural decision obvious and the wrong one difficult.

The core requirement is:

Every class or top-level function in this codebase must have exactly one explicitly declared role.

Roles are repository-defined. There are no built-in canonical kinds in the enforcement model. The role name is the role.

Initial examples of repository-specific roles:

- `cli-args-parser`
- `cli-output-formatter`
- `cli-error-presenter`
- `git-changed-files-reader`
- `graph-loader`
- additional future roles as needed

Part of this project is identifying the full role inventory required for this repository and explicitly discussing anything that is not yet clear.

This capability exists to make AI agents place code correctly, especially in areas like `infra/`, where generic placement causes architectural drift.

The target end state is a PR where role enforcement is applied with 100% coverage across the final agreed in-scope repository code for this branch and all in-scope code belongs to a role.

For this branch, the final enforcement scope is:

- included roots: `packages/riviere-cli/src/**`, `packages/riviere-builder/src/**`, `packages/riviere-extract-config/src/**`, `packages/riviere-extract-ts/src/**`, `packages/riviere-query/src/**`, `packages/riviere-role-enforcement/src/**`, `tools/dev-workflow/src/**`, `tools/dev-workflow-v2/src/**`
- excluded roots: `packages/riviere-schema/src/**`, `packages/riviere-extract-conventions/src/**`, `apps/eclair/**`
- excluded file classes: `*.spec.*`, `__fixtures__/**`, `fixtures/**`, snapshot files, generated outputs, and barrel-only files such as `index.ts` that declare no target symbols

For rollout practicality, enforcement may begin with a narrower phase 1 scope. If so, that scope must be stated explicitly in the implementation plan rather than treated as an implicit exclusion.

---

## 2. Design Principles

### 2.1 Deterministic First, AI Second

Deterministic enforcement is the source of truth for:

- role coverage
- role uniqueness
- allowed location
- naming rules
- allowed public methods on a class, static method target, or standalone function assigned to that role

AI review is additive. It may detect semantic mismatches that static rules cannot prove, but it must never override deterministic failures.

### 2.2 Authoritative Classification And Exactly One Role

Every in-scope target must have exactly one explicit role assignment.

This is a critical requirement.

- a target does not discover its role by passing matcher rules
- a target declares its role explicitly
- role rules then validate whether that explicit assignment is valid

Deterministic enforcement must therefore distinguish between:

- missing explicit role assignment
- unknown explicit role assignment
- explicit role assignment that violates location rules
- explicit role assignment that violates naming rules
- explicit role assignment that violates allowed public methods

Valid state:

- exactly one explicit role assignment exists for the target
- that assigned role exists in the repository role catalog
- the assigned role validates successfully

### 2.3 Simplicity And Minimalism

This capability must start with the minimum rule surface needed to solve the problem.

It must avoid re-solving problems already handled by:

- ESLint
- dependency-cruiser
- TypeScript
- existing architecture review workflows

The initial implementation should focus only on:

- role coverage
- role naming
- allowed location
- allowed public methods on a class, static method target, or standalone function assigned to that role
- markdown guidance for AI review

Any new rule beyond those must be justified by a concrete repository need.

### 2.4 Fail Fast

Violations must report:

- file path
- symbol name
- assigned role or candidate roles
- violated constraint
- suggested fix

### 2.5 Repository-Specific Rules Matter

This repository already distinguishes shell wiring, entrypoints, commands, queries, and multiple forms of infrastructure. The role system must model those distinctions explicitly rather than forcing everything into generic buckets.

The top-level architectural classification is mandatory. Everything must first belong to one of:

- `shell`
- `entrypoint`
- `command`
- `query`
- `domain`
- `infra`

Only after that may a role narrow into a more specific specialization or subfolder.

### 2.6 Prefer Classes

The intended model is:

- every class must have exactly one explicit class-level role
- every standalone function must have exactly one explicit role
- every static method must have exactly one explicit role
- instance methods do not receive separate role assignments; they are constrained by the owning class role

A class with static methods is not exempt from class-level classification. The class itself still needs a role, and each static method also needs its own explicit role assignment.

We should prefer classes where possible because the model is simpler and easier for AI agents to follow.

### 2.7 Fast Enough For Constant Use

Deterministic enforcement must be fast enough to run:

- locally on changed files
- in CI on the full repository
- as part of architecture review on every PR

---

## 3. What We're Building

### 3.1 New Package

Create a new package:

`packages/riviere-role-enforcement`

This package provides:

- the role definition DSL schema
- the deterministic validation engine
- AI review guidance assets
- report types and output formatting

This is a standalone package in `packages/`, not an app and not a `tools/` plugin.

### 3.2 In-Scope Targets

The system validates these code targets:

- class declarations
- static methods
- standalone functions

The intended model is:

- one class = one class-level role
- standalone functions must have a role if they are in scope
- static methods must have a role if they are in scope
- instance methods are validated through the owning class role rather than as separate targets

### 3.3 Minimal Role Definition DSL And Explicit Role Assignment

We need two separate concepts:

- a role definition DSL that defines the repository role taxonomy
- an explicit role assignment model that tells the checker which role a class, static method, or standalone function actually has

The role definition DSL must stay simple.

Each role definition must support only the minimum required fields:

- `name`
- `targets`
- `allowedLocation`
- `nameMatches` or `allowedNames`
- `allowedPublicMethods` for class roles
- `markdownSpec`

Role definition example:

```yaml
roles:
  - name: cli-output-formatter
    targets: [class]
    allowedLocation:
      - 'packages/*/src/features/*/entrypoint/**/*.ts'
      - 'tools/*/src/entrypoint/**/*.ts'
    nameMatches: '.*(Formatter|Output)$'
    allowedPublicMethods: [format]
    markdownSpec: 'docs/roles/cli-output-formatter.md'
```

When the allowed symbol names are finite and important for diagnostics, prefer explicit `allowedNames` over a regex.

```yaml
roles:
  - name: cli-shell
    targets: [function]
    allowedLocation:
      - 'packages/*/src/shell/**/*.ts'
      - 'tools/*/src/shell/**/*.ts'
    allowedNames: [createProgram, main]
    markdownSpec: 'docs/roles/cli-shell.md'
```

Explicit role assignment is mandatory.

Recommended default for the first implementation and spike fix:

- use an inline symbol annotation as the authoritative assignment source
- example syntax:

```ts
/** @riviere-role cli-shell */
export function createProgram(): string {
  return 'ok'
}
```

```ts
/** @riviere-role query-facade */
export class OrdersQuery {
  components(): string[] {
    return []
  }
}
```

Important requirements:

- the assignment source of truth must be explicit
- the enforcement engine must read that assignment first
- `allowedLocation`, `nameMatches`, `allowedNames`, and `allowedPublicMethods` validate the assigned role
- those rule fields must not be used as the primary mechanism for inferring the role

### 3.4 Initial Deterministic Constraints

Initial deterministic constraints are intentionally minimal and validate an explicitly assigned role:

- explicit role assignment exists
- assigned role name exists in the catalog
- target type is allowed for the assigned role
- assigned role lives in an allowed location
- assigned role satisfies naming rules
- assigned role satisfies allowed public methods

`allowedLocation` must express the mandatory top-level architecture first. A role cannot bypass the repository's vertical-slice and layer model with vague folders such as `src/**/cli/**`.

This capability should not absorb generic dependency, complexity, inheritance, or import-boundary enforcement that is already handled elsewhere.

### 3.5 Config Files

Add:

- `riviere-role-enforcement.schema.json`
- `riviere-role-enforcement.yaml`

The repository config defines:

- role definitions
- ignore patterns
- scoped overrides for `packages/`, `apps/`, and `tools/`
- unresolved or temporary exceptions, if truly needed during rollout

The repository config does not assign roles to symbols. Role assignment must come from the explicit assignment model defined in `3.3 Minimal Role Definition DSL And Explicit Role Assignment`.

### 3.6 Deterministic Engine

The deterministic engine will:

- parse TypeScript source files
- enumerate in-scope targets
- read the explicit role assignment for each target
- resolve the assigned role definition from the repository role catalog
- verify the minimal deterministic constraints against the assigned role
- emit structured violations

The deterministic engine must not infer the final role from `allowedLocation`, `nameMatches`, or similar rule fields. Those fields validate an explicit assignment; they do not authoritatively decide it.

Violation output should support a self-correcting feedback loop for AI agents. When possible, an error message should explicitly instruct the calling Claude agent to run `riviere-role-classifier` before attempting a fix.

Example error messages:

```text
Role enforcement error: missing explicit role assignment

File: packages/riviere-cli/src/platform/infra/cli/global-error-handler.ts
Symbol: GlobalErrorHandler
Why: This class declares no explicit role.
Next step for Claude: run `riviere-role-classifier` with this file and the requested change before editing.
Expected classifier output: explicit role assignment, top-level layer, allowed destination path, markdownSpec, rationale.
```

```text
Role enforcement error: unknown explicit role assignment

File: packages/foo/src/features/extract/entrypoint/render-output.ts
Symbol: RenderOutput
Assigned role: cli-renderer
Why: No role named `cli-renderer` exists in the repository role catalog.
Next step for Claude: run `riviere-role-classifier` to choose a valid role and update the explicit assignment.
```

```text
Role enforcement error: invalid location for assigned role

File: packages/foo/src/features/extract/infra/render-output.ts
Symbol: RenderOutput
Assigned role: cli-output-formatter
Why: `cli-output-formatter` must live in an allowed `entrypoint` location, not `infra`.
Next step for Claude: run `riviere-role-classifier` to find the correct destination path and markdownSpec before fixing this file.
```

```text
Role enforcement error: invalid name for assigned role

File: packages/foo/src/shell/cli.ts
Symbol: createPrograms
Assigned role: cli-shell
Why: `createPrograms` is not allowed for role `cli-shell`.
Allowed names: createProgram, main.
Next step for Claude: keep role `cli-shell`, rename the symbol to an allowed name, and re-run validation.
```

```text
Role enforcement error: invalid public method shape

File: packages/foo/src/features/extract/entrypoint/cli-output-formatter.ts
Symbol: CliOutputFormatter
Assigned role: cli-output-formatter
Why: Method `printError` is not allowed for role `cli-output-formatter`.
Allowed public methods: format.
Next step for Claude: run `riviere-role-classifier` and re-check the role markdownSpec before changing this class.
```

Implementation direction:

- prefer Oxlint if it can support the full requirement cleanly
- otherwise implement only the minimal custom engine needed
- do not introduce a CLI unless it is necessary

### 3.7 Oxlint Position And Alternatives

Oxlint is the preferred fast lint ecosystem for this capability.

Before implementation begins, engineers must validate the best delivery vehicle.

The main alternatives are:

- native Oxlint configuration or plugin support
- a minimal custom checker using OXC parsing infrastructure
- extending existing ESLint-based enforcement if Oxlint cannot support the needed model yet

Decision criteria:

- supports 100% role coverage for this repository
- supports explicit role assignment rather than matcher-only inference
- keeps rule definitions simple
- is fast enough for constant use
- does not introduce unnecessary new tooling surface

Oxlint remains the preferred option if it can satisfy the requirement without forcing a more complex design.

### 3.8 AI Review Layer

AI review starts simple.

The role definition points to a markdown spec that tells an agent how to review code for that role.

The basic AI workflow is:

- search for relevant files
- read the markdown spec for the role
- inspect the explicitly assigned code target
- write a report describing whether the code really fits the role

AI review can produce:

- `pass`
- `fail`
- `uncertain`

AI review is:

- optional in local development
- required in PR architecture review
- never allowed to suppress deterministic failures

### 3.9 riviere-role-classifier

We also need a dedicated AI helper for authorship, not just review.

When an AI agent is creating or changing code, it needs a reliable way to determine:

- which top-level layer the code belongs to
- which specific role applies
- where files for that role are allowed to live
- which `markdownSpec` defines the criteria

This should be implemented as an explicit specialized subagent named `riviere-role-classifier`.

It should live in `packages/riviere-role-enforcement` but be available for use across the whole repository.

Its job is to:

- inspect the requested change
- search the repository for candidate locations
- read the relevant role definitions and `markdownSpec` files
- return the exact explicit role assignment to add before code is written
- recommend the correct role and target path before code is written
- flag ambiguity when multiple roles appear plausible

The minimal subagent workflow is:

- identify whether the change belongs in `shell`, `entrypoint`, `command`, `query`, `domain`, or `infra`
- narrow to one specific repository role
- locate the allowed destination path for that role
- read the markdown spec for that role
- return clear implementation guidance to the calling agent

Expected outputs:

- explicit role assignment text
- chosen role
- allowed target location
- markdown spec reference
- short rationale
- ambiguity warning if applicable

This subagent is an enablement layer for AI authors. It helps them get placement right before deterministic enforcement runs.

It also enables a self-correcting workflow:

- Claude makes an architecture mistake
- deterministic enforcement fails
- the error message tells Claude to run `riviere-role-classifier`
- `riviere-role-classifier` returns the correct layer, role, location, and markdown spec
- Claude applies the fix and re-runs validation

#### Proposed Output Contract

`riviere-role-classifier` should return a small structured result that is easy for agents to consume.

```yaml
layer: entrypoint
role: cli-output-formatter
assignmentText: '/** @riviere-role cli-output-formatter */'
allowedLocation:
  - packages/riviere-cli/src/features/extract/entrypoint/
markdownSpec: docs/roles/cli-output-formatter.md
rationale:
  - This code formats CLI output for an external interface.
  - It belongs in `entrypoint`, not `infra`, because it translates internal results into user-facing output.
ambiguity:
  status: clear
  alternatives: []
nextAction: Create or move the code into the allowed location and ensure it matches the markdown spec.
```

If the result is ambiguous, the contract should make that explicit.

```yaml
layer: entrypoint
role: null
assignmentText: null
allowedLocation: []
markdownSpec: null
rationale:
  - This code appears to parse CLI input, but it may also be shell wiring.
ambiguity:
  status: ambiguous
  alternatives:
    - cli-args-parser
    - cli-entrypoint
nextAction: Do not write code yet. Review both candidate roles and resolve the ambiguity first.
```

#### Example Prompt And Response

Example prompt:

```text
You are `riviere-role-classifier`.

Requested change:
- Add code that parses CLI arguments for the extract command and converts them into the internal input expected by the extract flow.

Tasks:
1. Determine the correct top-level layer.
2. Determine the correct repository role.
3. Identify the allowed destination path.
4. Read the relevant markdown spec.
5. Return the structured classifier result.
```

Example response:

```yaml
layer: entrypoint
role: cli-args-parser
assignmentText: '/** @riviere-role cli-args-parser */'
allowedLocation:
  - packages/riviere-cli/src/features/extract/entrypoint/
markdownSpec: docs/roles/cli-args-parser.md
rationale:
  - Parsing CLI arguments is external input translation.
  - External input translation belongs in `entrypoint`.
  - This is not `shell` because it does not just wire commands together at startup.
ambiguity:
  status: clear
  alternatives: []
nextAction: Add the parser in the allowed entrypoint location and keep it focused on input translation.
```

### 3.10 Repository Rollout

This capability will be applied to this entire codebase:

- `packages/`
- `apps/`
- `tools/`

Temporary exceptions are allowed only during rollout to reach the target end state. If they exist, they must be:

- explicit
- temporary
- documented with removal intent

---

## 4. What We're NOT Building

| Exclusion                                         | Rationale                                                  |
| ------------------------------------------------- | ---------------------------------------------------------- |
| Automatic code movement                           | Too risky and out of scope                                 |
| Runtime tracing                                   | Static enforcement only                                    |
| Non-TypeScript language support in v1             | Initial scope is this repository                           |
| AI-only role classification                       | Not reliable enough for gating                             |
| Full replacement for ESLint or dependency-cruiser | Existing tools remain in place                             |
| New CLI surface unless necessary                  | Prefer existing tooling if Oxlint can support the workflow |

---

## 5. Success Criteria

| #   | Criterion                                                                                                                                                                                                                                                | Verification                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Every in-scope class, static method, and standalone function has exactly one explicit role assignment or produces a deterministic error                                                                                                                  | Integration test fixtures plus repository smoke test                                           |
| 2   | Deterministic enforcement validates the assigned role against only the minimal role rules: location, naming, target type, and public methods                                                                                                             | Unit tests with 100% branch coverage                                                           |
| 3   | No symbol passes purely because it happened to match path and naming rules without an explicit assignment                                                                                                                                                | Negative fixture coverage for matcher-only cases                                               |
| 4   | The repository has an explicit role inventory covering ambiguous infra areas as well as standard locations                                                                                                                                               | Repository role catalog reviewed and committed                                                 |
| 5   | Fine-grained infra roles are supported                                                                                                                                                                                                                   | Fixtures for CLI presentation, git, graph persistence, config loading, and similar infra cases |
| 6   | Diagnostics distinguish missing assignment, unknown assignment, invalid location, invalid name, and invalid public method shape                                                                                                                          | Golden-path diagnostic tests                                                                   |
| 7   | AI review consumes markdown role specs and emits structured verdicts                                                                                                                                                                                     | Integration tests with mocked AI client                                                        |
| 8   | Architecture review workflow can invoke role enforcement on PRs                                                                                                                                                                                          | Workflow integration test or documented workflow update verified in tests                      |
| 9   | Full-repo enforcement is fast enough for constant use                                                                                                                                                                                                    | Benchmarks recorded in docs                                                                    |
| 10  | Package ships with 100% code coverage and does not introduce new lint, typecheck, or dependency-cruiser violations                                                                                                                                       | Coverage threshold enforced in package config and repository `verify` passes                   |
| 11  | A final rollout PR applies role enforcement with 100% coverage across `packages/riviere-cli/src/**`, `packages/riviere-builder/src/**`, `packages/riviere-extract-config/src/**`, `packages/riviere-extract-ts/src/**`, `packages/riviere-query/src/**`, `packages/riviere-role-enforcement/src/**`, `tools/dev-workflow/src/**`, and `tools/dev-workflow-v2/src/**`, excluding `packages/riviere-schema/src/**`, `packages/riviere-extract-conventions/src/**`, and `apps/eclair/**` | Final adoption PR passes repository verification                                               |

Initial performance targets:

- changed-files check: <= 2s on typical PR-sized diffs
- full repository deterministic scan: <= 15s on a standard developer machine

If these targets are missed, the feature is not ready for default PR gating.

---

## 6. Open Questions

1. **Role inventory discovery**
   - What is the most useful output format for the initial repository-wide role inventory and ambiguity review?
   - This must be resolved early because the enforcement is only as good as the role catalog.

2. **Shell coverage**
   - Should `shell/` code participate in role enforcement, or continue to rely only on existing structure rules?
   - Recommended default: include `shell/` with dedicated role definitions where needed.

3. **Oxlint feasibility**
   - Can Oxlint support the minimal role model directly, or do we need a minimal custom layer?
   - This requires a technical spike before implementation starts.

4. **Explicit assignment source**
   - Is inline source annotation the correct long-term authoritative assignment model, or only the default for the first implementation?
   - Recommended default: inline source annotation for the spike and initial implementation.

---

## 7. Milestones

### M1: Discovery And Minimal DSL

The repository role model is identified and the minimal DSL is finalized.

#### Deliverables

- **D1.1:** Repository role inventory
  - Identify all roles required for 100% repository coverage
  - Document unclear or ambiguous cases for decision
  - Verification: reviewed role catalog committed in the repository

- **D1.2:** Minimal role DSL schema
  - Define config schema and TypeScript types
  - Support role definitions, ignores, markdown spec references, and the explicit role assignment model
  - Verification: schema validation tests

- **D1.3:** Oxlint feasibility spike
  - Validate whether Oxlint can support the required enforcement cleanly
  - Compare Oxlint with minimal custom-engine fallback
  - Verify that the spike supports explicit role assignment rather than matcher-only inference
  - Verification: documented implementation recommendation

### M2: Deterministic Enforcement

The minimal deterministic enforcement works end-to-end.

#### Deliverables

- **D2.1:** Target enumeration
  - Enumerate classes, in-scope static methods, and in-scope standalone functions
  - Parse explicit role assignment for each target
  - Verification: parser and extraction tests

- **D2.2:** Explicit role assignment validation
  - Enforce missing assignment and unknown assignment failures
  - Verification: assignment validation tests

- **D2.3:** Minimal constraint engine
  - Implement target type, allowed location, naming, and allowed public method checks against the assigned role
  - Verification: rule engine tests with 100% branch coverage and explicit assignment fixtures

- **D2.4:** Structured diagnostics
  - Human-readable and machine-consumable output
  - Error messages should tell AI agents when to run `riviere-role-classifier`
  - Error messages should identify the assigned role and the violated rule when an assignment exists
  - Verification: output snapshot and integration tests

- **D2.5:** Performance instrumentation
  - Measure parse, match, validate, and report phases
  - Verification: benchmark output exists and is documented

### M3: Repository Bootstrap

The repository has an initial role catalog and can be validated against it.

#### Deliverables

- **D3.1:** Initial repository config
  - Encode the reviewed role inventory into the role enforcement config
  - Define how explicit role assignments are introduced during bootstrap
  - Verification: config exists and validates

- **D3.2:** Initial markdown guidance files
  - Add role guidance under `docs/roles/`
  - Verification: every role with AI guidance references an existing markdown file

- **D3.3:** Repository baseline adoption
  - Bring the current codebase to a passing state or establish explicit temporary exceptions
  - Add explicit role assignments for all in-scope symbols in the chosen rollout scope
  - Verification: repository scan passes or only documented exceptions remain

### M4: AI Review And Workflow

AI review and PR workflow integration exist for the final enforcement model.

#### Deliverables

- **D4.1:** AI prompt contract
  - Define how a review agent finds files, reads markdown specs, applies the role rules, and writes a report
  - Verification: contract tests

- **D4.2:** Repository workflow integration
  - Add role enforcement to the repository workflow using the selected enforcement mechanism
  - Verification: runnable in CI and local development

- **D4.3:** PR-facing output
  - Produce errors suitable for review agents and GitHub annotation workflows
  - Verification: output contract tests

### M5: Final Rollout

The repository reaches full enforcement coverage.

#### Deliverables

- **D5.1:** Final architecture review integration
  - Integrate role semantic review into PR architecture review workflow
  - Verification: workflow documentation and integration behavior updated

- **D5.2:** Final adoption PR
  - Apply role enforcement across the final agreed branch scope
  - Verification: 100% coverage with no unresolved in-scope code outside a role

- **D5.3:** Documentation
  - Role DSL reference
  - Repository role catalog guide
  - Guide for AI agents on choosing where code goes
  - Performance baseline documentation

---

## 8. Parallelization

```yaml
tracks:
  - id: A
    name: Discovery
    deliverables: [D1.1, D1.2, D1.3]
  - id: B
    name: Deterministic Enforcement
    deliverables: [D2.1, D2.2, D2.3, D2.4, D2.5]
  - id: C
    name: Repo Bootstrap
    deliverables: [D3.1, D3.2, D3.3]
  - id: D
    name: AI Review And Workflow
    deliverables: [D4.1, D4.2, D4.3]
  - id: E
    name: Final Rollout
    deliverables: [D5.1, D5.2, D5.3]
```

**Dependencies between tracks:**

- Track B depends on Track A
- Track C depends on Tracks A and B
- Track D depends on Tracks A, B, and C
- Track E depends on all prior tracks

---

## 9. Architecture

### 9.1 Package Structure

Use the repository's standard layered package structure:

```text
packages/riviere-role-enforcement/src/
├── features/
│   ├── check/
│   │   ├── entrypoint/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── domain/
│   │   └── infra/
│   └── ai-review/
│       ├── entrypoint/
│       ├── commands/
│       ├── queries/
│       ├── domain/
│       └── infra/
├── platform/
│   ├── domain/
│   └── infra/
└── shell/
```

### 9.2 Core Domain Concepts

- `RoleDefinition`
- `RoleAssignment`
- `TargetSymbol`
- `RoleMatch`
- `RoleViolation`
- `CheckReport`
- `AiReviewVerdict`

### 9.3 Key Architectural Decisions

- Deterministic validation is the primary checker.
- AI review is a separate feature, not embedded in deterministic validation.
- The initial rule model stays intentionally minimal.
- Explicit role assignment is the source of truth.
- Role definitions reference markdown guidance files for human and AI interpretation.
- The enforcement mechanism should be Oxlint if feasible, otherwise the smallest possible fallback.

### 9.4 Integration Points

- repository scripts or Nx targets
- PR architecture review workflow in `tools/dev-workflow-v2`
- optional PR review bot instructions
- docs under `docs/roles/` and `docs/guides/`

---

## 10. Initial Role Catalog For This Repository

The first repository bootstrap should include roles such as:

- `feature-entrypoint`
- `cli-entrypoint`
- `command-orchestrator`
- `query-reader`
- `entity`
- `repository`
- `api-client`
- `cli-args-parser`
- `cli-output-formatter`
- `cli-error-presenter`
- `git-changed-files-reader`
- `graph-loader`
- `config-loader`
- `workflow-state-reader`
- `workflow-state-writer`

This list is illustrative, not complete. A core deliverable of the project is identifying the full role inventory required for 100% repository coverage.

This section defines the role taxonomy only. It does not assign roles to concrete symbols. Concrete classes, static methods, and standalone functions still need explicit role assignments.

---

## 11. Example Violations

- `packages/foo/src/features/bar/commands/do-thing.ts` has no explicit role assignment
- `packages/foo/src/shell/cli.ts` assigns role `cli-shell`, but the symbol name is `createPrograms` instead of an allowed name such as `createProgram` or `main`
- `tools/dev-workflow-v2/src/entrypoint/workflow-cli.ts` assigns a role whose allowed public methods do not include one of its current methods
- `packages/foo/src/features/extract/infra/render-output.ts` assigns role `cli-output-formatter`, but that role is only allowed in `entrypoint/`
- `packages/foo/src/features/extract/entrypoint/render-output.ts` assigns role `cli-renderer`, but no such role exists in the repository role catalog

---

## 12. Dependencies

This capability depends on the repository's existing structural and review conventions:

- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
- `.dependency-cruiser.mjs`
- `eslint.config.mjs`
- `tools/dev-workflow-v2/states/reviewing.md`

It should be designed to coexist with them rather than replace them.

---

## 13. Research References

- [Oxlint / OXC Linter Usage](https://oxc.rs/docs/guide/usage/linter.html)
- Existing repository architecture and lint enforcement files listed in section 12

---

## 14. Terminology

| Term                        | Definition                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Role Definition**         | A named rule set describing where code may live, how it should be named, what public methods it may expose, and which markdown spec governs AI review |
| **Role Assignment**         | The explicit declaration that a class, static method, or standalone function has a specific repository role                                           |
| **Target Symbol**           | A class, static method, or standalone function checked by the engine                                                                                  |
| **Role Match**              | The role definition resolved from the target's explicit role assignment                                                                               |
| **Deterministic Violation** | A role failure proven by static analysis                                                                                                              |
| **Markdown Spec**           | Markdown guidance used by AI review for semantic validation beyond deterministic checks                                                               |

---

## 15. Delivery Plan

### Phase 1 - Completed Discovery And Explicit-Assignment Spike

1. Role taxonomy and rollout PRD
   - Status: done
   - Outputs: `docs/project/PRD/notstarted/PRD-riviere-role-enforcement.md`
   - Acceptance: the PRD defines the explicit-classification model, mandatory top-level layers, minimal deterministic rules, AI repair loop, and final rollout target
   - References: `1. Problem`, `2. Design Principles`, `3. What We're Building`, `5. Success Criteria`

2. Repository role inventory and ambiguity review
   - Status: done
   - Outputs: `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-role-inventory.md`
   - Acceptance: a repository role inventory exists, covers the mandatory top-level layers, documents phase-1 scope thinking, and records the highest-value ambiguities
   - References: `2.5 Repository-Specific Rules Matter`, `6. Open Questions`, `10. Initial Role Catalog For This Repository`

3. Oxlint feasibility assessment
   - Status: done
   - Outputs: `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-oxlint-feasibility-report.md`
   - Acceptance: the team has a written recommendation on Oxlint as the preferred path and OXC-based checking as the fallback
   - References: `3.7 Oxlint Position And Alternatives`, `7. Milestones`

4. Explicit-assignment spike package
   - Status: done
   - Outputs: `packages/riviere-role-enforcement/src/**/*`, `packages/riviere-role-enforcement/fixtures/oxlint-spike/**/*`
   - Acceptance: the spike reads explicit `@riviere-role` assignments, validates assigned roles against location, name, and public-method rules, and fails when assignment is missing or unknown
   - References: `2.2 Authoritative Classification And Exactly One Role`, `3.3 Minimal Role Definition DSL And Explicit Role Assignment`, `3.4 Initial Deterministic Constraints`, `3.6 Deterministic Engine`

5. Classifier contract scaffold
   - Status: done
   - Outputs: `packages/riviere-role-enforcement/src/features/classify/domain/role-classifier-result.ts`
   - Acceptance: the package can already produce `assignmentText`, role metadata, and next-action guidance for a known role
   - References: `3.9 riviere-role-classifier`

6. Focused spike validation
   - Status: done
   - Outputs: package tests, build target, and spike command
   - Acceptance: the spike package builds, focused tests pass, and the Oxlint spike runs cleanly on the fixture project
   - References: `5. Success Criteria`, `7. Milestones`

### Phase 2 - Finish The Product And Roll It Out Across The Repository

Engineer working rule for every Phase 2 chunk:

- complete one chunk at a time
- after each chunk, create a small commit with `git commit --no-verify`
- push after every commit to `origin/architecture-rbaf`
- keep the PR in draft until the repository rollout is stable enough for broader review

Suggested command pattern after each chunk:

```bash
git add <relevant-files> && git commit --no-verify -m "<commit message>" && git push origin architecture-rbaf
```

- [x] Consolidate the current explicit-assignment spike into a clean checkpoint
  - Requirements: stage the current spike + docs changes, make the package worktree clean, and ensure the current explicit-assignment implementation is the stable base for Phase 2
  - Acceptance: `packages/riviere-role-enforcement` tests pass, the spike command passes, and all current local changes are committed and pushed as one coherent baseline
  - Suggested commit: `feat(role-enforcement): finalize explicit-assignment spike`
  - References: `3.3 Minimal Role Definition DSL And Explicit Role Assignment`, `3.6 Deterministic Engine`, `5. Success Criteria`

- [x] Finish diagnostics parity for explicit assignment
  - Requirements: ensure every deterministic violation uses the explicit-assignment model, includes the assigned role when present, and suggests `riviere-role-classifier` where appropriate
  - Acceptance: golden tests cover `missing-role-assignment`, `unknown-role-assignment`, `invalid-role-target-kind`, `invalid-role-location`, `invalid-role-name`, and `disallowed-public-methods`
  - Suggested commit: `feat(role-enforcement): finalize explicit diagnostics`
  - References: `2.4 Fail Fast`, `3.6 Deterministic Engine`, `5. Success Criteria`

- [x] Turn `riviere-role-classifier` into a real classification flow
  - Requirements: add an actual classify flow that reads the role config, resolves clear vs ambiguous results, and returns `assignmentText`, role, allowed location, markdown spec, rationale, and next action
  - Acceptance: tests prove a clear result, an ambiguous result, and an unknown-role result; the helper is usable by other agents, not just a static result builder
  - Suggested commit: `feat(role-enforcement): implement role classifier flow`
  - References: `3.9 riviere-role-classifier`, `5. Success Criteria`

- [x] Add markdown specs for the initial role slice
  - Requirements: create the first `docs/roles/*.md` files for the roles already used in the spike and ensure the config references real markdown specs
  - Acceptance: every role in the spike config resolves to an existing markdown spec and the docs explain placement, naming, and allowed public methods
  - Suggested commit: `docs(role-enforcement): add initial role specs`
  - References: `3.3 Minimal Role Definition DSL And Explicit Role Assignment`, `3.8 AI Review Layer`, `10. Initial Role Catalog For This Repository`

- [x] Harden the config and parser edge cases
  - Requirements: tighten config validation, cover malformed annotations, multiple comments, wrong target kinds, and edge cases such as exported variable functions and class parsing behavior
  - Acceptance: invalid config and malformed annotations fail with clear deterministic errors; additional parser/config tests exist for edge cases
  - Suggested commit: `feat(role-enforcement): harden config and annotation parsing`
  - References: `3.3 Minimal Role Definition DSL And Explicit Role Assignment`, `3.4 Initial Deterministic Constraints`, `3.6 Deterministic Engine`

- [x] Add a production-ready execution path beyond the spike command
  - Requirements: introduce the repo-facing command/target that engineers and CI will use for deterministic role enforcement on changed files and full scope
  - Acceptance: a documented repo command exists, runs against the package implementation, and is no longer limited to the spike fixture path
  - Suggested commit: `feat(role-enforcement): add repo execution target`
  - References: `3.6 Deterministic Engine`, `3.7 Oxlint Position And Alternatives`, `5. Success Criteria`

- [x] Roll out the first real repository slice
  - Requirements: choose a narrow but real slice, recommended default: `packages/riviere-cli` shell plus one entrypoint/query slice; define the roles, add explicit assignments, and fix violations until the slice passes
  - Acceptance: the chosen slice passes deterministic enforcement end-to-end and the role inventory is updated if any labels need refinement
  - Suggested commit: `feat(role-enforcement): roll out first repository slice`
  - References: `2.5 Repository-Specific Rules Matter`, `3.10 Repository Rollout`, `10. Initial Role Catalog For This Repository`

- [x] Roll out `packages/riviere-query`
  - Requirements: define the required query roles for `packages/riviere-query`, add explicit assignments, and resolve violations package-by-package rather than broad repo-wide edits
  - Acceptance: `packages/riviere-query` passes deterministic enforcement for its agreed in-scope symbols
  - Suggested commit: `feat(role-enforcement): cover riviere-query`
  - References: `2.5 Repository-Specific Rules Matter`, `3.10 Repository Rollout`, `5. Success Criteria`

- [x] Roll out the remaining `packages/riviere-cli` feature areas
  - Requirements: extend the role catalog and explicit assignments from the first slice to the remaining in-scope builder, extract, and query feature areas in `packages/riviere-cli`
  - Acceptance: the agreed in-scope `packages/riviere-cli` areas pass deterministic enforcement and unresolved exceptions are documented explicitly
  - Suggested commit: `feat(role-enforcement): expand riviere-cli coverage`
  - References: `3.10 Repository Rollout`, `5. Success Criteria`, `10. Initial Role Catalog For This Repository`

- [x] Roll out `tools/dev-workflow-v2`
  - Requirements: define roles for shell, entrypoint, infra, and workflow-specific pieces in `tools/dev-workflow-v2`, then add explicit assignments and resolve violations
  - Acceptance: `tools/dev-workflow-v2` passes deterministic enforcement for the agreed in-scope symbols
  - Suggested commit: `feat(role-enforcement): cover dev-workflow-v2`
  - References: `2.5 Repository-Specific Rules Matter`, `3.10 Repository Rollout`, `5. Success Criteria`

- [x] Integrate deterministic enforcement into architecture review and AI repair workflow
  - Requirements: wire deterministic enforcement into the review workflow, ensure diagnostics instruct Claude to run `riviere-role-classifier`, and connect markdown-spec-based AI review where useful
  - Acceptance: architecture review can execute deterministic checks and the self-correcting feedback loop is documented and testable
  - Suggested commit: `feat(role-enforcement): integrate review workflow`
  - References: `3.6 Deterministic Engine`, `3.8 AI Review Layer`, `3.9 riviere-role-classifier`, `5. Success Criteria`

- [x] Reach full package quality gates and benchmark confidence
  - Requirements: raise the package to 100% coverage, document benchmark results, and ensure the package passes its own lint/build/test expectations without relying on the spike alone
  - Acceptance: package coverage reaches 100%, benchmark output is recorded, and the package is stable enough for broader repo rollout
  - Suggested commit: `test(role-enforcement): complete package quality gates`
  - References: `5. Success Criteria`, `7. Milestones`

- [x] Ship the initial repository rollout slice and keep the PR in draft
  - Requirements: apply explicit assignments and role validation across the initial rollout slice, resolve the slice-specific violations, and record the slice status in the draft PR
  - Acceptance: the initial slice reaches 100% explicit role coverage for the files currently configured in `riviere-role-enforcement.yaml`, repository verification passes for that slice, and the PR remains in draft pending full-branch completion
  - Suggested commit: `feat(role-enforcement): complete initial rollout slice`
  - References: `1. Problem`, `3.10 Repository Rollout`, `5. Success Criteria`, `7. Milestones`
  - Historical status note: this checkpoint completed the explicit-assignment slice that currently covers selected areas of `packages/riviere-cli`, `packages/riviere-query`, and `tools/dev-workflow-v2`. It does not satisfy the final full-branch coverage goal.

### Phase 3 - Complete Full Branch Coverage And Hard-Gate The Repository

Phase 3 is the completion phase for this branch. The engineer must not treat this phase as optional cleanup.

Phase 3 scope lock:

- included roots: `packages/riviere-cli/src/**`, `packages/riviere-builder/src/**`, `packages/riviere-extract-config/src/**`, `packages/riviere-extract-ts/src/**`, `packages/riviere-query/src/**`, `packages/riviere-role-enforcement/src/**`, `tools/dev-workflow/src/**`, `tools/dev-workflow-v2/src/**`
- excluded roots: `packages/riviere-schema/src/**`, `packages/riviere-extract-conventions/src/**`, `apps/eclair/**`
- excluded file classes: `*.spec.*`, `__fixtures__/**`, `fixtures/**`, snapshot files, generated outputs, and barrel-only files such as `index.ts` that declare no target symbols
- mandatory target kinds inside included roots: class declarations, static methods, and standalone functions
- hard-gate rule: if any in-scope target is missing an explicit role assignment, `pnpm role-enforcement:check` must fail with a non-zero exit code
- hard-gate rule: if any in-scope target has an unknown role, invalid location, invalid name, invalid target kind, or disallowed public methods, `pnpm role-enforcement:check` must fail with a non-zero exit code

Engineer working rule for every Phase 3 chunk:

- complete exactly one checklist item at a time, or one tightly coupled pair when a code change and its tests are inseparable
- after each checklist item, run the listed verification commands before committing
- after each green checklist item, create a small commit with `git commit --no-verify`
- push after every commit to `origin/architecture-rbaf`
- if a new role is introduced, the same chunk must update all of: `riviere-role-enforcement.yaml`, the relevant `docs/roles/*.md` file, classifier expectations, and any affected tests
- if a symbol must move, split, rename, or convert from function to class to fit a valid role, perform the structural change in the same chunk rather than weakening the role definition
- keep the PR in draft until every checklist item below is complete and every negative verification drill passes

Engineer start here:

- first read only these three files end-to-end before changing code: `docs/project/PRD/notstarted/PRD-riviere-role-enforcement.md`, `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-role-inventory.md`, and `riviere-role-enforcement.yaml`
- do not start package-by-package annotation rollout until the engine prerequisites are complete: static-method support, non-exported target extraction, repo-scope coverage semantics, negative probe coverage, and the fixed repo command
- do not create broad catch-all roles such as `misc-domain-helper`, `generic-infra-helper`, or `utility`; if the code does not fit a precise role, refactor the code or define a precise role family with a markdown spec
- do not use config omissions as exceptions; if a file is in an included root and has targetable declarations, it must either be enforced or be moved into an explicitly excluded category
- do not mark a package rollout item complete until `pnpm role-enforcement:check` passes with that package included in the final branch scope

Engineer first five commits:

- commit 1: `docs(role-enforcement): freeze phase 3 scope`
  - must complete checklist item `Freeze the final branch scope in documentation and config`
- commit 2: `fix(role-enforcement): restore green baseline`
  - must complete checklist item `Repair the existing red CI baseline before widening coverage`
- commit 3: `feat(role-enforcement): add static method targets`
  - must complete checklist item `Expand the deterministic target model to include static methods as first-class targets`
- commit 4: `feat(role-enforcement): enumerate all in-scope targets`
  - must complete checklist item `Stop limiting target extraction to exported top-level declarations`
- commit 5: `feat(role-enforcement): harden repo scope coverage`
  - must complete checklist item `Replace slice-style include semantics with hard repo-scope coverage semantics`

Required execution order after the first five commits:

- complete the engine-safety sequence before starting mass rollout: `Add explicit negative probes for the exact failure modes the user will test manually` -> `Make the repo-facing command the authoritative enforcement entrypoint` -> `Expand the role catalog and markdown specs for all remaining in-scope architecture areas before annotation rollout`
- only after the engine-safety sequence is green may the engineer begin package coverage work
- package rollout order is mandatory unless a later chunk is blocked by an earlier package refactor: `packages/riviere-role-enforcement` -> remaining `packages/riviere-cli` -> `packages/riviere-builder` -> `packages/riviere-extract-ts` -> `packages/riviere-extract-config` -> `tools/dev-workflow` -> remaining `tools/dev-workflow-v2`
- after the last package rollout chunk, the engineer must complete the final proof sequence in order: scope manifest -> workflow and CI gating -> wrong-role AI repair verification -> sabotage drills -> final repository verification matrix -> PR status update

Definition of complete for each package rollout chunk:

- every in-scope class, static method, and standalone function in that package has exactly one explicit role assignment
- every role used by that package exists in `riviere-role-enforcement.yaml` and has a real markdown spec under `docs/roles/`
- any file that needed movement, renaming, or splitting to fit a single clear role has already been refactored in the same chunk
- `pnpm role-enforcement:check` passes after the package is included in final scope
- any package-specific lint, typecheck, build, or test command touched by the refactor also passes before commit

Suggested command pattern after each chunk:

```bash
git add <relevant-files> && git commit --no-verify -m "<commit message>" && git push origin architecture-rbaf
```

- [ ] Freeze the final branch scope in documentation and config
  - Requirements:
    - update this PRD, the role inventory doc, and `riviere-role-enforcement.yaml` comments or metadata so they all state the same final included roots and excluded roots
    - remove any wording that still describes the current rollout slice as the final state
    - explicitly document that `packages/riviere-extract-config` is in scope for Phase 3
  - Acceptance:
    - no branch-scope ambiguity remains in the docs
    - a new engineer can identify the exact final scope without reading PR comments or chat history
  - Verification:
    - `pnpm exec markdownlint-cli2 "docs/project/PRD/notstarted/PRD-riviere-role-enforcement.md" "docs/project/PRD/notstarted/PRD-riviere-role-enforcement-role-inventory.md"`
  - Suggested commit: `docs(role-enforcement): freeze phase 3 scope`

- [ ] Repair the existing red CI baseline before widening coverage
  - Requirements:
    - fix the `@stylistic/object-curly-newline` failures in the touched `packages/riviere-query` files
    - fix the CI-sensitive fixture path bug in `packages/riviere-role-enforcement/src/features/classify/domain/role-classifier-result.spec.ts`
    - fix `knip`, including the stale path reference in `packages/riviere-role-enforcement/project.json`
    - fix `package.json` so `role-enforcement:check` passes the required config path
  - Acceptance:
    - the branch returns to the same or better green state as before any Phase 3 scope widening
    - no known pre-existing CI failure remains unaddressed
  - Verification:
    - `pnpm exec eslint packages/riviere-query/src/features/querying/queries/*.ts`
    - `pnpm exec vitest run --config packages/riviere-role-enforcement/vite.config.ts`
    - `pnpm nx build riviere-role-enforcement`
    - `pnpm knip`
    - `pnpm role-enforcement:check`
  - Suggested commit: `fix(role-enforcement): restore green baseline`

- [ ] Expand the deterministic target model to include static methods as first-class targets
  - Requirements:
    - add a dedicated target kind for static methods in the config model, checker, diagnostics, and tests
    - include owning class name and method name in the target symbol metadata and error output
    - ensure class-level `allowedPublicMethods` continues to validate instance methods only unless the DSL is explicitly extended otherwise
    - ensure a class with one or more static methods still requires its own class-level role
  - Acceptance:
    - missing static-method role assignments fail deterministically
    - static methods can also fail deterministically for unknown role, invalid role kind, invalid location, invalid name, and any future role-specific constraints
  - Verification:
    - add and run focused tests covering missing and wrong static-method assignments
    - `pnpm exec vitest run --config packages/riviere-role-enforcement/vite.config.ts`
  - Suggested commit: `feat(role-enforcement): add static method targets`

- [ ] Stop limiting target extraction to exported top-level declarations
  - Requirements:
    - enumerate all in-scope class declarations, static methods, and standalone functions regardless of export status
    - retain correct source ranges and comments so role annotations still attach to the right declaration
    - document any intentionally excluded syntax forms and cover them with tests
  - Acceptance:
    - a non-exported in-scope class, static method, or standalone function without a role fails the check
    - extraction does not regress the existing annotated export cases
  - Verification:
    - add fixture coverage for non-exported targets
    - `pnpm exec vitest run --config packages/riviere-role-enforcement/vite.config.ts`
  - Suggested commit: `feat(role-enforcement): enumerate all in-scope targets`

- [ ] Replace slice-style include semantics with hard repo-scope coverage semantics
  - Requirements:
    - remove or neutralize any config behavior that silently ignores source files simply because they are not listed in an include allowlist
    - implement a coverage audit that fails when an included root contains targetable declarations that are outside the effective enforcement scope
    - ensure the branch scope is defined by final included roots plus explicit exclusions, not by a hand-maintained allowlist of happy-path files
  - Acceptance:
    - engineers cannot make the build pass by leaving a source directory out of the config
    - the repo command fails if a new in-scope source file contains an unclassified target
  - Verification:
    - add regression tests for out-of-scope-by-omission failures
    - `pnpm exec vitest run --config packages/riviere-role-enforcement/vite.config.ts`
    - `pnpm role-enforcement:check`
  - Suggested commit: `feat(role-enforcement): harden repo scope coverage`

- [ ] Add explicit negative probes for the exact failure modes the user will test manually
  - Requirements:
    - add fixture coverage for: removed class role, removed static-method role, removed standalone-function role, wrong role name, wrong layer/location, and wrong target kind
    - add at least one fixture where a static method has a valid annotation but the owning class is missing its class role
    - add at least one fixture where the class role is valid but a static method role is missing
  - Acceptance:
    - each negative probe fails deterministically with a precise message and a non-zero exit code
    - diagnostics instruct Claude to run `riviere-role-classifier` when repair guidance is needed
  - Verification:
    - `pnpm exec vitest run --config packages/riviere-role-enforcement/vite.config.ts`
  - Suggested commit: `test(role-enforcement): add hard-fail negative probes`

- [ ] Make the repo-facing command the authoritative enforcement entrypoint
  - Requirements:
    - ensure `pnpm role-enforcement:check` runs the full Phase 3 branch scope by default
    - ensure local changed-file mode, if supported, is additive convenience only and cannot weaken the full-scope CI path
    - document the command in the package README and any workflow docs that invoke it
  - Acceptance:
    - there is exactly one obvious command engineers and CI should run for deterministic role enforcement
    - the command uses the same implementation path locally and in CI
  - Verification:
    - `pnpm role-enforcement:check`
    - `pnpm exec markdownlint-cli2 "packages/riviere-role-enforcement/README.md"`
  - Suggested commit: `feat(role-enforcement): finalize repo check command`

- [ ] Expand the role catalog and markdown specs for all remaining in-scope architecture areas before annotation rollout
  - Requirements:
    - define missing role families needed for `packages/riviere-cli/src/platform/**`, `packages/riviere-builder/src/**`, `packages/riviere-extract-config/src/**`, `packages/riviere-extract-ts/src/**`, `packages/riviere-role-enforcement/src/**`, and `tools/dev-workflow/src/**`
    - keep the mandatory top-level layer distinction explicit in every new role family
    - create or update `docs/roles/*.md` so every new role has placement, naming, and allowed-public-method guidance before mass annotation begins
  - Acceptance:
    - no in-scope directory remains blocked solely because the role catalog is missing
    - the classifier has a real markdown spec for every role used in Phase 3
  - Verification:
    - `pnpm exec vitest run --config packages/riviere-role-enforcement/vite.config.ts`
    - `pnpm exec markdownlint-cli2 "docs/roles/**/*.md"`
  - Suggested commit: `docs(role-enforcement): expand phase 3 role catalog`

- [ ] Roll out `packages/riviere-role-enforcement/src/**` to full coverage
  - Requirements:
    - annotate every in-scope class, static method, and standalone function in the enforcement package itself
    - resolve any role mismatches by refactoring the package structure rather than creating vague catch-all roles
    - ensure the package can successfully enforce its own architecture
  - Acceptance:
    - the enforcement package is no longer exempt from the rules it introduces
    - package tests and repo-wide enforcement both pass with the package included
  - Verification:
    - `pnpm exec vitest run --config packages/riviere-role-enforcement/vite.config.ts`
    - `pnpm nx build riviere-role-enforcement`
    - `pnpm role-enforcement:check`
  - Suggested commit: `feat(role-enforcement): self-host package coverage`

- [ ] Roll out the remaining uncovered `packages/riviere-cli/src/**` areas
  - Requirements:
    - cover `packages/riviere-cli/src/platform/**`, remaining `shell/**` files such as `shell/bin.ts`, and any feature files not already covered by the initial slice
    - introduce precise roles for CLI input parsing, output formatting, presentation, graph persistence, extraction config loading, and other platform concerns where needed
    - move or split code that does not cleanly fit a single role
  - Acceptance:
    - every in-scope target under `packages/riviere-cli/src/**` has a valid explicit role
    - no temporary exceptions remain for CLI platform code
  - Verification:
    - `pnpm role-enforcement:check`
    - package-specific lint/test/build commands as needed after refactors
  - Suggested commit: `feat(role-enforcement): finish riviere-cli coverage`

- [ ] Roll out `packages/riviere-builder/src/**` to full coverage
  - Requirements:
    - classify all builder domain, command, query, entrypoint, and infra symbols
    - add any needed builder-specific domain roles such as facade, domain service, entity, value object, repository, or error roles only where justified by actual code structure
    - refactor ambiguous files so they fit one clear role each
  - Acceptance:
    - every in-scope target under `packages/riviere-builder/src/**` has a valid explicit role
    - builder code passes deterministic enforcement without package-specific carve-outs
  - Verification:
    - `pnpm role-enforcement:check`
    - package-specific lint/test/build commands as needed after refactors
  - Suggested commit: `feat(role-enforcement): cover riviere-builder`

- [ ] Roll out `packages/riviere-extract-ts/src/**` to full coverage
  - Requirements:
    - classify extraction config resolution, component extraction, connection detection, AST traversal, and call-graph code with explicit repository roles
    - keep infra-style wrappers distinct from pure domain extraction logic
    - split mixed-responsibility files before annotating if a single role would be misleading
  - Acceptance:
    - every in-scope target under `packages/riviere-extract-ts/src/**` has a valid explicit role
    - no extraction code remains outside deterministic enforcement
  - Verification:
    - `pnpm role-enforcement:check`
    - package-specific lint/test/build commands as needed after refactors
  - Suggested commit: `feat(role-enforcement): cover riviere-extract-ts`

- [ ] Roll out `packages/riviere-extract-config/src/**` to full coverage
  - Requirements:
    - classify config-loading, parsing, normalization, validation, and persistence behavior with precise roles instead of generic helpers
    - keep repository/persistence responsibilities separate from domain parsing or validation responsibilities
  - Acceptance:
    - every in-scope target under `packages/riviere-extract-config/src/**` has a valid explicit role
    - no config package code remains uncovered just because it is utility-heavy
  - Verification:
    - `pnpm role-enforcement:check`
    - package-specific lint/test/build commands as needed after refactors
  - Suggested commit: `feat(role-enforcement): cover riviere-extract-config`

- [ ] Roll out `tools/dev-workflow/src/**` to full coverage
  - Requirements:
    - classify workflow entrypoints, commands, queries, domain logic, and infra clients in the older workflow tool
    - add any workflow-specific role family only where the deterministic rules truly differ from the existing workflow-v2 roles
  - Acceptance:
    - every in-scope target under `tools/dev-workflow/src/**` has a valid explicit role
    - the older workflow tool participates in the same enforcement contract as the rest of the branch scope
  - Verification:
    - `pnpm role-enforcement:check`
    - tool-specific lint/test/build commands as needed after refactors
  - Suggested commit: `feat(role-enforcement): cover dev-workflow`

- [ ] Finish any uncovered remainder in `tools/dev-workflow-v2/src/**`
  - Requirements:
    - cover remaining files such as `src/shell/cli.ts`, `src/workflow-definition/infra/**`, and any other targets not yet included in the slice config
    - align folder placement and role names where the current structure still reflects pre-rollout compromises
  - Acceptance:
    - every in-scope target under `tools/dev-workflow-v2/src/**` has a valid explicit role
    - no v2 workflow file depends on being omitted from config to pass enforcement
  - Verification:
    - `pnpm role-enforcement:check`
    - tool-specific lint/test/build commands as needed after refactors
  - Suggested commit: `feat(role-enforcement): finish dev-workflow-v2 coverage`

- [ ] Regenerate and verify the repository-wide scope manifest
  - Requirements:
    - produce an auditable list or test-backed count of every in-scope target in the final branch scope
    - confirm that each target has exactly one explicit role and no directory is omitted by accident
    - record the final included and excluded roots in a stable doc or test fixture
  - Acceptance:
    - the team can prove full branch coverage with evidence rather than assumption
    - a future engineer can detect coverage regressions by diffing the manifest or its tests
  - Verification:
    - `pnpm role-enforcement:check`
    - add and run any manifest or smoke tests introduced for coverage accounting
  - Suggested commit: `test(role-enforcement): lock final scope manifest`

- [ ] Wire hard deterministic enforcement into workflow and CI
  - Requirements:
    - ensure the architecture-review workflow and any relevant CI entrypoints invoke the same repo-wide role check
    - place the deterministic role check early enough that missing or wrong roles fail fast
    - ensure failure output is suitable for GitHub review surfaces and still instructs Claude to run `riviere-role-classifier`
  - Acceptance:
    - the branch cannot be considered green if role enforcement fails
    - deterministic role failures are visible before slower downstream jobs complete
  - Verification:
    - run the local workflow entrypoints or scripts that back the CI behavior
    - `pnpm role-enforcement:check`
  - Suggested commit: `feat(role-enforcement): hard-gate workflow and ci`

- [ ] Verify the AI repair loop for wrong-role cases, not just missing-role cases
  - Requirements:
    - add tests or scripted probes showing that a wrong but known role produces diagnostics that point the engineer or AI agent to `riviere-role-classifier`
    - ensure classifier output includes explicit assignment text, destination guidance, markdown spec, and rationale for the relevant wrong-role scenarios
    - ensure AI review examples reflect the new static-method target kind where applicable
  - Acceptance:
    - the wrong-role path is self-correcting, not just the missing-role path
    - the user can intentionally apply a wrong label and observe useful deterministic plus AI-facing feedback
  - Verification:
    - targeted classifier and AI-review tests
    - `pnpm exec vitest run --config packages/riviere-role-enforcement/vite.config.ts`
  - Suggested commit: `test(role-enforcement): verify wrong-role repair loop`

- [ ] Run the final negative verification drills that simulate user sabotage
  - Requirements:
    - remove a class role annotation in one in-scope package and confirm `pnpm role-enforcement:check` fails
    - remove a static-method role annotation and confirm `pnpm role-enforcement:check` fails
    - remove a standalone-function role annotation and confirm `pnpm role-enforcement:check` fails
    - change a valid role to a wrong known role and confirm deterministic failure plus classifier guidance
    - restore each probe before the final commit
  - Acceptance:
    - the branch proves the exact user test plan will fail the build when labels are removed or made wrong
    - there is no path where unlabeled or wrongly labeled in-scope code slips through silently
  - Verification:
    - record the exact commands and representative failure messages in the PR notes or verification doc
    - `pnpm role-enforcement:check`
  - Suggested commit: `test(role-enforcement): validate sabotage probes`

- [ ] Run the final repository verification matrix and do not merge until every command is green
  - Requirements:
    - run the full deterministic role check for the final branch scope
    - run all repository checks required by this branch after the rollout refactors land
    - resolve any newly exposed lint, test, typecheck, or dependency issues instead of documenting them away
  - Acceptance:
    - the branch is truly green, not just locally green for the role-enforcement package
    - the draft PR can move toward ready review without caveats about missing coverage or known red checks
  - Verification:
    - `pnpm role-enforcement:check`
    - `pnpm verify`
  - Suggested commit: `chore(role-enforcement): finalize full branch verification`

- [ ] Update the draft PR to prove completion, then keep it in draft only if a remaining issue is real and written down
  - Requirements:
    - rewrite the PR description to describe the final branch scope, excluded roots, coverage evidence, and verification commands actually run
    - include a short section describing the manual sabotage probes and their results
    - if anything remains red, list the exact failing command and exact reason; do not leave vague status language
  - Acceptance:
    - a reviewer can understand what is in scope, what is excluded, what was verified, and why the branch is or is not ready
    - no false claim of full coverage remains anywhere in the PRD or PR text
  - Verification:
    - review the PR body after update and confirm it matches the final docs and command output
  - Suggested commit: `docs(role-enforcement): finalize phase 3 rollout status`
