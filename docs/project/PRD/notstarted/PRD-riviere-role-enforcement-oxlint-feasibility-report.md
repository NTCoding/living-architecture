# Oxlint feasibility report for riviere-role-enforcement

**Status:** Draft working output for PRD todo item 4

This report evaluates whether Oxlint can support the required deterministic role-enforcement model described in `docs/project/PRD/notstarted/PRD-riviere-role-enforcement.md`.

## Recommendation

Oxlint can support the phase-1 role-enforcement model, but not through built-in rule configuration alone.

Recommended implementation order:

1. Use an Oxlint JS plugin spike to validate the rule model against real repository files.
2. If the spike proves stable and fast enough, ship phase 1 on Oxlint.
3. If the spike fails on capability, stability, or performance, fall back to a minimal custom checker built on OXC parsing infrastructure.
4. Do not use ESLint as the primary long-term enforcement mechanism unless both Oxlint and a minimal OXC checker prove unworkable.

## Short answer

### What Oxlint can likely handle well

The proposed phase-1 checks are mostly deterministic and symbol-local:

- enumerate class declarations and standalone functions
- inspect file path
- inspect symbol kind
- match symbol names against regex
- inspect allowed public methods on classes
- emit structured diagnostics

These checks appear mechanically detectable from AST + file path alone in current repository code.

Representative examples:

- shell function: `packages/riviere-cli/src/shell/cli.ts:50`
- entrypoint function: `packages/riviere-cli/src/features/extract/entrypoint/extract.ts:14`
- command function: `packages/riviere-cli/src/features/extract/commands/run-extraction.ts:13`
- query facade class: `packages/riviere-query/src/features/querying/queries/RiviereQuery.ts:117`
- repository-style infra function: `packages/riviere-cli/src/platform/infra/persistence/extraction-config-repository.ts:143`

### What built-in Oxlint config cannot express cleanly

The role model is repository-defined and config-driven. It needs custom logic for:

- role definitions loaded from repository config
- exactly-one-role matching
- repository-specific path and naming rules
- allowed public method allowlists per role
- custom machine-actionable diagnostics
- guidance that tells agents to run `riviere-role-classifier`

That is beyond normal built-in rule toggles and severity config.

## Why Oxlint is still the preferred path

Oxlint remains the best first choice because:

- the PRD prefers Oxlint if it can satisfy the requirement without forcing a more complex design
- the repository already benefits from fast deterministic enforcement elsewhere
- phase-1 rules do not appear to need type-aware custom rules
- Oxlint supports JS plugins compatible with the ESLint plugin model, which is enough for a realistic spike

## Feasibility assessment

### 1. Native Oxlint config only

Verdict: not sufficient

Reason:

- built-in config can enable existing rules
- it cannot by itself implement repository-defined role matching semantics

Use only for adjacent generic lint rules, not for the core role engine.

### 2. Oxlint JS plugin

Verdict: feasible for phase 1, recommended spike path

Why it fits:

- supports custom AST-based logic
- can inspect classes, functions, names, and members
- can report custom diagnostics
- can run inside Oxlint's fast lint workflow

Important limitation:

- Oxlint JS plugins are still documented as technical preview
- plugin support should therefore be validated by a repository spike before committing the whole PRD to it

### 2.5 Rust plugin question

Verdict: there is no public repo-local Rust plugin path comparable to `jsPlugins`

What Oxlint exposes publicly today:

- built-in native plugins implemented inside Oxlint itself
- custom JS plugins loaded through config

What this means in practice:

- a custom Rust implementation would likely be faster at runtime
- but it would require either upstreaming a native Oxlint rule/plugin, maintaining a fork, or building a standalone checker directly on OXC
- that makes Rust the higher-effort path even if it offers the best performance ceiling

Practical recommendation:

- validate the rule model first with an Oxlint JS plugin spike
- if the JS plugin misses capability or performance targets, switch to a minimal OXC/Rust checker rather than searching for a non-existent general-purpose Rust Oxlint plugin mechanism

### 3. Minimal custom checker using OXC parsing

Verdict: feasible fallback, recommended backup design

Why it fits:

- full control over repository-defined matching
- no dependence on plugin-preview maturity
- still aligned with the PRD preference for OXC/Oxlint ecosystem
- easier to tailor output format and benchmark behavior

Why it is second choice:

- larger bespoke tooling surface
- more integration work than reusing Oxlint execution if the plugin path works cleanly

