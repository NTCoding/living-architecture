# PRD: Agentic Workflow Builder — CLI & Workflow Automation Layer

**Status:** Draft
**Target Package:** `@ntcoding/agentic-workflow-builder`
**Requested By:** dev-workflow-v2 (consumer)

---

## 1. Problem

Building a workflow plugin on top of `@ntcoding/agentic-workflow-builder` requires the consumer to hand-write ~1,000 lines of mechanical infrastructure code. For every workflow operation (e.g., `record-issue`), the consumer must touch 6+ files with near-identical boilerplate. The platform provides a solid event-sourcing engine and state machine DSL, but forces the consumer to manually wire every seam between domain logic and the Claude Code plugin runtime.

### Quantified Waste

Adding a single new operation (e.g., `record-security-scan-passed`) requires changes to **9 files**:

| # | File | Change | Unique Domain Knowledge? |
|---|------|--------|--------------------------|
| 1 | `workflow-types.ts` | Add union member to `WorkflowOperation` | No — derived from operation name |
| 2 | `workflow-events.ts` | Add Zod event schema | **Yes** |
| 3 | `fold.ts` | Add `case` in switch to apply event | **Yes** |
| 4 | `workflow.ts` | Add method (gate + append + return) | No — mechanical pattern |
| 5 | `command-handlers.ts` | Add handler function (parse args + engine.transaction) | No — mechanical pattern |
| 6 | `workflow-cli.ts` | Add import + entry in `COMMAND_HANDLERS` map | No — mechanical wiring |
| 7 | State `.ts` file | Add to `allowedWorkflowOperations` | **Yes** |
| 8 | State `.md` file | Add TODO item with CLI invocation | Partial |
| 9 | `workflow-types.ts` | Add state property + initial value (if needed) | **Yes** |

Only 3 of 9 are genuinely unique domain knowledge. The other 6 are mechanical derivations the platform should handle.

### Current Consumer Infrastructure (Lines of Code)

| File | Lines | Purpose | Should Be Platform? |
|------|-------|---------|---------------------|
| `command-handlers.ts` | 307 | 17 handler functions (parse args → engine.transaction) | **Yes** |
| `hook-handlers.ts` | 133 | Route hook events, extract tool inputs | **Yes** |
| `workflow-cli.ts` | 83 | Command routing, process boundary | **Yes** |
| `hook-io.ts` | 59 | Hook protocol (Zod schemas, exit codes, deny format) | **Yes** |
| `composition-root.ts` | 50 | Dependency assembly | **Yes** |
| `environment.ts` | 34 | Read env vars (CLAUDE_SESSION_ID, etc.) | **Yes** |
| `operation-result.ts` | 28 | Map EngineResult → exit codes | **Yes** |
| `stdin.ts` | 7 | Read stdin synchronously | **Yes** |
| `output-messages.ts` | 8 | Trivial string formatting | **Yes** |
| `workflow.ts` (infra portion) | ~250 | 14 mechanical recording methods + transitionTo + bash/write checks | **Yes** |
| **Total** | **~959** | | |

After this PRD, the consumer's infrastructure code should be **~50 lines** of declarative configuration.

---

## 2. Design Principles

1. **Declare, don't implement** — The consumer declares the shape of operations, events, and checks. The platform generates handlers, methods, and wiring. If a pattern repeats across every workflow, the platform owns it.

2. **Own the process boundary** — The platform owns everything between `process.argv` and the domain: arg parsing, stdin reading, exit codes, error logging, env var reading, store creation, stdout formatting. The consumer never touches `process` directly.

3. **Own the protocol** — Claude Code's hook protocol (stdin JSON shape, exit codes, deny formatting, event routing) is a platform concern. The consumer declares which tools to check and what checks to run, not how to parse hook events.

4. **Engine owns generic workflow behavior** — `transitionTo`, `checkBashAllowed`, and `checkWriteAllowed` are generic state-machine operations that read from the registry and state definitions the platform already owns. The consumer should not re-implement them.

5. **Preserve testability** — All platform-generated behavior must be testable via the existing `workflowSpec` testing DSL. The consumer must be able to test their domain logic (guards, fold, events) without running the CLI layer.

6. **Backward compatible** — Existing consumers that hand-wire everything must continue to work. The new CLI layer is opt-in. The existing `WorkflowEngine`, `WorkflowFactory`, and DSL types remain unchanged.

---

## 3. What We're Building

### 3.1 Declarative Command Definitions (`./cli`)

A new export `@ntcoding/agentic-workflow-builder/cli` that lets consumers declare CLI commands with typed argument schemas.

#### API

```typescript
import { defineCommands, arg } from '@ntcoding/agentic-workflow-builder/cli'

const commands = defineCommands({
  'init': {
    handler: (w) => w.startSession(),
  },
  'transition': {
    args: [arg.state('state')],
    handler: (w, state) => w.transitionTo(state),
  },
  'record-issue': {
    args: [arg.number('number')],
    handler: (w, n) => w.recordIssue(n),
  },
  'record-branch': {
    args: [arg.string('branch')],
    handler: (w, s) => w.recordBranch(s),
  },
  'record-pr': {
    args: [arg.number('number'), arg.string('url').optional()],
    handler: (w, n, url) => w.recordPr(n, url),
  },
  'record-ci-passed': {
    handler: (w) => w.recordCiPassed(),
  },
})
```

