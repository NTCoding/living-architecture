# PRD: dev-workflow-v2 Platform Migration

**Status:** Awaiting Architecture Review

---

## 1. Problem

dev-workflow-v2 has ~975 lines of mechanical infrastructure code that the platform (`@ntcoding/agentic-workflow-builder`) now provides declarative APIs for. The platform's latest version delivers:

- `defineRoutes` + `arg` helpers — declarative CLI command definitions
- `createWorkflowCli` / `createWorkflowRunner` — platform-owned CLI entrypoint with dep assembly
- `defineHooks` + `preToolUseHandler` — declarative hook routing with engine-level escape hatch
- Engine-owned `transition()`, `checkBash()`, `checkWrite()` — moved from consumer to engine
- `defineRecordingOps` + `checkOperationGate` — declarative recording operation generation
- `WorkflowFactory` renamed to `WorkflowDefinition` with `getRegistry()`, `buildTransitionContext()`, `parseStateName()`, `appendEvent()`
- `afterEntry` callback on state definitions
- Emoji derived from registry (no `getEmojiForState`)
- Session ID injected by platform (no positional arg per route)
- Hook Zod schemas owned by platform
- `formatDenyDecision` / `formatContextInjection` owned by platform
- `PlatformContext` exposed to consumer for dep wiring
- `extractField` utility for hook input parsing
- `customRouter` escape hatch for non-standard commands

**The migration is urgent.** The installed platform package has already removed the `WorkflowFactory` type. Our current code imports a type that no longer exists. The codebase compiles only because TypeScript resolves from cached build artifacts. Any clean rebuild will fail.

### Current Infrastructure to Eliminate

| File | Lines | Replacement |
|------|-------|-------------|
| `infra/cli/command-handlers.ts` | 307 | `defineRoutes` — one-line declarations per command |
| `infra/cli/hook-handlers.ts` | 133 | `defineHooks` + `preToolUseHandler` on `createWorkflowRunner` |
| `entrypoint/workflow-cli.ts` | 83 | `createWorkflowCli` — single function call |
| `infra/cli/hook-io.ts` | 59 | Platform owns schemas, `formatDenyDecision`, exit codes |
| `shell/composition-root.ts` | 50 | `createWorkflowCli` owns engine dep assembly |
| `infra/cli/environment.ts` | 35 | Platform reads env vars internally |
| `infra/cli/operation-result.ts` | 28 | Platform maps `EngineResult` to exit codes |
| `infra/cli/stdin.ts` | 7 | Platform reads stdin internally |
| `domain/workflow-error.ts` | 15 | Orphaned — only consumers are deleted files |
| `workflow.ts` — 16 recording methods | ~180 | `defineRecordingOps` + `executeRecording` |
| `workflow.ts` — `transitionTo` | 35 | Engine-owned `transition()` |
| `workflow.ts` — `checkBashAllowed` | 16 | Engine-owned `checkBash()` |
| `workflow.ts` — `checkWriteAllowed` | 12 | Engine-owned `checkWrite()` |
| `workflow.ts` — `buildTransitionContext` | 12 | Moved to `WorkflowDefinition` |
| `workflow.ts` — `verifyIdentity` | 3 | Engine handles via `getPrefixConfig` |
| `workflow-types.ts` — `STATE_EMOJI_MAP` | 12 | Derived from registry |
| `workflow-predicates.ts` — `checkOperationGate` | 10 | Platform's `defineRecordingOps` owns gate checks |
| `workflow-adapter.ts` — `getEmojiForState` | 3 | Dropped from interface |
| **Total** | **~1000** | |

### Target State

After migration, the infrastructure layer reduces to:

**`entrypoint.ts` (~45 lines)** — `createWorkflowCli` call with `defineRoutes`, `defineHooks`, `preToolUseHandler`, and `buildWorkflowDeps`

**`workflow-definition.ts` (~50 lines)** — `WorkflowDefinition` implementation with `getRegistry`, `buildTransitionContext`, `buildTransitionEvent` (encodes `onEntry` mutations), `parseStateName`

**`workflow.ts` changes** — `defineRecordingOps` declaration (~20 lines) + `executeRecording` method (~6 lines) + `appendEvent` method (~15 lines, including autoFetchFeedback side effect), replacing ~260 lines of hand-written recording methods, transition logic, check methods, and identity verification.

**Total new infrastructure: ~130 lines** (down from ~1000).

---

## 2. Design Principles

1. **Match the platform's delivered API exactly** — No speculative design. Use the APIs as they shipped. Verified against the installed package.