### 4. ESLint-based implementation

Verdict: possible but not preferred

Why it is weaker:

- slower
- duplicates enforcement surface already intended to move toward Oxlint
- contradicts the PRD's stated preference unless Oxlint cannot support the model cleanly

## Repository evidence from current code

The current repository suggests the v1 checks are mostly static and local.

### Good fits for deterministic symbol checks

- `packages/riviere-cli/src/features/extract/entrypoint/extract.ts:14`
- `packages/riviere-cli/src/features/extract/commands/run-extraction.ts:13`
- `packages/riviere-query/src/features/querying/queries/component-queries.ts:5`
- `packages/riviere-query/src/features/querying/queries/flow-queries.ts:15`
- `packages/riviere-query/src/features/querying/queries/RiviereQuery.ts:117`
- `tools/dev-workflow-v2/src/infra/github/get-pr-feedback.ts:28`

### Existing integration points for rollout

- root verification command: `package.json:15`
- root Nx-style verification targets: `project.json:3`
- CI PR checks: `.github/workflows/ci.yml:57`
- architecture review workflow: `tools/dev-workflow-v2/states/reviewing.md:10`
- architecture review agent: `tools/dev-workflow-v2/agents/architecture-review.md:20`

## Risks and edge cases discovered

These do not block Oxlint, but they must be handled explicitly in the implementation design.

### 1. Enforcement must be symbol-level, not file-level

`packages/riviere-cli/src/shell/cli.ts:28` exports `parsePackageJson` and also exports the shell entry function at `packages/riviere-cli/src/shell/cli.ts:50`.

Implication:

- one file may contain more than one in-scope target
- matching must be per symbol

### 2. Shell cannot be modeled only as exported functions

`tools/dev-workflow-v2/src/shell/cli.ts:13` is a side-effect entry file with no exported shell function.

Implication:

- either phase 1 excludes this shell shape
- or the shell rule model must expand beyond exported standalone functions

### 3. Current regex draft is not yet complete

`packages/riviere-query/src/features/querying/queries/compare-by-code-point.ts:1` is mapped as `query-service` in the role inventory draft, but the current proposed regex does not match `compareByCodePoint`.

Implication:

- the config draft needs refinement before enforcement becomes authoritative

### 4. Public method policy needs exact semantics

For class-role enforcement, the engine must define whether these count:

- constructors
- static methods
- getters
- public fields

Example: `packages/riviere-query/src/features/querying/queries/RiviereQuery.ts:150` has static `fromJSON`.

Implication:

- `allowedPublicMethods` must specify exactly which member kinds are included

## Decision

Oxlint is feasible for the required phase-1 role-enforcement model if implemented through a custom Oxlint JS plugin spike.

It is not feasible through built-in Oxlint configuration alone.

The minimum fallback if the Oxlint plugin path is not clean is a minimal custom checker using OXC parsing infrastructure.

ESLint should remain the last fallback, not the default implementation choice.

## Recommended next implementation slice

### Spike goal

Prove that Oxlint can execute the minimal role model against real repository files.

### Spike scope

Limit the spike to the agreed first role slice from the role inventory draft:

- `cli-shell`
- `cli-entrypoint`
- `command-use-case`
- `query-service`
- `query-facade`
- `entity`
- `value-object`
- `domain-service`
- `domain-error`
- `application-error`
- `external-client`
- `repository`
- `cli-input-mapper`
- `cli-output-formatter`
- `cli-output-writer`

### Minimum spike deliverables

1. Read a minimal role config.
2. Enumerate class and standalone-function targets.
3. Match targets against role definitions.
4. Enforce:
   - target kind
   - allowed location
   - naming regex
   - allowed public methods
5. Emit structured diagnostics.
6. Benchmark changed-files and full-repo timings.

## Exit criteria for choosing Oxlint

Choose Oxlint for implementation if the spike demonstrates all of the following:

- correct symbol detection on representative repository files
- exact-one-role matching works on fixtures
- diagnostics are precise enough for developer and AI-agent use
- no blocker from Oxlint plugin capability
- performance is credibly on track for PRD targets

If any of these fail, switch immediately to the minimal OXC checker design.

## Final recommendation statement

Recommended delivery vehicle for phase 1:

- primary: Oxlint with a custom JS plugin spike
- fallback: minimal custom checker using OXC parsing
- avoid as primary path: ESLint-based implementation
