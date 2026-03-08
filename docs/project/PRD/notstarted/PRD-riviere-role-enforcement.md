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

Every class or top-level function in this codebase must have exactly one role.

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

### 2.2 Exactly One Role

Every in-scope target must match exactly one role definition.

- zero matches: error
- more than one match: error
- exactly one match: valid

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
- matched role or candidate roles
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

### 3.3 Minimal Role Definition DSL

We need a simple language for defining roles.

Each role definition must support only the minimum required fields:

- `name`
- `targets`
- `allowedLocation`
- `nameMatches`
- `allowedPublicMethods` for class roles
- `markdownSpec`

Example:

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

Standalone function role example:

```yaml
roles:
  - name: cli-args-parser
    targets: [function]
    allowedLocation:
      - 'packages/*/src/features/*/entrypoint/**/*.ts'
      - 'tools/*/src/entrypoint/**/*.ts'
    nameMatches: 'parse.*'
    markdownSpec: 'docs/roles/cli-args-parser.md'
```

### 3.4 Initial Deterministic Constraints

Initial deterministic constraints are intentionally minimal:

- role name
- target type
- allowed location
- naming pattern
- allowed public methods

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

### 3.6 Deterministic Engine

The deterministic engine will:

- parse TypeScript source files
- enumerate in-scope targets
- match each target against role definitions
- verify the minimal deterministic constraints
- emit structured violations

Violation output should support a self-correcting feedback loop for AI agents. When possible, an error message should explicitly instruct the calling Claude agent to run `riviere-role-classifier` before attempting a fix.

Example error messages:

```text
Role enforcement error: no role matched

File: packages/riviere-cli/src/platform/infra/cli/global-error-handler.ts
Symbol: GlobalErrorHandler
Why: This class does not match any configured role by allowedLocation + nameMatches.
Next step for Claude: run `riviere-role-classifier` with this file and the requested change before editing.
Expected classifier output: top-level layer, specific role, allowed destination path, markdownSpec, rationale.
```

```text
Role enforcement error: multiple roles matched

File: packages/foo/src/features/extract/entrypoint/render-output.ts
Symbol: RenderOutput
Why: This symbol matches both `cli-output-formatter` and `cli-error-presenter`.
Next step for Claude: run `riviere-role-classifier` to disambiguate the role, then rename or move the code to match exactly one role.
```

```text
Role enforcement error: invalid location for matched role

File: packages/foo/src/features/extract/infra/render-output.ts
Symbol: RenderOutput
Matched role: cli-output-formatter
Why: `cli-output-formatter` must live in an allowed `entrypoint` location, not `infra`.
Next step for Claude: run `riviere-role-classifier` to find the correct destination path and markdownSpec before fixing this file.
```