2. **Zero domain behavior change** — Every existing behavior is preserved. Events, state transitions, guards, fold — all unchanged. The `onEntry` mutation encoding in events is a fix to a pre-existing event-sourcing gap, not a behavior change (runtime behavior was always correct; only event replay was broken).

3. **Incremental migration** — Each milestone produces a working, testable system. No big-bang rewrite.

4. **Delete, don't refactor** — Files being replaced are deleted entirely, not gradually refactored. Clean cuts.

5. **Accept infrastructure differences** — DB path moves from `~/.claude/workflow-events.db` to `${pluginRoot}/workflow.db`. Env file path moves from `CLAUDE_ENV_FILE` env var to hardcoded `~/.claude/claude.env`. Session data is ephemeral (scoped to task lifecycle), so no migration needed.

---

## 3. What We're Building

Migration of dev-workflow-v2 from hand-wired infrastructure to the platform's declarative CLI layer.

### 3.1 Engine Interface Migration

**`WorkflowFactory` -> `WorkflowDefinition`**

The current `WORKFLOW_ADAPTER` implements `WorkflowFactory` (a type that no longer exists in the platform). It becomes a `WorkflowDefinition` with additional methods:

```typescript
// Before (workflow-adapter.ts)
export const WORKFLOW_ADAPTER: WorkflowFactory<Workflow, WorkflowState, WorkflowDeps> = {
  createFresh, rehydrate, procedurePath, initialState,
  getEmojiForState: (state) => STATE_EMOJI_MAP[parseStateName(state)],  // REMOVE
  getOperationBody: (op) => getOperationBody(op),    // signature changes
  getTransitionTitle: (to) => getTransitionTitle(to), // signature changes
}

// After (workflow-definition.ts)
export const WORKFLOW_DEFINITION: WorkflowDefinition<
  Workflow, WorkflowState, WorkflowDeps, StateName, WorkflowOperation
> = {
  createFresh, rehydrate, procedurePath, initialState,
  getRegistry: () => WORKFLOW_REGISTRY,
  buildTransitionContext: (state, from, to, deps) => {
    const prChecksPass = state.prNumber === undefined
      ? false
      : deps.checkPrChecks(state.prNumber)
    return { state, gitInfo: deps.getGitInfo(), prChecksPass, from, to }
  },
  buildTransitionEvent: (from, to, stateBefore, stateAfter, now) => {
    // Encode onEntry mutations in the event so they survive event replay
    const overrides: Record<string, unknown> = {}
    for (const key of Object.keys(stateAfter) as (keyof WorkflowState)[]) {
      if (key === 'currentStateMachineState') continue // fold handles this
      if (stateAfter[key] !== stateBefore[key]) {
        overrides[key] = stateAfter[key]
      }
    }
    return {
      type: 'transitioned', at: now, from, to,
      ...(Object.keys(overrides).length > 0 ? { stateOverrides: overrides } : {}),
    }
  },
  parseStateName,
  getOperationBody: (op, _state) => getOperationBody(op),     // 2-arg wrapper
  getTransitionTitle: (to, _state) => getTransitionTitle(to),  // 2-arg wrapper
  getPrefixConfig: undefined, // we don't use identity verification
}
```

**Why `buildTransitionEvent` encodes `onEntry` mutations:**

The engine computes `stateAfter = onEntry(stateBefore, ctx)` but only passes `stateAfter` to `buildTransitionEvent` — it never applies `stateAfter` to the workflow. The `workflow.appendEvent(transitionEvent)` runs the fold, which only sets `currentStateMachineState` and `preBlockedState`. Without encoding `onEntry` mutations in the event, the IMPLEMENTING state's flag resets (6 boolean fields) and ADDRESSING_FEEDBACK's resets (3 fields) are silently lost at runtime.

This also fixes a pre-existing event-sourcing gap: `onEntry` mutations were never captured in events, so they were lost during event replay (rehydration). Now they're properly event-sourced.

The fold update:

```typescript
// Before (fold.ts)
function applyTransitioned(state, event) {
  return {
    ...state,
    currentStateMachineState: event.to,
    preBlockedState: event.to === 'BLOCKED' ? event.from : undefined,
  }
}

// After
function applyTransitioned(state, event) {
  return {
    ...state,
    ...(event.stateOverrides ?? {}),
    currentStateMachineState: event.to,
    preBlockedState: event.to === 'BLOCKED' ? event.from : undefined,
  }
}
```

The `TRANSITIONED_SCHEMA` adds `stateOverrides: z.record(z.unknown()).optional()`.

**`RehydratableWorkflow` — `transitionTo` replaced by `appendEvent`**

The `Workflow` class drops `transitionTo()`, `checkBashAllowed()`, `checkWriteAllowed()`, `buildTransitionContext()`, and `verifyIdentity()`. It adds `appendEvent()`:

