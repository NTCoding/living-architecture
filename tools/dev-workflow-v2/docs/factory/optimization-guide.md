# Factory Optimization Guide

This guide contains optimization-specific decision examples. It is not the factory map. The map describes what exists and where it is defined; this guide describes common factory-improvement patterns.

Before proposing an optimization, inspect the source files named by `tools/dev-workflow-v2/docs/factory/factory-map.md`. The examples below are not enforcement proof.

## Local and CI Gates

| Problem pattern | Source files to inspect | Typical optimization direction |
| --- | --- | --- |
| A deterministic guardrail exists but does not run locally | `.husky/pre-commit`, `package.json`, root `project.json` | Wire the target into the local verification path |
| A local check exists but does not run in PR CI | `.github/workflows/ci.yml`, `nx.json`, relevant `project.json` | Add the target to affected CI or target dependencies |
| A generated artifact can be stale at commit or PR time | generation scripts, generated-doc targets, local/CI gates | Add or reuse generated-artifact checks |
| An external scanner should block PRs | `.github/workflows/ci.yml`, scanner config | Configure CI to fail on the scanner result |

## ESLint and Custom Rules

| Problem pattern | Concrete example | Source files to inspect | Typical optimization direction |
| --- | --- | --- | --- |
| Required data is hidden by a silent fallback | `const owner = issue.owner ?? ''` when `owner` must exist | `eslint.config.mjs`, relevant convention docs | Add or adjust a selector/custom rule |
| Product code introduces generic names | `src/platform/helpers/date-helper.ts` or `class DataManager` | `.eslint-rules/no-generic-names.js`, `eslint.config.mjs` | Extend the naming rule if structurally detectable |
| Entrypoint gains business logic | CLI entrypoint parses input and computes domain decisions in private helpers | `eslint.config.mjs`, dependency rules, ADR-002 | Use lint for local shape and dependency rules for imports |
| Test title and assertion drift apart | `it('returns only active users')` asserts only `result.length` | Vitest ESLint config, custom rule specs | Add a test-shape rule only when deterministic |
| TypeScript escape hatch hides a bug | `value as KnownType`, `any`, or non-null assertion in production code | `eslint.config.mjs` | Adjust TypeScript safety rules or add a specific selector |

## Riviere Role Enforcement

| Problem pattern | Concrete example | Source files to inspect | Typical optimization direction |
| --- | --- | --- | --- |
| Exported declaration has the wrong responsibility for its folder | `domain/save-to-database.ts` exports an external-client role | `.riviere/role-enforcement.config.ts`, `.riviere/roles.ts` | Adjust allowed roles or add a missing location |
| Use case accepts unclassified input | `execute(input: RawCliOptions)` where the type has no input role | `.riviere/roles.ts`, plugin checks | Add or adjust `allowedInputs` and fixtures |
| Use case returns an unapproved output role | Command returns a query model or raw infrastructure response | `.riviere/roles.ts`, role definitions | Add or adjust `allowedOutputs` or split result roles |
| Peer use cases compose each other | One command imports another command use case and calls it | `.riviere/roles.ts`, role-enforcement tests | Add or adjust `forbiddenDependencies` |
| Wiring layer calls collaborators directly | `main` calls a use-case method instead of only constructing wiring | `.riviere/roles.ts`, forbidden-method-call tests | Add or adjust `forbiddenMethodCalls` |
| Class exposes too much public behavior | Command class has `execute`, `validate`, and `format` public methods | `.riviere/roles.ts`, public method checks | Add or adjust public method bounds |

## Dependency Cruiser

| Problem pattern | Concrete example | Source files to inspect | Typical optimization direction |
| --- | --- | --- | --- |
| Domain imports infrastructure | `features/billing/domain/invoice.ts` imports persistence | `.dependency-cruiser.mjs`, ADR-002 | Add or adjust a forbidden dependency rule |
| Feature imports another feature | `features/search/commands/index.ts` imports user domain code | `.dependency-cruiser.mjs`, frontend config if applicable | Add or adjust cross-feature rules |
| Entrypoint bypasses use cases | `entrypoint/cli.ts` imports domain or persistence directly | dependency-cruiser config, role config | Use path import rules and role rules as appropriate |
| Commands or queries become nested mini-apps | `features/building/commands/enrich/helpers/normalize.ts` | `.dependency-cruiser.mjs` | Add or adjust folder-shape rules |
| Spec file is detached from production code | `src/my-feature.spec.ts` at package root | `.dependency-cruiser.specs.mjs` | Add or adjust spec placement rules |

## Architecture Docs and Semantic Review

| Problem pattern | Concrete example | Source files to inspect | Typical optimization direction |
| --- | --- | --- | --- |
| New folder responsibility is missing from architecture docs | A feature needs a new infrastructure subfolder category | ADR-002, architecture overview, deterministic configs | Update docs and pair with enforcement when possible |
| Review agents disagree with deterministic rules | Architecture review allows a dependency that dependency-cruiser rejects | agent prompts, ADR-002, deterministic configs | Align agent guidance to deterministic rules |
| Semantic design smell is not AST-detectable | Layering is valid but a mapper owns domain decision-making | review agents, conventions | Add agent/convention guidance after rejecting deterministic enforcement |
| Prior PR feedback should become reusable memory | Reviewer repeatedly catches the same semantic bug pattern | `review-feedback-checks.md`, `bug-scanner.md` | Add a learned feedback check |

## Tests, Coverage, and Generated Artifacts

| Problem pattern | Concrete example | Source files to inspect | Typical optimization direction |
| --- | --- | --- | --- |
| Production code is outside coverage scope | New workflow production folder is not matched by coverage include | Vitest config, package target | Adjust coverage include/exclude and add proof tests |
| Coverage exclusion masks real behavior | Excluded adapter gains business decisions | Vitest config, production file, nearby specs | Remove or narrow exclusion, or extract testable behavior |
| Edge-case cluster lacks tests | Bug fix covers one missing field but not adjacent null/empty cases | relevant specs, testing conventions | Add behavior tests or edge-case checklist guidance |
| Custom lint rule lacks rejected fixture | Rule spec tests only passing code | rule spec file | Add accepted and rejected fixtures |
| Generated docs drift from source | Command changes do not update generated reference | generation script, generated-doc target | Add or adjust generated-doc check |

## Dev Workflow System

| Problem pattern | Concrete example | Source files to inspect | Typical optimization direction |
| --- | --- | --- | --- |
| Command allows action before approval | Factory issue is created before options are discussed | command markdown, workflow states | Tighten command instructions or add state guard |
| Agent relies on map annotations as proof | Proposal cites `factory-map.md` examples as existing enforcement | command markdown, factory docs | Require direct source inspection |
| Tool action must be impossible | Agent writes files in a read-only workflow state | hook policy, workflow state, tests | Add hook or state-machine guard |
| PR feedback transition records incomplete data | Feedback exists but workflow moves to reflecting | workflow CLI, event fold, GitHub feedback client tests | Add transition or event tests |
| OpenCode and Claude Code behavior diverge | Slash command maps incorrectly in OpenCode | `opencode-plugin.ts`, command templates | Update plugin bridge and tests |