#### `arg` Helpers

| Helper | Parses | Validation |
|--------|--------|------------|
| `arg.number(name)` | `parseInt(raw, 10)` | Checks non-null, non-NaN |
| `arg.string(name)` | Identity | Checks non-null |
| `arg.state(name)` | Identity + Zod state schema | Checks valid state name |
| Any `.optional()` | Same parsing | Allows undefined |

#### Error Messages

Auto-generated from the command name and arg name:

```text
record-issue: missing required argument <number>
record-issue: not a valid number: 'abc'
transition: invalid state 'INVALID'
```

Format: `{command-name}: {error description}`.

#### What the Platform Generates

Given a command definition, the platform generates a handler that:

1. Extracts positional args from `args[1]`, `args[2]`, etc.
2. Validates each arg according to its type (null check, parseInt, NaN check, state schema)
3. Returns `{ output: errorMessage, exitCode: 1 }` on validation failure
4. Calls `engine.transaction(sessionId, commandName, (w) => handler(w, ...parsedArgs))` for recording operations
5. Calls `engine.startSession(sessionId)` for `init`
6. Calls `engine.transition(sessionId, target)` for `transition`
7. Maps `EngineResult` → `{ output, exitCode }` using the standard mapping (success→0, blocked→2, error→1)

#### Special Commands: `init` and `transition`

`init` and `transition` are structurally different from recording operations:

- `init` calls `engine.startSession()`, not `engine.transaction()`
- `transition` calls `engine.transition()`, not `engine.transaction()`

The platform detects these by name (or by a `type` field in the definition) and routes accordingly:

```typescript
const commands = defineCommands({
  'init': {
    type: 'session-start',
    handler: (w) => w.startSession(),
  },
  'transition': {
    type: 'transition',
    args: [arg.state('state')],
    handler: (w, state) => w.transitionTo(state),
  },
  // All others default to type: 'transaction'
  'record-issue': {
    args: [arg.number('number')],
    handler: (w, n) => w.recordIssue(n),
  },
})
```

Default `type` is `'transaction'` (wraps in `engine.transaction()`).

---

### 3.2 Platform-Owned CLI Entrypoint (`createWorkflowCli`)

A function that creates a complete CLI entrypoint from configuration. The consumer calls this once and exports the result as their entrypoint module.

#### API

```typescript
import { createWorkflowCli } from '@ntcoding/agentic-workflow-builder/cli'

export default createWorkflowCli({
  adapter: WORKFLOW_ADAPTER,
  commands,
  hooks: hookConfig,
  workflowDeps: {
    getGitInfo,
    checkPrChecks: () => true,
    getPrFeedback: createGetPrFeedback(runGh),
  },
})
```

#### What the Platform Owns

**Process boundary:**
- Reads `process.argv`, slices to get command + args
- Detects hook mode (no command args → hook invocation)
- Writes result to `process.stdout`
- Calls `process.exit(exitCode)`
- Catches errors → writes to `process.stderr` + appends to error log file

**Environment variables (Claude Code conventions):**
- `CLAUDE_SESSION_ID` — session identifier
- `CLAUDE_PLUGIN_ROOT` — plugin installation path
- `HOME` — user home directory (for `~/.claude/.env`)

The platform reads these and throws a clear error if missing. The consumer never reads env vars directly.

**Engine dependency assembly:**
- Creates SQLite store at `${pluginRoot}/workflow.db`
- Assembles `WorkflowEngineDeps`:
  - `store` — from SQLite
  - `getPluginRoot` — from env
  - `getEnvFilePath` — `${HOME}/.claude/.env`
  - `readFile` — `readFileSync(path, 'utf8')`
  - `appendToFile` — `appendFileSync(path, content)`
  - `now` — `() => new Date().toISOString()`
- Injects `now` into consumer's `workflowDeps` automatically (consumer no longer provides `now`)

**Command routing:**
- Looks up command name in the `commands` map
- Returns `{ output: "Unknown command: X", exitCode: 1 }` for unknown commands
- Dispatches to generated handler

**Error logging:**
- On uncaught error: `[ISO_TIMESTAMP] HOOK ERROR: {message}\n`
- Written to both stderr and `${pluginRoot}/error.log`

#### Consumer Provides

| Dependency | Type | Purpose |
|------------|------|---------|
| `adapter` | `WorkflowFactory` | Creates/rehydrates workflow instances |
| `commands` | From `defineCommands()` | Command definitions |
| `hooks` | From `defineHooks()` | Hook check definitions |
| `workflowDeps` | Consumer-defined type (minus `now`) | Domain-specific dependencies |

#### Exported for Testing

The platform also exports `createWorkflowRunner` (or similar) that returns the `runWorkflow(args, deps)` function without the process boundary, so consumers can test command routing in unit tests:

```typescript
import { createWorkflowRunner } from '@ntcoding/agentic-workflow-builder/cli'

// In tests:
const run = createWorkflowRunner({ adapter, commands, hooks })
const result = run(['record-issue', '42'], testDeps)
expect(result.exitCode).toBe(0)
```

---