```typescript
// Added
appendEvent(event: BaseEvent): void {
  const workflowEvent = WORKFLOW_EVENT_SCHEMA.parse(event)
  this.pendingEvents = [...this.pendingEvents, workflowEvent]
  this.state = applyEvent(this.state, workflowEvent)

  // Side effect: auto-fetch feedback when transitioning to CHECKING_FEEDBACK
  if (
    workflowEvent.type === 'transitioned' &&
    workflowEvent.to === 'CHECKING_FEEDBACK' &&
    this.state.prNumber !== undefined
  ) {
    this.autoFetchFeedback(this.state.prNumber)
  }
}

// Deleted: transitionTo(), checkBashAllowed(), checkWriteAllowed(),
//          buildTransitionContext(), verifyIdentity()
```

The `autoFetchFeedback` side effect fires inside `appendEvent` when it detects a transition to CHECKING_FEEDBACK. The engine calls `workflow.appendEvent(transitionEvent)` during its `transition()` lifecycle, so the side effect triggers automatically. The engine then persists all pending events (transition + feedback-checked) atomically afterward.

**`startSession` signature alignment**

The platform's `RehydratableWorkflow.startSession` requires `(transcriptPath: string | undefined, repository: string | undefined)`. Our current signature is `(repository: string | undefined)`. Update to match:

```typescript
// Before
startSession(repository: string | undefined): void

// After
startSession(transcriptPath: string | undefined, repository: string | undefined): void
```

**`WorkflowState` type tightening**

`BaseWorkflowState` is now parameterized: `BaseWorkflowState<TStateName extends string>`. Our `WorkflowState.currentStateMachineState` changes from `string` to `StateName` to satisfy `BaseWorkflowState<StateName>`.

### 3.2 Write Check Infrastructure

The engine's `checkWrite()` only calls the consumer's predicate when `forbidden.write === true` for the current state. Without this flag, writes are auto-allowed — bypassing our protected file list.

Our current behavior blocks protected files (nx.json, tsconfig.base.json, etc.) in ALL states. To preserve this, we add `forbidden: { write: true }` to every state definition:

```typescript
// Each state definition gains:
forbidden: { write: true },
```

Note: the engine's `checkBash()` has NO equivalent per-state flag — it always runs the check regardless. The asymmetry is by design: `forbidden.write` exists because some states allow all writes, while bash checks always apply.

The `checkWriteAllowed` predicate in `workflow-predicates.ts` stays, but wraps to match the engine's expected `(toolName, filePath, state) => PreconditionResult`:

```typescript
export function isWriteAllowed(
  _toolName: string, filePath: string, _state: WorkflowState,
): PreconditionResult {
  return checkWriteAllowed(filePath)
}
```

### 3.3 Recording Operations

16 hand-written recording methods on `Workflow` class become a `defineRecordingOps` declaration:

```typescript
const RECORDING_OPS = defineRecordingOps<StateName, WorkflowState, WorkflowOperation>(
  WORKFLOW_REGISTRY,
  {
    'record-issue':                       { event: 'issue-recorded',              payload: (n: number) => ({ issueNumber: n }) },
    'record-branch':                      { event: 'branch-recorded',             payload: (b: string) => ({ branch: b }) },
    'record-architecture-review-passed':  { event: 'architecture-review-completed', payload: () => ({ passed: true }) },
    'record-architecture-review-failed':  { event: 'architecture-review-completed', payload: () => ({ passed: false }) },
    'record-code-review-passed':          { event: 'code-review-completed',       payload: () => ({ passed: true }) },
    'record-code-review-failed':          { event: 'code-review-completed',       payload: () => ({ passed: false }) },
    'record-bug-scanner-passed':          { event: 'bug-scanner-completed',       payload: () => ({ passed: true }) },
    'record-bug-scanner-failed':          { event: 'bug-scanner-completed',       payload: () => ({ passed: false }) },
    'record-task-check-passed':           { event: 'task-check-passed',           payload: () => ({}) },
    'record-pr':                          { event: 'pr-recorded',                 payload: (n: number, url?: string) => ({ prNumber: n, ...(url ? { prUrl: url } : {}) }) },
    'record-ci-passed':                   { event: 'ci-completed',                payload: () => ({ passed: true }) },
    'record-ci-failed':                   { event: 'ci-completed',                payload: (output: string) => ({ passed: false, output }) },
    'record-feedback-clean':              { event: 'feedback-checked',            payload: () => ({ clean: true }) },
    'record-feedback-exists':             { event: 'feedback-checked',            payload: (count: number) => ({ clean: false, unresolvedCount: count }) },
    'record-feedback-addressed':          { event: 'feedback-addressed',          payload: (count: number) => ({ addressedCount: count }) },
    'record-reflection':                  { event: 'reflection-written',          payload: (p: string) => ({ path: p }) },
  },
)
```

