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

The target end state is a PR where role enforcement is applied with 100% coverage across this codebase and all in-scope code belongs to a role.

For rollout practicality, enforcement may begin with a narrower phase 1 scope. If so, that scope must be stated explicitly in the implementation plan rather than treated as an implicit exclusion.

---

## 2. Design Principles

### 2.1 Deterministic First, AI Second

Deterministic enforcement is the source of truth for:

- role coverage
- role uniqueness
- allowed location
- naming rules
- allowed public methods on a class or function assigned to that role

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
- allowed public methods on a class or function assigned to that role
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

- one class = one role
- if a function does not belong to a class, it must also have a role
- roles apply to classes or standalone functions, not to class methods individually

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
- standalone functions

The intended model is:

- one class = one role
- standalone functions must have a role if they are in scope
- mixed-role classes are disallowed

### 3.3 Minimal Role Definition DSL And Explicit Role Assignment

We need two separate concepts:

- a role definition DSL that defines the repository role taxonomy
- an explicit role assignment model that tells the checker which role a class or standalone function actually has

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

| #   | Criterion                                                                                                                                    | Verification                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Every in-scope class and standalone function has exactly one explicit role assignment or produces a deterministic error                      | Integration test fixtures plus repository smoke test                                           |
| 2   | Deterministic enforcement validates the assigned role against only the minimal role rules: location, naming, target type, and public methods | Unit tests with 100% branch coverage                                                           |
| 3   | No symbol passes purely because it happened to match path and naming rules without an explicit assignment                                    | Negative fixture coverage for matcher-only cases                                               |
| 4   | The repository has an explicit role inventory covering ambiguous infra areas as well as standard locations                                   | Repository role catalog reviewed and committed                                                 |
| 5   | Fine-grained infra roles are supported                                                                                                       | Fixtures for CLI presentation, git, graph persistence, config loading, and similar infra cases |
| 6   | Diagnostics distinguish missing assignment, unknown assignment, invalid location, invalid name, and invalid public method shape              | Golden-path diagnostic tests                                                                   |
| 7   | AI review consumes markdown role specs and emits structured verdicts                                                                         | Integration tests with mocked AI client                                                        |
| 8   | Architecture review workflow can invoke role enforcement on PRs                                                                              | Workflow integration test or documented workflow update verified in tests                      |
| 9   | Full-repo enforcement is fast enough for constant use                                                                                        | Benchmarks recorded in docs                                                                    |
| 10  | Package ships with 100% code coverage and does not introduce new lint, typecheck, or dependency-cruiser violations                           | Coverage threshold enforced in package config and repository `verify` passes                   |
| 11  | A final rollout PR applies role enforcement with 100% coverage across this codebase                                                          | Final adoption PR passes repository verification                                               |

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
  - Enumerate classes and in-scope standalone functions
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
  - Apply role enforcement across the entire repository
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

This section defines the role taxonomy only. It does not assign roles to concrete symbols. Concrete classes and standalone functions still need explicit role assignments.

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
| **Role Assignment**         | The explicit declaration that a class or standalone function has a specific repository role                                                           |
| **Target Symbol**           | A class or standalone function checked by the engine                                                                                                  |
| **Role Match**              | The role definition resolved from the target's explicit role assignment                                                                               |
| **Deterministic Violation** | A role failure proven by static analysis                                                                                                              |
| **Markdown Spec**           | Markdown guidance used by AI review for semantic validation beyond deterministic checks                                                               |

---

## 15. Todo List

### Completed discovery outputs

1. Role inventory draft
   - Status: done
   - Output: `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-role-inventory.md`
   - Acceptance: a repository role inventory exists, covers the mandatory top-level layers, and lists the main ambiguities still requiring decisions
   - References: `1. Problem`, `2.5 Repository-Specific Rules Matter`, `10. Initial Role Catalog For This Repository`

2. Oxlint feasibility review
   - Status: done
   - Output: `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-oxlint-feasibility-report.md`
   - Acceptance: the team has a written recommendation on whether Oxlint can support the explicit-classification model cleanly
   - References: `3.7 Oxlint Position And Alternatives`, `7. Milestones`

### Remaining implementation tasks

1. Define the explicit role assignment model
   - Status: pending
   - Requirements: choose and document the authoritative assignment source of truth; the recommended default is inline source annotation such as `/** @riviere-role cli-shell */`
   - Acceptance: a documented assignment format exists; parser fixtures prove the engine can read the assignment from a class and a standalone function; a symbol without an assignment fails deterministically
   - References: `2.2 Authoritative Classification And Exactly One Role`, `3.3 Minimal Role Definition DSL And Explicit Role Assignment`, `5. Success Criteria`, `7. Milestones`

