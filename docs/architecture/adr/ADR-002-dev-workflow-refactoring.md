# ADR-002: dev-workflow Restructuring

**Status:** Approved (Partially Superseded)
**Date:** 2026-01-19
**Deciders:** @ntcoding
**Superseded By:** ADR-003 (commands/queries pattern)

> **Note:** The `use-cases/` folder pattern in this ADR has been superseded by the `commands/` and `queries/` pattern. See ADR-003 for the updated approach. New packages should use `commands/` for write operations and `queries/` for read operations instead of `use-cases/`.

## Context

The `tools/dev-workflow` package (~20 files) orchestrates the development workflow: task completion, PR feedback, and Claude Code hook enforcement. An architecture review identified structural drift from separation-of-concerns principles:

- Root-level `errors.ts` spans multiple unrelated domains
- `pr-feedback.ts` mixes domain logic with external client wrapper
- `complete-task` entrypoint does too much orchestration
- Inconsistent patterns between commands
- Missing use-cases layer in some features

The review evaluated whether to pursue surgical fixes or full restructure to `features/platform/shell`.

## Decision

**Full restructure to features/platform/shell pattern** with the following structural decisions:

### Package Structure

```text
tools/dev-workflow/
├── features/
│   ├── complete-task/
│   │   ├── entrypoint/
│   │   │   └── cli.ts
│   │   ├── use-cases/
│   │   │   └── complete-task.ts
│   │   └── domain/
│   │       ├── pull-request-draft.ts
│   │       ├── task-to-complete.ts
│   │       ├── pipeline-outcome.ts
│   │       └── steps/
│   │           ├── verify-build.ts
│   │           ├── run-code-review.ts
│   │           ├── submit-pull-request.ts
│   │           └── fetch-feedback.ts
│   │
│   ├── get-pr-feedback/
│   │   ├── entrypoint/
│   │   │   └── cli.ts
│   │   ├── use-cases/
│   │   │   └── get-pr-feedback.ts
│   │   └── domain/
│   │       └── feedback-report.ts
│   │
│   ├── respond-to-feedback/
│   │   ├── entrypoint/
│   │   │   └── cli.ts
│   │   ├── use-cases/
│   │   │   └── respond-to-feedback.ts
│   │   └── domain/
│   │       └── feedback-response.ts
│   │
│   └── claude-hooks/
│       ├── entrypoint/
│       │   └── hook-router.ts
│       ├── use-cases/
│       │   └── handle-hook.ts
│       └── domain/
│           ├── safety-rules/
│           │   ├── blocked-commands.ts
│           │   └── dangerous-flags.ts
│           ├── permission-decision.ts
│           └── handlers/
│               ├── pre-tool-use-handler.ts
│               ├── post-tool-use-handler.ts
│               └── stop-handler.ts
│
├── platform/
│   ├── domain/
│   │   ├── workflow-execution/
│   │   │   ├── workflow-runner.ts
│   │   │   └── step-result.ts
│   │   ├── branch-naming/
│   │   │   └── issue-branch-parser.ts
│   │   ├── commit-format/
│   │   │   ├── conventional-commit-title.ts
│   │   │   └── commit-message-formatter.ts
│   │   └── review-feedback/
│   │       ├── review-thread.ts
│   │       ├── feedback-location.ts
│   │       └── reviewer.ts
│   │
│   └── infra/
│       └── external-clients/
│           ├── cli-args.ts
│           ├── git-client.ts
│           ├── github-rest-client.ts
│           ├── github-graphql-client.ts
│           ├── nx-runner.ts
│           └── claude-agent.ts
│
└── shell/
    └── index.ts
```

### Structural Rules (Mandatory)

1. **Three-layer feature structure:** Every feature MUST have `entrypoint/`, `use-cases/`, `domain/`. No exceptions.

2. **Dependency direction:** `entrypoint/ → use-cases/ → domain/`. Entrypoint NEVER imports directly from domain/.

3. **Steps in domain/:** Steps live in `domain/steps/`. A single use-case orchestrates multiple steps. The use-case represents the user intention (e.g., "complete task"), steps are implementation details.

4. **Errors contextual:** Error classes exported from their contextual files (e.g., `MissingPullRequestDetailsError` from `pull-request-draft.ts`), NOT collected in a separate errors.ts.

5. **No nested folders in use-cases/:** use-cases/ contains only use-case files. Orchestration helpers belong in domain/.

6. **Workflow execution is domain:** Since we own and designed the workflow execution pattern, it's part of our domain logic in `platform/domain/workflow-execution/`.

7. **Hooks are cohesive with workflow:** Claude hooks enforce the development workflow—they're part of the same bounded context, not a separate one. Future structural separation may occur when complexity warrants it.

### Domain Modeling

**Value Objects:**
- `ConventionalCommitTitle` - Parses and validates commit title format
- `FeedbackLocation` - Three distinct types: `PRLevelLocation | FileLevelLocation | LineLevelLocation`
- `Reviewer` - Wraps reviewer login (trivial but consistent with wrapping types practice)
- `PullRequestDraft` - Factory methods for resolution logic

**Domain Types:**
- `ReviewThread` - Discriminated union: `ActiveThread | ResolvedThread | OutdatedThread`
- `StepResult` - Discriminated union: `StepSuccess | StepFailure`
- `TaskToComplete` - Simple domain type (NOT an aggregate—has no invariants to enforce)

**Domain Logic Location:**
- `classifyThread` stays in domain (it's domain logic about classifying threads; dependency on GitHub format is acceptable)

## Consequences

### Positive

- Clear separation of concerns at directory level
- Consistent structure across all features
- Domain logic isolated from infrastructure
- Type-safe value objects with validation at boundaries
- Foundation for rolling out pattern to entire repository

### Negative

- Increases file count from ~20 to ~40+
- All internal imports change simultaneously
- Some features have thin use-cases layer (may feel ceremonial for simple operations)

## Alternatives Considered

### Surgical Improvements Only

Split errors.ts, extract pr-feedback domain, thin entrypoints—without directory reorganization.

**Why rejected:** Partial fixes leave structural debt. The goal is to establish the pattern for the entire repository, not just this package.

### Separate Bounded Context for Hooks

Extract claude-hooks to separate package with anti-corruption layer.

**Why rejected:** Hooks are cohesive with the workflow they enforce. Structural separation is premature.