**Type signature risk:** The platform's `defineRecordingOps` types the ops parameter with `RecordingOpDefinition<readonly never[]>`. Payload functions with typed args (like `(n: number) => ...`) may not be directly assignable. If compilation fails, cast the ops object via `as const satisfies` or similar — the runtime `executeOp` passes args correctly regardless.

The Workflow class gets a single `executeRecording` method:

```typescript
executeRecording(op: WorkflowOperation, ...args: readonly unknown[]): PreconditionResult {
  const result = RECORDING_OPS.executeOp(op, this.state, this.deps.now(), args)
  if (!result.pass) return fail(result.reason)
  this.appendEvent(result.event)
  return pass()
}
```

Routes then call `w.executeRecording('record-issue', n)` instead of `w.recordIssue(n)`.

### 3.4 Declarative CLI Layer

**Routes** — replace 307-line `command-handlers.ts` + 83-line `workflow-cli.ts`:

```typescript
const ROUTES = defineRoutes<Workflow, WorkflowState>({
  init:       { type: 'session-start' },
  transition: { type: 'transition', args: [arg.state('STATE', STATE_NAME_SCHEMA)] },

  'record-issue':                      { type: 'transaction', args: [arg.number('number')],                       handler: (w, n) => w.executeRecording('record-issue', n) },
  'record-branch':                     { type: 'transaction', args: [arg.string('branch')],                       handler: (w, b) => w.executeRecording('record-branch', b) },
  'record-architecture-review-passed': { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-architecture-review-passed') },
  'record-architecture-review-failed': { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-architecture-review-failed') },
  'record-code-review-passed':         { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-code-review-passed') },
  'record-code-review-failed':         { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-code-review-failed') },
  'record-bug-scanner-passed':         { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-bug-scanner-passed') },
  'record-bug-scanner-failed':         { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-bug-scanner-failed') },
  'record-task-check-passed':          { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-task-check-passed') },
  'record-pr':                         { type: 'transaction', args: [arg.number('number'), arg.string('url').optional()], handler: (w, n, url) => w.executeRecording('record-pr', n, url) },
  'record-ci-passed':                  { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-ci-passed') },
  'record-ci-failed':                  { type: 'transaction', args: [arg.string('output')],                       handler: (w, o) => w.executeRecording('record-ci-failed', o) },
  'record-feedback-clean':             { type: 'transaction', args: [],                                           handler: (w) => w.executeRecording('record-feedback-clean') },
  'record-feedback-exists':            { type: 'transaction', args: [arg.number('count')],                        handler: (w, c) => w.executeRecording('record-feedback-exists', c) },
  'record-feedback-addressed':         { type: 'transaction', args: [arg.number('count')],                        handler: (w, c) => w.executeRecording('record-feedback-addressed', c) },
  'record-reflection':                 { type: 'transaction', args: [arg.string('path')],                         handler: (w, p) => w.executeRecording('record-reflection', p) },
})
```

**Hooks** — replace 133-line `hook-handlers.ts`:

```typescript
const HOOKS = defineHooks<Workflow>({
  // dev-workflow-v2 uses preToolUseHandler (engine-level) instead of per-tool hooks
})
```

**PreToolUse handler** — engine-level handler for write + bash checks:

```typescript
const preToolUseHandler: PreToolUseHandlerFn<
  Workflow, WorkflowState, WorkflowDeps, StateName, WorkflowOperation
> = (engine, sessionId, toolName, toolInput, transcriptPath) => {
  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = extractField('file_path')(toolInput)
    return engine.checkWrite(sessionId, toolName, filePath, isWriteAllowed, transcriptPath)
  }
  if (toolName === 'Bash') {
    const command = extractField('command')(toolInput)
    return engine.checkBash(sessionId, toolName, command, BASH_FORBIDDEN, transcriptPath)
  }
  return { type: 'success', output: '' }
}
```

**Behavior change with `extractField`:** The platform's `extractField` returns empty string for missing/null fields. Our current code throws `WorkflowError` with descriptive messages. After migration, malformed hook inputs with missing fields will pass empty strings to the engine checks rather than throwing. This is accepted — the engine's checks will handle empty strings appropriately (empty commands pass bash checks, empty file paths pass write checks), and malformed hook inputs from Claude Code are an edge case not worth custom error handling.

**SessionStart hook behavior change:** The platform's runner calls both `engine.startSession()` AND `engine.persistSessionId()` on SessionStart hooks. Our current hook handler only calls `persistSessionId()`. After migration, session creation happens via both the `init` CLI command AND the SessionStart hook. This is correct — the engine's `startSession` is idempotent (returns early if session exists).