2. Finalize the fallback design if Oxlint cannot support the model cleanly
   - Status: pending
   - Requirements: keep the design minimal, preserve explicit assignment as the source of truth, and avoid adding unnecessary tooling surface
   - Acceptance: the chosen fallback is documented and still satisfies the success criteria for explicit assignment, diagnostics, and performance
   - References: `2.3 Simplicity And Minimalism`, `3.6 Deterministic Engine`, `3.7 Oxlint Position And Alternatives`, `5. Success Criteria`

3. Implement deterministic target enumeration and assignment parsing
   - Status: pending
   - Requirements: enumerate classes and standalone functions, then read each target's explicit role assignment before validation
   - Acceptance: parser tests prove the engine finds the target and its assigned role for both class and function fixtures
   - References: `3.2 In-Scope Targets`, `3.3 Minimal Role Definition DSL And Explicit Role Assignment`, `3.6 Deterministic Engine`, `7. Milestones`

4. Replace implicit role inference with assigned-role validation
   - Status: pending
   - Requirements: `allowedLocation`, `allowedNames` or `nameMatches`, and `allowedPublicMethods` must validate the assigned role only; they must not be used to infer the final role
   - Acceptance: fixtures prove that missing assignment, unknown assignment, invalid location, invalid name, and invalid public method shape all fail with the correct violation type; matcher-only overlap never counts as success
   - References: `2.2 Authoritative Classification And Exactly One Role`, `3.3 Minimal Role Definition DSL And Explicit Role Assignment`, `3.4 Initial Deterministic Constraints`, `3.6 Deterministic Engine`, `5. Success Criteria`

5. Improve diagnostics for human and AI repair
   - Status: pending
   - Requirements: diagnostics must name the assigned role when one exists, state the violated rule, list allowed names or allowed public methods when finite, and tell Claude when to run `riviere-role-classifier`
   - Acceptance: golden tests cover `missing explicit role assignment`, `unknown explicit role assignment`, `invalid location for assigned role`, `invalid name for assigned role`, and `invalid public method shape`
   - References: `2.4 Fail Fast`, `3.6 Deterministic Engine`, `3.9 riviere-role-classifier`, `5. Success Criteria`

6. Write markdown specs for each role and encode the repository role catalog
   - Status: pending
   - Requirements: each role used in rollout has a definition in config and a corresponding markdown spec where needed
   - Acceptance: config validates, markdown references resolve, and the initial rollout scope has no role definitions without supporting docs
   - References: `3.3 Minimal Role Definition DSL And Explicit Role Assignment`, `3.5 Config Files`, `3.8 AI Review Layer`, `10. Initial Role Catalog For This Repository`

7. Build `riviere-role-classifier` as an authorship helper
   - Status: pending
   - Requirements: the classifier must return the exact explicit assignment to add, the chosen role, allowed location, markdown spec, rationale, and ambiguity status
   - Acceptance: contract tests prove the classifier can return `assignmentText`, a clear result, and an ambiguous result; the prompt/response pattern is documented for other agents
   - References: `3.9 riviere-role-classifier`, `5. Success Criteria`

8. Integrate role enforcement into architecture review and AI repair workflow
   - Status: pending
   - Requirements: PR review must run deterministic enforcement, AI review must consume markdown specs, and diagnostics must point Claude to `riviere-role-classifier` for self-correction
   - Acceptance: workflow tests or documented workflow updates prove the review path works end-to-end
   - References: `3.6 Deterministic Engine`, `3.8 AI Review Layer`, `3.9 riviere-role-classifier`, `5. Success Criteria`

9. Bootstrap explicit assignments across the chosen rollout scope
   - Status: pending
   - Requirements: add explicit role assignments to all in-scope classes and standalone functions in the chosen rollout scope; document any temporary exceptions explicitly
   - Acceptance: rollout-scope scan passes with no uncovered in-scope symbols outside documented exceptions
   - References: `3.10 Repository Rollout`, `5. Success Criteria`, `7. Milestones`

10. Reach production-ready quality gates and ship the adoption PR
    - Status: pending
    - Requirements: achieve 100% coverage for the new package, pass repository verification, and land the final adoption PR with explicit role coverage
    - Acceptance: coverage thresholds pass, repository `verify` passes, and the final rollout PR demonstrates 100% coverage for the agreed scope
    - References: `1. Problem`, `5. Success Criteria`, `7. Milestones`, `3.10 Repository Rollout`