### 3.3 Platform-Owned Hook Protocol (`defineHooks`)

A declarative way to specify which Claude Code tool calls to intercept and what checks to run.

#### API

```typescript
import { defineHooks, extractField } from '@ntcoding/agentic-workflow-builder/cli'

const hookConfig = defineHooks({
  preToolUse: {
    Bash: {
      extract: extractField('command'),
      check: (w, command) => w.checkBashAllowed('Bash', command),
    },
    Write: {
      extract: extractField('file_path'),
      check: (w, filePath) => w.checkWriteAllowed(filePath),
    },
    Edit: {
      extract: extractField('file_path'),
      check: (w, filePath) => w.checkWriteAllowed(filePath),
    },
  },
})
```

#### `extractField(fieldName)`

Returns a function that extracts a string field from `tool_input: Record<string, unknown>`. Throws a clear error if the field is missing or not a string:

```text
Expected Bash tool_input to have a "command" field
Expected tool_input.command to be string. Got number: 42
```

#### What the Platform Handles

**SessionStart hook (always handled, no consumer config needed):**
1. Parse stdin JSON
2. Call `engine.persistSessionId(sessionId)`
3. Return `{ output: '', exitCode: 0 }`

**PreToolUse hook:**
1. Parse stdin JSON with Zod schema: `{ session_id, hook_event_name, tool_name, tool_input, transcript_path? }`
2. Look up `tool_name` in consumer's `preToolUse` map
3. If tool not in map → `{ output: '', exitCode: 0 }` (allow)
4. If no active session → `{ output: '', exitCode: 0 }` (allow)
5. Call `extract(tool_input)` to get the relevant value
6. Call `engine.transaction(sessionId, 'hook-check', (w) => check(w, extractedValue), transcriptPath)`
7. If result is `blocked` → `{ output: JSON.stringify({ decision: 'block', reason }), exitCode: 2 }`
8. Otherwise → `{ output: '', exitCode: 0 }`

**Unknown hook events:**
- Return `{ output: '', exitCode: 0 }` (allow)

**Stdin handling:**
- Read once, cache internally. No stdin caching hack needed by consumer.

#### Exit Code Constants

The platform defines and owns these:

```typescript
EXIT_ALLOW = 0
EXIT_ERROR = 1
EXIT_BLOCK = 2
```

Consumers never reference exit codes directly.

---

### 3.4 Engine-Owned Workflow Behaviors

Three methods currently hand-written on every consumer's `Workflow` class are actually generic state-machine operations. The platform engine should own them.

#### 3.4.1 `transitionTo` → Moved to Engine

**Current consumer implementation** (35 lines in `workflow.ts`):

```typescript
transitionTo(target: string): PreconditionResult {
  const from = parseStateName(this.state.currentStateMachineState)
  const targetState = parseStateName(target)
  const currentDef = WORKFLOW_REGISTRY[from]

  // 1. Check legal transition
  if (!currentDef.canTransitionTo.includes(targetState)) {
    return fail(`Illegal transition ${from} -> ${targetState}. ...`)
  }

  // 2. Run guard (skip for BLOCKED)
  if (targetState !== 'BLOCKED' && currentDef.transitionGuard) {
    const ctx = this.buildTransitionContext(from, targetState)
    const guardResult = currentDef.transitionGuard(ctx)
    if (!guardResult.pass) return guardResult
  }

  // 3. Run onEntry
  const targetDef = WORKFLOW_REGISTRY[targetState]
  if (targetDef.onEntry) {
    const ctx = this.buildTransitionContext(from, targetState)
    this.state = targetDef.onEntry(this.state, ctx)
  }

  // 4. Append transition event
  this.append({ type: 'transitioned', at: this.deps.now(), from, to: targetState })

  // 5. Post-transition side effect (hardcoded)
  if (targetState === 'CHECKING_FEEDBACK' && this.state.prNumber !== undefined) {
    this.autoFetchFeedback(this.state.prNumber)
  }

  return pass()
}
```

**Why this is generic:**

Steps 1-4 use only data from the `WorkflowRegistry` that the platform already owns:
- `canTransitionTo` — declared in state definitions
- `transitionGuard` — declared in state definitions
- `onEntry` — declared in state definitions
- `TransitionContext` — a platform type built from `GitInfo` + state

Step 5 is the only workflow-specific line — and it's a hardcoded side effect that should instead be modeled as part of the CHECKING_FEEDBACK state definition's `onEntry`.

**Proposed change:**

The engine's existing `transition()` method should execute the full transition lifecycle internally:

1. Validate legal transition from registry
2. Run `transitionGuard` (skip for BLOCKED)
3. Run `onEntry` on target state
4. Append `transitioned` event
5. Flush pending events

The consumer removes `transitionTo` from their Workflow class. The `RehydratableWorkflow` interface drops the `transitionTo` method.

**Side effect handling:**

The hardcoded `autoFetchFeedback` call moves into the CHECKING_FEEDBACK state's `onEntry`:

```typescript
// states/checking-feedback.ts (consumer code)
export const checkingFeedbackState: ConcreteStateDefinition = {
  // ...
  onEntry: (state, ctx) => {
    // Existing: reset flags
    const resetState = {
      ...state,
      feedbackClean: false,
      feedbackAddressed: false,
      feedbackAddressedCount: undefined,
      feedbackUnresolvedCount: undefined,
    }
    // Side effect: auto-fetch feedback (was previously hardcoded in transitionTo)
    // The consumer handles this in onEntry since it has access to deps via closure
    return resetState
  },
}
```

Note: `onEntry` currently returns state but does not have access to append events or call deps. If the auto-fetch needs to append events (it does — it appends `feedback-checked`), then `onEntry` needs an extended signature. See Section 3.4.4 for the `onEntry` enhancement.

#### 3.4.2 `checkBashAllowed` → Moved to Engine

**Current consumer implementation** (13 lines):

```typescript
checkBashAllowed(toolName: string, command: string): PreconditionResult {
  const currentDef = getStateDefinition(this.state.currentStateMachineState)
  const exemptions = currentDef.allowForbidden?.bash ?? []
  const result = checkBashCommand(command, BASH_FORBIDDEN, exemptions)
  this.append({
    type: 'bash-checked',
    at: this.deps.now(),
    tool: toolName,
    command,
    allowed: result.pass,
    reason: result.pass ? undefined : result.reason,
  })
  return result
}
```

**Why this is generic:**

Every line uses platform-owned constructs:
- `getStateDefinition` reads from `WorkflowRegistry` (platform type)
- `allowForbidden?.bash` is a platform DSL field on `WorkflowStateDefinition`
- `checkBashCommand` is a platform-exported function
- `bash-checked` is a platform-defined engine event type
- The audit append pattern (record result as event) is generic

**Proposed change:**

The engine provides a `checkBash(sessionId, toolName, command)` method that:

1. Rehydrates workflow to get current state
2. Looks up state definition from registry
3. Reads `allowForbidden?.bash` exemptions
4. Calls existing `checkBashCommand(command, bashForbidden, exemptions)`
5. Appends `bash-checked` engine event
6. Returns `EngineResult` (blocked or success)