**CLI entrypoint** — replace `composition-root.ts` + `environment.ts` + `stdin.ts` + process boundary:

```typescript
createWorkflowCli({
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  hooks: HOOKS,
  preToolUseHandler,
  buildWorkflowDeps: (platform) => ({
    getGitInfo,
    checkPrChecks: () => true,
    getPrFeedback: createGetPrFeedback(runGh),
    now: platform.now,
  }),
})
```

**`WorkflowCliConfig` type limitation:** `WorkflowCliConfig` only has 3 type params (`TWorkflow`, `TState`, `TDeps`), defaulting `TStateName` to `string` and `TOperation` to `string`. The `preToolUseHandler` typed with specific `StateName`/`WorkflowOperation` may need widening or casting. If type inference fails, widen the handler's generic params.

---

## 4. What We're NOT Building

| Exclusion | Rationale |
|-----------|-----------|
| Changes to fold logic, guards, or transition rules | Event structure and state machine behavior unchanged |
| Changes to state markdown files | Agent instructions are hand-authored content |
| New platform features | Using delivered APIs only |
| Changes to `get-pr-feedback.ts` | Domain-specific infra, not platform concern |
| Changes to `infra/cli/git.ts` | Domain-specific infra (`getGitInfo`, `runGh`), survives the migration |
| DB migration | Session data is ephemeral — no value in migrating old DB |

**Note:** Adding `forbidden: { write: true }` to state definitions and `stateOverrides` to the transitioned event schema ARE domain-layer changes. They are necessary to preserve existing behavior when adopting engine-owned transitions and write checks — not feature additions.

---

## 5. Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | All domain tests pass (fold, events, transitions, recording ops) | `pnpm nx test dev-workflow-v2` green |
| 2 | `command-handlers.ts` deleted | File gone |
| 3 | `hook-handlers.ts` deleted | File gone |
| 4 | `workflow-cli.ts` replaced with `createWorkflowCli` call | File rewritten |
| 5 | `hook-io.ts` deleted | File gone |
| 6 | `composition-root.ts` deleted | File gone |
| 7 | `environment.ts` deleted | File gone |
| 8 | `operation-result.ts` deleted | File gone |
| 9 | `stdin.ts` deleted | File gone |
| 10 | `workflow-error.ts` deleted | File gone (orphaned — all consumers deleted) |
| 11 | 16 recording methods replaced by `defineRecordingOps` | `executeRecording` on Workflow |
| 12 | `transitionTo` removed from Workflow | Engine owns transitions |
| 13 | `checkBashAllowed` removed from Workflow | Engine owns bash checks |
| 14 | `checkWriteAllowed` method removed from Workflow | Engine owns write checks |
| 15 | `verifyIdentity` removed from Workflow | Engine handles via `getPrefixConfig` |
| 16 | `checkOperationGate` removed from `workflow-predicates.ts` | Platform's `defineRecordingOps` owns gate checks |
| 17 | `STATE_EMOJI_MAP` removed | Derived from registry |
| 18 | `onEntry` mutations encoded in transition events | `buildTransitionEvent` produces `stateOverrides` |
| 19 | Infrastructure test files deleted | `operation-result.spec.ts`, `environment.spec.ts`, `hook-io.spec.ts`, `workflow-error.spec.ts` gone |
| 20 | CLI integration tests rewritten for `createWorkflowRunner` | `workflow-cli.spec.ts`, `workflow-cli-hooks.spec.ts` updated |
| 21 | Net deletion of ~800+ lines of infrastructure code | `git diff --stat` |
| 22 | `pnpm verify` passes | Full gate green |

---

## 6. Milestones

### M1: Engine interface migration

Adapt Workflow class, adapter, state definitions, types, and event schemas to the new `WorkflowDefinition` interface. Engine owns transitions, bash checks, and write checks.

#### Deliverables