```text
Role enforcement error: invalid public method shape

File: packages/foo/src/features/extract/entrypoint/cli-output-formatter.ts
Symbol: CliOutputFormatter
Matched role: cli-output-formatter
Why: Allowed public methods are [format], but found [format, printError].
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
- inspect the matched code
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
- recommend the correct role and target path before code is written
- flag ambiguity when multiple roles appear plausible

The minimal subagent workflow is:

- identify whether the change belongs in `shell`, `entrypoint`, `command`, `query`, `domain`, or `infra`
- narrow to one specific repository role
- locate the allowed destination path for that role
- read the markdown spec for that role
- return clear implementation guidance to the calling agent

Expected outputs:

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

| #   | Criterion                                                                                                               | Verification                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Full repo scan assigns exactly one role to every in-scope target or reports a deterministic error                       | Integration test fixtures plus repository smoke test                                           |
| 2   | Deterministic enforcement checks only the minimal role rules: location, naming, target type, and allowed public methods | Unit tests with 100% branch coverage                                                           |
| 3   | The repository has an explicit role inventory covering ambiguous infra areas as well as standard locations              | Repository role catalog reviewed and committed                                                 |
| 4   | Fine-grained infra roles are supported                                                                                  | Fixtures for CLI presentation, git, graph persistence, config loading, and similar infra cases |
| 5   | AI review consumes markdown role specs and emits structured verdicts                                                    | Integration tests with mocked AI client                                                        |
| 6   | Architecture review workflow can invoke role enforcement on PRs                                                         | Workflow integration test or documented workflow update verified in tests                      |
| 7   | Full-repo enforcement is fast enough for constant use                                                                   | Benchmarks recorded in docs                                                                    |
| 8   | Package ships with 100% code coverage                                                                                   | Coverage threshold enforced in package config                                                  |
| 9   | No new lint, typecheck, or dependency-cruiser violations are introduced                                                 | Repository `verify` passes                                                                     |
| 10  | A final rollout PR applies role enforcement with 100% coverage across this codebase                                     | Final adoption PR passes repository verification                                               |

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
  - Support role definitions, ignores, and markdown spec references
  - Verification: schema validation tests

- **D1.3:** Oxlint feasibility spike
  - Validate whether Oxlint can support the required enforcement cleanly
  - Compare Oxlint with minimal custom-engine fallback
  - Verification: documented implementation recommendation

### M2: Deterministic Enforcement

The minimal deterministic enforcement works end-to-end.

#### Deliverables

- **D2.1:** Target enumeration
  - Enumerate classes and in-scope standalone functions
  - Verification: parser and extraction tests

- **D2.2:** Unique role matching
  - Enforce zero-match and multi-match failures
  - Verification: matching tests

- **D2.3:** Minimal constraint engine
  - Implement target type, allowed location, naming, and allowed public method checks
  - Verification: rule engine tests with 100% branch coverage

- **D2.4:** Structured diagnostics
  - Human-readable and machine-consumable output
  - Error messages should tell AI agents when to run `riviere-role-classifier`
  - Verification: output snapshot and integration tests

- **D2.5:** Performance instrumentation
  - Measure parse, match, validate, and report phases
  - Verification: benchmark output exists and is documented

### M3: Repository Bootstrap

The repository has an initial role catalog and can be validated against it.

#### Deliverables

- **D3.1:** Initial repository config
  - Encode the reviewed role inventory into the role enforcement config
  - Verification: config exists and validates

- **D3.2:** Initial markdown guidance files
  - Add role guidance under `docs/roles/`
  - Verification: every role with AI guidance references an existing markdown file

- **D3.3:** Repository baseline adoption
  - Bring the current codebase to a passing state or establish explicit temporary exceptions
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
- `TargetSymbol`
- `RoleMatch`
- `RoleViolation`
- `CheckReport`
- `AiReviewVerdict`

### 9.3 Key Architectural Decisions

- Deterministic validation is the primary checker.
- AI review is a separate feature, not embedded in deterministic validation.
- The initial rule model stays intentionally minimal.
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

---

## 11. Example Violations

- `packages/foo/src/features/bar/commands/do-thing.ts` matches no role because its location is too generic or its class name does not match the expected role
- `tools/dev-workflow-v2/src/entrypoint/workflow-cli.ts` exposes public methods not allowed by its assigned role
- `packages/riviere-cli/src/platform/infra/cli-presentation/global-error-handler.ts` matches no configured role definitions
- `packages/x/src/platform/infra/misc/formatter.ts` matches both `cli-output-formatter` and another formatter role

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
| **Target Symbol**           | A class or standalone function checked by the engine                                                                                                  |
| **Role Match**              | The unique role definition matched to a target                                                                                                        |
| **Deterministic Violation** | A role failure proven by static analysis                                                                                                              |
| **Markdown Spec**           | Markdown guidance used by AI review for semantic validation beyond deterministic checks                                                               |

---

## 15. Todo List

- [x] Identify the full repository-wide role inventory needed for 100% coverage — initial draft captured in `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-role-inventory.md`; see also `1. Problem`, `2.5 Repository-Specific Rules Matter`, `10. Initial Role Catalog For This Repository`
- [x] Review ambiguous files and agree on their correct role assignments — resolved current draft decisions in `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-role-inventory.md` sections `3`, `6.4`, and `6.5`; see also `1. Problem`, `6. Open Questions`, `10. Initial Role Catalog For This Repository`
- [x] Confirm the mandatory top-level layer mapping for every role: `shell`, `entrypoint`, `command`, `query`, `domain`, or `infra` — mapped in `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-role-inventory.md` sections `1`, `2`, and `6`; see also `2.5 Repository-Specific Rules Matter`
- [x] Validate whether Oxlint can support the required enforcement model directly — recommendation captured in `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-oxlint-feasibility-report.md`; see also `3.7 Oxlint Position And Alternatives`, `7. Milestones`
- [ ] Decide the minimum fallback design if Oxlint cannot support the full model cleanly — see `2.3 Simplicity And Minimalism`, `3.6 Deterministic Engine`, `3.7 Oxlint Position And Alternatives`
- [x] Finalize the minimal role DSL schema — concrete draft captured in `docs/project/PRD/notstarted/PRD-riviere-role-enforcement-role-inventory.md` sections `6.2`, `6.3`, and `6.5`; see also `3.3 Minimal Role Definition DSL`, `3.4 Initial Deterministic Constraints`
- [ ] Implement deterministic target enumeration for classes and standalone functions — see `3.2 In-Scope Targets`, `3.6 Deterministic Engine`, `7. Milestones`
- [ ] Implement unique-role matching and deterministic validation — see `2.2 Exactly One Role`, `3.4 Initial Deterministic Constraints`, `3.6 Deterministic Engine`
- [ ] Add structured diagnostics suitable for local use and PR review — see `2.4 Fail Fast`, `3.6 Deterministic Engine`
- [ ] Write markdown specs for each role under `docs/roles/` — see `3.3 Minimal Role Definition DSL`, `3.8 AI Review Layer`
- [ ] Encode the initial repository role catalog in the role-enforcement config — see `3.5 Config Files`, `10. Initial Role Catalog For This Repository`
- [ ] Apply the enforcement to the full repository and resolve all uncovered code — see `3.10 Repository Rollout`, `5. Success Criteria`
- [ ] Create `riviere-role-classifier` in `packages/riviere-role-enforcement` and make it available repo-wide — see `3.9 riviere-role-classifier`
- [ ] Define and implement the structured output contract for `riviere-role-classifier` — see `3.9 riviere-role-classifier`
- [ ] Add the standard prompt/response pattern for `riviere-role-classifier` so other agents can call it consistently — see `3.9 riviere-role-classifier`
- [ ] Ensure deterministic error messages tell Claude when to run `riviere-role-classifier` for self-correction — see `3.6 Deterministic Engine`, `3.9 riviere-role-classifier`
- [ ] Integrate role enforcement into architecture review for PRs — see `3.8 AI Review Layer`, `5. Success Criteria`
- [ ] Add AI review prompts/workflow that read `markdownSpec` files and write reports — see `3.8 AI Review Layer`, `3.9 riviere-role-classifier`
- [ ] Reach 100% code coverage for the new package — see `5. Success Criteria`
- [ ] Ship the final adoption PR with 100% repository role coverage — see `1. Problem`, `3.10 Repository Rollout`, `5. Success Criteria`