The consumer provides `bashForbidden: BashForbiddenConfig` as part of their workflow configuration (it's already declared in the registry module — just needs to be passed to the engine).

The consumer's `Workflow` class no longer has a `checkBashAllowed` method. The `RehydratableWorkflow` interface drops it.

#### 3.4.3 `checkWriteAllowed` → Moved to Engine

**Current consumer implementation** (11 lines):

```typescript
checkWriteAllowed(filePath: string): PreconditionResult {
  const result = checkWriteAllowed(filePath) // calls predicate
  this.append({
    type: 'write-checked',
    at: this.deps.now(),
    tool: 'Write',
    filePath,
    allowed: result.pass,
    reason: result.pass ? undefined : result.reason,
  })
  return result
}
```

**Why this is generic:**

- `write-checked` is a platform-defined engine event type
- The audit append pattern is identical to bash checking
- The only consumer-specific part is the predicate (`checkWriteAllowed(filePath)`)

**Proposed change:**

The engine provides a `checkWrite(sessionId, filePath)` method that:

1. Rehydrates workflow to get current state
2. Calls consumer-provided write predicate: `writeProtection(filePath) → PreconditionResult`
3. Appends `write-checked` engine event
4. Returns `EngineResult`

The consumer provides the write predicate as configuration:

```typescript
// Consumer provides:
const writeProtection = (filePath: string): PreconditionResult => {
  const PROTECTED = [
    /\bnx\.json$/,
    /\btsconfig\.base\.json$/,
    /\beslint\.config\.mjs$/,
    /\bvitest\.config\./,
    /\bvite\.config\./,
  ]
  const isProtected = PROTECTED.some((pattern) => pattern.test(filePath))
  if (isProtected) return fail(`Protected file: ${filePath}`)
  return pass()
}
```

This is passed to the engine or CLI configuration, not implemented as a Workflow method.

#### 3.4.4 Enhanced `onEntry` Signature

The current `onEntry` signature is:

```typescript
onEntry?: (state: TState, ctx: TransitionContext<TState, TStateName>) => TState
```

This only allows state mutation — it cannot append events or call external dependencies. The `autoFetchFeedback` side effect needs both (it calls `deps.getPrFeedback()` and appends `feedback-checked` events).

**Proposed enhancement — `afterEntry`:**

Add an optional `afterEntry` callback to `WorkflowStateDefinition` that runs after the transition event is appended and has access to the workflow instance:

```typescript
type WorkflowStateDefinition<TState, TStateName, TOperation> = {
  // ... existing fields ...
  onEntry?: (state: TState, ctx: TransitionContext<TState, TStateName>) => TState
  afterEntry?: (workflow: RehydratableWorkflow<TState>) => void
}
```

- `onEntry` — Pure state mutation. Runs before the transition event. No side effects.
- `afterEntry` — Side effects. Runs after the transition event is appended. Can call workflow methods that append additional events.

The consumer moves `autoFetchFeedback` to `afterEntry`:

```typescript
// states/checking-feedback.ts
export const checkingFeedbackState: ConcreteStateDefinition = {
  // ...
  onEntry: (state) => ({
    ...state,
    feedbackClean: false,
    feedbackAddressed: false,
    feedbackAddressedCount: undefined,
    feedbackUnresolvedCount: undefined,
  }),
  afterEntry: (workflow) => {
    // Side effect: auto-fetch feedback
    // This is the only genuinely workflow-specific transition logic
    const state = workflow.getState()
    if (state.prNumber !== undefined) {
      // workflow has recording ops that can append events
      // consumer wires this to their getPrFeedback dep
    }
  },
}
```

**Alternative approach — simpler:**

If `afterEntry` adds too much complexity, the consumer can handle auto-fetch as a recording operation that the agent instructions tell the agent to call immediately after transitioning to CHECKING_FEEDBACK. This avoids any engine changes. The trade-off is that it's no longer automatic.

The choice between these two approaches is at the platform team's discretion.

#### 3.4.5 Recording Operations Declaration

The consumer declares mechanical recording operations on their Workflow class. The platform generates methods that follow the gate-check → append-event → return-pass pattern.

**API:**

```typescript
import { defineRecordingOps } from '@ntcoding/agentic-workflow-builder/dsl'

// Defined inside the Workflow class or as a companion declaration
const recordingOps = defineRecordingOps({
  'record-issue': {
    event: 'issue-recorded',
    payload: (issueNumber: number) => ({ issueNumber }),
  },
  'record-branch': {
    event: 'branch-recorded',
    payload: (branch: string) => ({ branch }),
  },
  'record-architecture-review-passed': {
    event: 'architecture-review-completed',
    payload: () => ({ passed: true }),
  },
  'record-architecture-review-failed': {
    event: 'architecture-review-completed',
    payload: () => ({ passed: false }),
  },
  'record-code-review-passed': {
    event: 'code-review-completed',
    payload: () => ({ passed: true }),
  },
  'record-code-review-failed': {
    event: 'code-review-completed',
    payload: () => ({ passed: false }),
  },
  'record-bug-scanner-passed': {
    event: 'bug-scanner-completed',
    payload: () => ({ passed: true }),
  },
  'record-bug-scanner-failed': {
    event: 'bug-scanner-completed',
    payload: () => ({ passed: false }),
  },
  'record-task-check-passed': {
    event: 'task-check-passed',
    payload: () => ({}),
  },
  'record-pr': {
    event: 'pr-recorded',
    payload: (prNumber: number, prUrl?: string) => ({
      prNumber,
      ...(prUrl !== undefined ? { prUrl } : {}),
    }),
  },
  'record-ci-passed': {
    event: 'ci-completed',
    payload: () => ({ passed: true }),
  },
  'record-ci-failed': {
    event: 'ci-completed',
    payload: (output: string) => ({ passed: false, output }),
  },
  'record-feedback-clean': {
    event: 'feedback-checked',
    payload: () => ({ clean: true }),
  },
  'record-feedback-exists': {
    event: 'feedback-checked',
    payload: (unresolvedCount: number) => ({ clean: false, unresolvedCount }),
  },
  'record-feedback-addressed': {
    event: 'feedback-addressed',
    payload: (addressedCount: number) => ({ addressedCount }),
  },
  'record-reflection': {
    event: 'reflection-written',
    payload: (path: string) => ({ path }),
  },
})
```

**What the platform generates for each operation:**

```typescript
// Generated method (conceptual):
recordIssue(issueNumber: number): PreconditionResult {
  const gate = checkOperationGate('record-issue', this.state)
  if (!gate.pass) return gate
  this.append({
    type: 'issue-recorded',
    at: this.deps.now(),
    ...payload(issueNumber),  // { issueNumber }
  })
  return pass()
}
```

Every generated method:
1. Calls `checkOperationGate(operationName, state)` — checks `allowedWorkflowOperations` in current state definition
2. Returns the gate failure if blocked
3. Appends an event with `{ type, at: now(), ...payload(...args) }`
4. Returns `pass()`

**Implementation approach:**

The platform team decides the generation mechanism. Options:
- Runtime method generation via `Proxy` or prototype injection
- A base class mixin that reads the recording ops declaration
- A code-generation step

The consumer's Workflow class should not need to hand-write any recording methods. They remain accessible by name (e.g., `w.recordIssue(42)`) for the command handler callbacks in `defineCommands`.

#### 3.4.6 Derive Emoji Map from Registry

**Current duplication:**

Emoji is defined in each state definition:
```typescript
const implementingState = { emoji: '🔨', ... }
```

AND duplicated in a separate map:
```typescript
const STATE_EMOJI_MAP = { IMPLEMENTING: '🔨', ... }
```

AND the adapter's `getEmojiForState` method:
```typescript
getEmojiForState(state: string): string {
  return STATE_EMOJI_MAP[parseStateName(state)]
}
```

**Proposed change:**

The engine should derive the emoji map from the `WorkflowRegistry` that the `WorkflowFactory` already provides (via `procedurePath`, which reads state definitions). The `getEmojiForState` method on `WorkflowFactory` should have a default implementation that reads from the registry, so consumers don't need to provide it.

If the platform already has access to the registry (it does — through the factory), it can look up `registry[stateName].emoji` directly. The consumer no longer needs `STATE_EMOJI_MAP` or the `getEmojiForState` adapter method.

---

### 3.5 Complete Consumer Code After All Changes

After implementing all features in this PRD, the consumer's entire codebase for the CLI/infrastructure layer reduces to:

**File 1: `entrypoint.ts` (~15 lines)**
```typescript
import { createWorkflowCli, defineCommands, defineHooks, arg, extractField } from '@ntcoding/agentic-workflow-builder/cli'
import { WORKFLOW_ADAPTER } from './workflow-adapter'
import { getGitInfo, runGh } from './infra/git'
import { createGetPrFeedback } from './infra/get-pr-feedback'

export default createWorkflowCli({
  adapter: WORKFLOW_ADAPTER,
  commands: defineCommands({ /* see Section 3.1 */ }),
  hooks: defineHooks({ /* see Section 3.3 */ }),
  workflowDeps: {
    getGitInfo,
    checkPrChecks: () => true,
    getPrFeedback: createGetPrFeedback(runGh),
  },
})
```

**File 2: `workflow.ts` (~30 lines)**
```typescript
import { defineRecordingOps } from '@ntcoding/agentic-workflow-builder/dsl'

// Recording ops declaration (see Section 3.4.5)
export const recordingOps = defineRecordingOps({ /* ... */ })

// Workflow class only has custom logic, if any
// If afterEntry is implemented, the autoFetchFeedback helper lives here
// If all behavior is declarative, Workflow class may not be needed at all
```

**File 3: `workflow-adapter.ts` (~20 lines)**
```typescript
// Simplified adapter — no getEmojiForState, no getOperationBody, no getTransitionTitle
// Just createFresh, rehydrate, procedurePath, initialState
```

**File 4: `write-protection.ts` (~15 lines)**
```typescript
// The write predicate — list of protected file patterns
```

**Files unchanged (domain logic — stays as-is):**
- `workflow-types.ts` — State type, state names, operation union
- `workflow-events.ts` — Event Zod schemas
- `fold.ts` — Event reducer
- `registry.ts` — State registry with guards, transitions, operations
- `states/*.ts` — 9 state definitions
- `git.ts` — Git/GitHub CLI wrappers
- `get-pr-feedback.ts` — PR feedback fetching

**Total new infrastructure: ~80 lines** (down from ~959).

---

## 4. What We're NOT Building

| Exclusion | Rationale |
|-----------|-----------|
| **State markdown auto-generation** | State `.md` files contain nuanced agent instructions (TODO checklists, constraints, context). These are hand-authored content, not derivable from the registry. |
| **Event schema generation** | Event shapes are domain knowledge. The consumer defines Zod schemas for their events. The platform does not infer event schemas from recording ops. |
| **Fold function generation** | How events map to state is domain knowledge. The consumer writes the fold/reducer. |
| **Agent definition generation** | Agent `.md` files contain detailed review instructions. Not derivable from code. |
| **Breaking changes to existing API** | `WorkflowEngine`, `WorkflowFactory`, `WorkflowRegistry`, `workflowSpec` — all existing types remain. New features are additive. |
| **Multi-command plugins** | This PRD assumes one workflow = one CLI entrypoint. Multiple workflows in one plugin is out of scope. |

---

## 5. Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | `defineCommands` generates working CLI handlers for all 3 arg types (no-arg, number, string) + optional args | Unit tests for each arg type, error messages match format spec |
| 2 | `createWorkflowCli` produces a working CLI entrypoint that handles commands and hooks | Integration test: invoke with argv, verify stdout/exit code |
| 3 | `defineHooks` correctly routes SessionStart and PreToolUse events | Unit tests: allow/block decisions match expected behavior |
| 4 | Engine's `transition()` executes full lifecycle (validate → guard → onEntry → append) | Existing workflow spec tests pass without consumer `transitionTo` method |
| 5 | Engine's `checkBash()` reads exemptions from state definitions and appends audit events | Unit tests: verify exemptions, blocked patterns, audit events |
| 6 | Engine's `checkWrite()` calls consumer predicate and appends audit events | Unit tests: verify predicate called, audit events appended |
| 7 | `defineRecordingOps` generates working methods (gate → append → pass) | Existing workflow spec tests pass with generated methods |
| 8 | Emoji derived from registry — no separate map needed | `getEmojiForState` reads from registry without consumer override |
| 9 | dev-workflow-v2 migrated to new API with zero behavior change | All existing dev-workflow-v2 tests pass after migration |
| 10 | Backward compatible — existing consumers without CLI layer still work | Existing engine/dsl tests pass unchanged |

---

## 6. Current Platform API (Reference)

### Package Exports (v0.1.0)

```text
@ntcoding/agentic-workflow-builder/dsl       → Types, pass/fail, checkBashCommand
@ntcoding/agentic-workflow-builder/engine     → WorkflowEngine, WorkflowFactory, events
@ntcoding/agentic-workflow-builder/event-store → createStore, resolveSessionId
@ntcoding/agentic-workflow-builder/testing    → workflowSpec
```

### Key Types the Consumer Currently Implements

**`RehydratableWorkflow<TState>`** — consumer must implement:
```typescript
interface RehydratableWorkflow<TState> {
  getState(): TState
  getAgentInstructions(pluginRoot: string): string
  transitionTo(target: string): PreconditionResult        // ← REMOVE (engine owns)
  getPendingEvents(): readonly BaseEvent[]
  startSession(transcriptPath?: string, repository?: string): void
}
```

**`WorkflowFactory<TWorkflow, TState, TDeps>`** — consumer must implement:
```typescript
interface WorkflowFactory<TWorkflow, TState, TDeps> {
  rehydrate(events: readonly BaseEvent[], deps: TDeps): TWorkflow
  createFresh(deps: TDeps): TWorkflow
  procedurePath(state: string, pluginRoot: string): string
  initialState(): TState
  getEmojiForState(state: string): string                  // ← REMOVE (derive from registry)
  getOperationBody(op: string, state: TState): string      // ← SIMPLIFY (platform default)
  getTransitionTitle(to: string, state: TState): string    // ← SIMPLIFY (platform default)
  getPrefixConfig?(): PrefixConfig
}
```

**`WorkflowEngineDeps`** — consumer must assemble:
```typescript
type WorkflowEngineDeps = {
  store: WorkflowEventStore
  getPluginRoot: () => string
  getEnvFilePath: () => string
  readFile: (path: string) => string
  appendToFile: (filePath: string, content: string) => void
  now: () => string
  transcriptReader?: TranscriptReader
}
```

All of `WorkflowEngineDeps` is generic and should be assembled by the platform.

### New Export

```text
@ntcoding/agentic-workflow-builder/cli       → createWorkflowCli, createWorkflowRunner,
                                                defineCommands, defineHooks,
                                                arg, extractField
```

---

## 7. Milestones

### M1: Declarative Commands + CLI Entrypoint

Build the `./cli` module with command definitions and the CLI entrypoint factory.

#### Deliverables

- **D1.1:** `defineCommands` function
  - Accepts command definitions with typed arg schemas
  - Generates handler functions that parse args, validate, call engine
  - Auto-generates error messages from command name + arg name
  - Supports `type: 'session-start'`, `type: 'transition'`, and default `type: 'transaction'`
  - Acceptance: All 3 arg types (no-arg, number, string) + optional args work correctly
  - Verification: Unit tests for each arg type + error case

- **D1.2:** `arg` helpers
  - `arg.number(name)` — parseInt + NaN check
  - `arg.string(name)` — null check
  - `arg.state(name)` — Zod state schema validation
  - `.optional()` modifier on any arg
  - Acceptance: Each helper validates and returns correct types
  - Verification: Unit tests for valid and invalid inputs

- **D1.3:** `createWorkflowCli` function
  - Assembles `WorkflowEngineDeps` from environment
  - Reads `CLAUDE_SESSION_ID`, `CLAUDE_PLUGIN_ROOT`, `HOME`
  - Creates SQLite store
  - Routes commands or hooks based on argv
  - Handles process boundary (stdout, stderr, exit)
  - Acceptance: Complete CLI entrypoint from single function call
  - Verification: Integration tests with mocked process

- **D1.4:** `createWorkflowRunner` function (for testing)
  - Returns `runWorkflow(args, deps)` without process boundary
  - Accepts injectable deps for test isolation
  - Acceptance: Consumers can unit test command routing
  - Verification: Unit test showing test usage

---

### M2: Hook Protocol

Build the declarative hook configuration and platform-owned hook routing.

#### Deliverables

- **D2.1:** `defineHooks` function
  - Accepts `preToolUse` map of tool name → extract + check
  - Acceptance: Hook definitions type-check correctly
  - Verification: Type tests

- **D2.2:** `extractField` helper
  - Extracts named string field from `tool_input`
  - Clear error messages for missing/wrong-type fields
  - Acceptance: Correct extraction and error handling
  - Verification: Unit tests for valid, missing, and wrong-type inputs

- **D2.3:** Platform-owned hook routing
  - Reads stdin once, caches internally
  - Routes `SessionStart` → `engine.persistSessionId()`
  - Routes `PreToolUse` → tool lookup → extract → check → allow/block
  - Unknown hooks → allow
  - No session → allow
  - Formats deny decisions as `{ decision: 'block', reason }`
  - Acceptance: All routing paths work correctly
  - Verification: Unit tests for each routing path

- **D2.4:** Hook protocol Zod schemas
  - Common input: `{ session_id, hook_event_name }`
  - PreToolUse input: extends common with `{ tool_name, tool_input, transcript_path? }`
  - Acceptance: Schemas validate real Claude Code hook payloads
  - Verification: Unit tests with real-world examples

---

### M3: Engine-Owned Workflow Behaviors

Move `transitionTo`, `checkBashAllowed`, and `checkWriteAllowed` into the engine.

#### Deliverables

- **D3.1:** Engine-owned transition lifecycle
  - Engine `transition()` validates legal transition from registry
  - Runs `transitionGuard` (skip for BLOCKED)
  - Runs `onEntry` on target state
  - Appends `transitioned` event
  - Consumer `Workflow` class no longer implements `transitionTo`
  - `RehydratableWorkflow` interface drops `transitionTo` method
  - Acceptance: Transitions work identically to current behavior
  - Verification: Existing consumer transition tests pass

- **D3.2:** Engine-owned bash checking
  - New engine method: `checkBash(sessionId, toolName, command)`
  - Reads `allowForbidden?.bash` from current state definition
  - Calls `checkBashCommand()` with exemptions
  - Appends `bash-checked` event
  - Consumer provides `bashForbidden: BashForbiddenConfig` in config
  - Acceptance: Bash checks work identically to current behavior
  - Verification: Existing consumer bash check tests pass

- **D3.3:** Engine-owned write checking
  - New engine method: `checkWrite(sessionId, filePath)`
  - Calls consumer-provided write predicate
  - Appends `write-checked` event
  - Consumer provides `writeProtection: (filePath) => PreconditionResult`
  - Acceptance: Write checks work identically to current behavior
  - Verification: Existing consumer write check tests pass

- **D3.4:** `afterEntry` callback (if chosen over manual approach)
  - New optional field on `WorkflowStateDefinition`
  - Runs after transition event is appended
  - Has access to workflow instance for appending events
  - Acceptance: Side effects can be triggered on state entry
  - Verification: Unit test showing event append in afterEntry

- **D3.5:** Derive emoji from registry
  - `getEmojiForState` has default implementation reading `registry[state].emoji`
  - `WorkflowFactory` makes `getEmojiForState` optional
  - Acceptance: Emoji resolved without consumer override
  - Verification: Existing emoji tests pass

---

### M4: Recording Operations

Build the declarative recording operations and method generation.

#### Deliverables

- **D4.1:** `defineRecordingOps` function
  - Accepts operation name → event type + payload factory
  - Generates methods that: gate check → append event → return pass
  - Methods accessible by camelCase name (e.g., `recordIssue`)
  - Acceptance: Generated methods produce identical events to hand-written ones
  - Verification: Existing recording operation tests pass with generated methods

- **D4.2:** Operation gate checking
  - Generated methods call `checkOperationGate(operationName, state)`
  - Gate checks `allowedWorkflowOperations` in current state definition
  - Blocked operations return `fail()` with reason
  - Acceptance: Operations blocked in wrong states
  - Verification: Unit tests for gate checks in each state

- **D4.3:** Integration with `defineCommands`
  - Command definitions reference recording op methods by name
  - Pipeline: CLI args → parsed values → generated method → event
  - Acceptance: End-to-end from CLI invocation to event appended
  - Verification: Integration tests

---

### M5: Consumer Migration (dev-workflow-v2)

Migrate dev-workflow-v2 to the new platform API and verify zero behavior change.

> This milestone is done by the consumer team (us), not the platform team. Included here for completeness.

#### Deliverables

- **D5.1:** Replace `command-handlers.ts` with `defineCommands`
- **D5.2:** Replace `hook-handlers.ts` + `hook-io.ts` with `defineHooks`
- **D5.3:** Replace `workflow-cli.ts` + `composition-root.ts` + `environment.ts` + `stdin.ts` with `createWorkflowCli`
- **D5.4:** Remove `transitionTo`, `checkBashAllowed`, `checkWriteAllowed` from Workflow class
- **D5.5:** Replace 14 recording methods with `defineRecordingOps`
- **D5.6:** Remove `STATE_EMOJI_MAP` and `getEmojiForState` override
- **D5.7:** Remove `output-messages.ts` and `operation-result.ts`
- **D5.8:** All existing tests pass with zero behavior change
- **D5.9:** Net deletion of ~900 lines of infrastructure code

---

## 8. Milestone Dependencies

```text
M1 (Commands + CLI) ──────────────────┐
                                       ├──► M5 (Consumer Migration)
M2 (Hook Protocol) ──────────────────┤
                                       │
M3 (Engine Behaviors) ────────────────┤
                                       │
M4 (Recording Ops) ──────────────────┘
```

M1 through M4 are independent of each other and can be worked on in parallel. M5 (consumer migration) requires all of M1-M4 to be complete.

Within milestones:
- M1: D1.1 and D1.2 before D1.3. D1.4 independent.
- M2: D2.4 before D2.3. D2.1 and D2.2 independent.
- M3: D3.1, D3.2, D3.3 independent. D3.4 depends on D3.1. D3.5 independent.
- M4: D4.1 before D4.2. D4.3 depends on D4.1 and M1.

---

## 9. Open Questions

1. **Recording ops method generation mechanism** — Should the platform use runtime Proxy/prototype injection, a base class mixin, or compile-time code generation? Runtime is simpler but may have TypeScript ergonomics issues (method autocompletion). The platform team should choose the approach that gives the best developer experience.

2. **`afterEntry` vs manual approach** — Should the platform support `afterEntry` (side effects on state entry) or should consumers handle post-transition side effects as explicit recording operations called by the agent? `afterEntry` is more automatic but adds engine complexity. The simpler approach is fine if the consumer can live with one extra agent instruction.

3. **`getOperationBody` and `getTransitionTitle` defaults** — These are trivial string transforms (e.g., `'record-issue'` → `'Record issue'`, identity function). Should the platform provide sensible defaults so consumers don't need to implement them? Recommended: yes, with consumer override option.

4. **Registry access from engine** — The engine currently receives a `WorkflowFactory` but not the `WorkflowRegistry` directly. For engine-owned transitions and bash checks, the engine needs registry access. Options: (a) pass registry to engine constructor, (b) add `getRegistry()` to `WorkflowFactory`, (c) have the engine call factory methods that delegate to registry. Option (b) is cleanest.