- **D1.1:** `WorkflowDefinition` adapter
  - Rename `WORKFLOW_ADAPTER` to `WORKFLOW_DEFINITION`
  - Change type from `WorkflowFactory` to `WorkflowDefinition<Workflow, WorkflowState, WorkflowDeps, StateName, WorkflowOperation>`
  - Add `getRegistry()` returning `WORKFLOW_REGISTRY`
  - Add `buildTransitionContext(state, from, to, deps)` — moved from Workflow class
  - Add `buildTransitionEvent(from, to, stateBefore, stateAfter, now)` — encodes `onEntry` mutations as `stateOverrides` in the event (see Section 3.1)
  - Add `parseStateName` — delegates to existing function
  - Wrap `getOperationBody(op, _state)` and `getTransitionTitle(to, _state)` — platform requires 2-arg signatures
  - Remove `getEmojiForState` — engine reads from registry
  - Set `getPrefixConfig: undefined` — we don't use identity verification
  - Key scenarios: adapter compiles, fresh workflow creation, event rehydration, unknown event rejection, transition events carry stateOverrides when onEntry mutates state, transition events omit stateOverrides when onEntry doesn't mutate
  - Acceptance: Adapter compiles against new `WorkflowDefinition` interface
  - Verification: Update `workflow-adapter.spec.ts` → `workflow-definition.spec.ts`: remove `getEmojiForState` tests, add `getRegistry`/`buildTransitionContext`/`buildTransitionEvent` tests

- **D1.2:** Workflow class — engine-owned behaviors
  - Add `appendEvent(event: BaseEvent)` — parse with `WORKFLOW_EVENT_SCHEMA`, append, apply, trigger `autoFetchFeedback` side effect when transitioning to CHECKING_FEEDBACK
  - Align `startSession(transcriptPath, repository)` — add `transcriptPath` parameter to match `RehydratableWorkflow` interface
  - Remove `transitionTo()` — engine's `transition()` handles full lifecycle
  - Remove `buildTransitionContext()` — moved to `WorkflowDefinition`
  - Remove `checkBashAllowed()` — engine's `checkBash()` handles this
  - Remove `checkWriteAllowed()` method — engine's `checkWrite()` handles this
  - Remove `verifyIdentity()` — engine handles via `getPrefixConfig`
  - Keep `autoFetchFeedback()` as private method — called from within `appendEvent`
  - Key scenarios: appendEvent with transition event, appendEvent with recording event, appendEvent with transition to CHECKING_FEEDBACK triggers autoFetchFeedback, appendEvent with transition to other states doesn't trigger autoFetchFeedback, autoFetchFeedback skipped when no prNumber, startSession with both params
  - Acceptance: Workflow class has no transition, check, or identity methods; `appendEvent` preserves autoFetchFeedback behavior
  - Verification: Domain tests updated and passing. Test files affected:
    - `workflow-implementing.spec.ts` (168 lines) — update `transitionTo`/`startSession` calls
    - `workflow-reviewing-submitting.spec.ts` (326 lines) — update `transitionTo` calls
    - `workflow-feedback-reflecting.spec.ts` (299 lines) — update `transitionTo` calls, verify autoFetchFeedback still fires via `appendEvent`
    - `workflow-hook-checks.spec.ts` (202 lines) — remove `checkBashAllowed`/`checkWriteAllowed`/`verifyIdentity` tests from Workflow. The `checkWriteAllowed` predicate is tested via `workflow-predicates.ts`. Bash enforcement behavior becomes engine-level (platform tests cover it). Per-state exemption behavior is verified via integration tests in M2.

- **D1.3:** Event schema and fold updates
  - Update `TRANSITIONED_SCHEMA` to accept `stateOverrides: z.record(z.unknown()).optional()`
  - Update `applyTransitioned` in `fold.ts` to spread `stateOverrides` before `currentStateMachineState` and `preBlockedState`
  - Key scenarios: transition without onEntry → no stateOverrides in event; transition to IMPLEMENTING → stateOverrides resets 6 boolean flags; transition to ADDRESSING_FEEDBACK → stateOverrides resets 3 fields; fold with stateOverrides applies them; fold without stateOverrides is backward-compatible
  - Acceptance: Transition events carry onEntry mutations; fold applies them
  - Verification: `fold.spec.ts` updated with new test cases for stateOverrides

- **D1.4:** Type changes and dead code removal
  - Delete `STATE_EMOJI_MAP` from `workflow-types.ts` — engine derives emoji from `registry[state].emoji`
  - Update `WorkflowState.currentStateMachineState` from `string` to `StateName` to satisfy `BaseWorkflowState<StateName>`. Note: `preBlockedState` stays `string | undefined` (stores pre-BLOCKED state name as serialized value)
  - Remove `checkOperationGate` from `workflow-predicates.ts` — platform's `defineRecordingOps` owns gate checks via its internal `checkOperationGate`
  - Acceptance: No emoji map, stricter state name typing, no dead gate check code
  - Verification: Type check passes, tests pass

- **D1.5:** State definition changes
  - Add `forbidden: { write: true }` to all 9 state definitions (implementing, reviewing, submitting-pr, awaiting-ci, checking-feedback, addressing-feedback, reflecting, complete, blocked)
  - This preserves current behavior: engine's `checkWrite()` only calls the predicate when `forbidden.write` is set
  - Create `isWriteAllowed(toolName, filePath, state)` wrapper in `workflow-predicates.ts` that delegates to existing `checkWriteAllowed(filePath)`
  - Acceptance: Every state has `forbidden.write: true`; write predicate wrapper matches engine's expected signature
  - Verification: Existing tests pass

- **D1.6:** File rename
  - Rename `workflow-adapter.ts` to `workflow-definition.ts`
  - Rename `workflow-adapter.spec.ts` to `workflow-definition.spec.ts`
  - Update barrel exports in `workflow-definition/index.ts`
  - Update all imports throughout codebase
  - Acceptance: Imports consistent, no references to old filename
  - Verification: Build passes

---

### M2: Recording ops + CLI layer

Replace hand-written recording methods and CLI infrastructure with platform declarative APIs.

#### Deliverables

- **D2.1:** `defineRecordingOps` adoption
  - Declare all 16 recording operations mapping to their events and payloads
  - Add `executeRecording(op, ...args)` method to Workflow class
  - Delete 16 individual recording methods (`recordIssue`, `recordBranch`, etc.)
  - Key scenarios: each recording op produces identical events to the method it replaces; gate check blocks ops in wrong state; unknown op handled
  - Acceptance: Recording operations produce identical events
  - Verification: Domain tests updated and passing. ~72 recording method call sites across 3 test files updated to use `executeRecording`:
    - `workflow-implementing.spec.ts`
    - `workflow-reviewing-submitting.spec.ts`
    - `workflow-feedback-reflecting.spec.ts`

- **D2.2:** Declarative routes
  - Create `defineRoutes` declaration with `init` (session-start) + transition + 16 recording routes
  - Transition route uses `type: 'transition'` — engine owns full transition lifecycle
  - Recording routes use `type: 'transaction'` with `w.executeRecording(op, ...)`
  - Session ID injected by platform — not in route args
  - Delete `infra/cli/command-handlers.ts` (307 lines)
  - Key scenarios: init creates session, transition routes to valid state, transition blocked by guard, recording op succeeds, recording op blocked by gate, unknown command error, missing arg error
  - Acceptance: All commands route correctly via `createWorkflowRunner`
  - Verification: CLI command tests rewritten using `createWorkflowRunner`. Test fixture `progressToState` and `AdapterDeps` rewritten for new runner API. Replaces `workflow-cli.spec.ts` and `workflow-cli-test-fixtures.ts`.

- **D2.3:** Hook migration
  - Create `preToolUseHandler` function with engine access for write + bash checks
  - Uses `engine.checkWrite()` with `isWriteAllowed` wrapper and `engine.checkBash()` with `BASH_FORBIDDEN` config
  - Engine reads per-state bash exemptions from registry internally — no consumer logic needed
  - Create empty `defineHooks` (dev-workflow-v2 uses preToolUseHandler, not per-tool hooks)
  - Delete `infra/cli/hook-handlers.ts` (133 lines)
  - Key scenarios: Write to protected file blocked, Write to normal file allowed, Bash forbidden command blocked, Bash exempt command allowed in SUBMITTING_PR, non-Bash/Write tool passes through, SessionStart creates session and persists ID
  - Acceptance: Hook routing produces identical behavior
  - Verification: Hook tests rewritten using `createWorkflowRunner` (replaces `workflow-cli-hooks.spec.ts`)

- **D2.4:** Platform-owned entrypoint
  - Rewrite `entrypoint/workflow-cli.ts` to single `createWorkflowCli` call
  - Platform owns: env vars (`CLAUDE_PLUGIN_ROOT`, `CLAUDE_SESSION_ID`), store creation (`${pluginRoot}/workflow.db`), engine dep assembly, process boundary, stdin reading, error logging, env file path (`~/.claude/claude.env`)
  - Consumer provides: `buildWorkflowDeps(platform)` with `getGitInfo`, `checkPrChecks`, `getPrFeedback`, `now`
  - Note: `infra/cli/git.ts` is NOT deleted — it contains domain-specific infra (`getGitInfo`, `runGh`)
  - Delete `shell/composition-root.ts` (50 lines)
  - Delete `infra/cli/environment.ts` (35 lines)
  - Delete `infra/cli/operation-result.ts` (28 lines)
  - Delete `infra/cli/stdin.ts` (7 lines)
  - Delete `infra/cli/hook-io.ts` (59 lines) — platform owns schemas + formatDenyDecision
  - Delete `domain/workflow-error.ts` (15 lines) — orphaned, all consumers deleted
  - Delete corresponding test files: `operation-result.spec.ts` (39 lines), `environment.spec.ts` (76 lines), `hook-io.spec.ts` (87 lines), `workflow-error.spec.ts` (varies)
  - Acceptance: CLI entrypoint is a single `createWorkflowCli` call; no infra/cli files remain except `git.ts`
  - Verification: `pnpm verify` green

---

## 7. Parallelization

M1 must complete before M2. Within M1, D1.1-D1.4 have internal dependencies (adapter → workflow → schema → types), D1.5 (state definitions) is independent, D1.6 (rename) depends on D1.1. Within M2, deliverables have dependencies:

- D2.1 (recording ops) before D2.2 (routes use `executeRecording`)
- D2.3 (hooks) independent of D2.1/D2.2
- D2.4 (entrypoint) depends on D2.2 and D2.3

```yaml
tracks:
  - id: A
    name: Migration
    deliverables:
      - M1
      - D2.1
      - D2.2
      - D2.4
  - id: B
    name: Hook migration
    deliverables:
      - M1
      - D2.3
```

---

## 8. Decisions Log

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | `defineRecordingOps` adopted for mechanical recording methods | Eliminates ~180 lines of gate-check, append, pass boilerplate. Routes remain explicit with `w.executeRecording(op, ...)`. | 2026-03-07 |
| 2 | PreToolUse uses engine-level `preToolUseHandler` (Option C) | Our PreToolUse hook needs sequential engine calls (write check then bash check) with early returns. `defineHooks`' per-tool hooks only have workflow access, not engine access. Engine-level handler is the escape hatch. | 2026-03-07 |
| 3 | `createWorkflowCli` owns dep assembly with `buildWorkflowDeps(platform)` | Platform builds all generic engine infrastructure. Consumer only provides domain-specific deps. `PlatformContext` exposes `getPluginRoot`, `now`, `getSessionId`, `store` for consumer deps that need them. | 2026-03-07 |
| 4 | Session ID injected by platform, not positional arg | Eliminates redundant `arg.string('session-id')` declarations. Platform reads `CLAUDE_SESSION_ID` from env and passes to engine calls internally. | 2026-03-07 |
| 5 | Platform package updated and verified locally | All required APIs confirmed to exist. `WorkflowFactory` type removed — migration is urgent. | 2026-03-07 |
| 6 | `autoFetchFeedback` implemented as side effect in `appendEvent` | `afterEntry: () => void` has no access to deps, state, or the workflow instance. Moving the side effect into `appendEvent` — triggered when the appended event is a transition to CHECKING_FEEDBACK — preserves automatic behavior without requiring platform changes. The engine calls `workflow.appendEvent(transitionEvent)` during its `transition()` lifecycle, so the side effect fires at the right time, and the engine persists all pending events atomically afterward. | 2026-03-07 |
| 7 | DB path and env file path changes accepted | `createWorkflowCli` creates store at `${pluginRoot}/workflow.db` (was `~/.claude/workflow-events.db`). Env file hardcoded to `~/.claude/claude.env` (was `CLAUDE_ENV_FILE` env var). Session data is ephemeral. No migration value. | 2026-03-07 |
| 8 | `forbidden: { write: true }` added to all state definitions | Engine's `checkWrite()` only calls the consumer predicate when `forbidden.write` is set. Without it, all writes auto-pass, bypassing our protected file list. Setting the flag on all states preserves current behavior. | 2026-03-07 |
| 9 | `checkWriteAllowed` predicate wrapped for engine signature | Engine's `checkWrite()` expects `(toolName, filePath, state) => PreconditionResult`. Our predicate only uses `filePath`. Thin wrapper ignores `toolName` and `state`, delegates to existing `checkWriteAllowed(filePath)`. | 2026-03-07 |
| 10 | `onEntry` mutations encoded in transition events via `buildTransitionEvent` | Engine computes `stateAfter = onEntry(stateBefore)` but doesn't apply it to the workflow — it only passes `stateAfter` to `buildTransitionEvent`. Our `buildTransitionEvent` diffs `stateBefore` and `stateAfter`, encoding changes as `stateOverrides` in the event. The fold applies these overrides. This also fixes a pre-existing event-sourcing gap where `onEntry` mutations were lost during event replay. | 2026-03-07 |
| 11 | `extractField` empty string behavior accepted | Platform's `extractField` returns `''` for missing fields. Our current code throws. After migration, malformed hook inputs pass empty strings to engine checks. Accepted — empty strings produce no-op results, and malformed Claude Code hook inputs are an edge case. | 2026-03-07 |
| 12 | SessionStart hook now creates session + persists ID | Platform runner calls both `engine.startSession()` and `engine.persistSessionId()` on SessionStart. Our current hook only persisted. Accepted — `startSession` is idempotent (returns early if session exists). | 2026-03-07 |
