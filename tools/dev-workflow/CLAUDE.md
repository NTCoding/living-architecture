# dev-workflow

TypeScript orchestration tools for Claude Code development workflow.

## Architecture Principles

### Strict Responsibility Boundaries

**CRITICAL**: Each directory has ONE responsibility. Mixing concerns is forbidden.

#### Decision Flowchart: Where Does Code Belong?

```text
START: I have a type, function, or constant

  ↓

Is it generic behavior of an external service?
(Same for ALL users of git/GitHub/nx - ask: "Would the CEO of that service know what this is?")

  YES → external-clients/
  NO  ↓

Is it specific to ONE command only?
(Only makes sense in the context of that single command)

  YES → <command>/ directory
  NO  ↓

Is it a core workflow concept?
(Fundamental type/function that workflows use - e.g., what a "task" is, what a "step result" is)

  YES → workflow-runner/
  NO  ↓

It's a shared convention → conventions/
(Our decisions about how we use external services - branch naming, commit format, etc.)
```

#### workflow-runner/ - Generic Execution ONLY

The workflow runner knows NOTHING about:
- What steps do
- What failure types mean
- How to format specific error messages
- Any command-specific logic

It ONLY knows:
- How to run steps in sequence
- Generic success/failure result types
- How to pass context to steps

```typescript
// GOOD - generic workflow runner
export type StepResult =
  | { type: 'success'; output?: unknown }
  | { type: 'failure'; details: unknown }

// BAD - step-specific knowledge in workflow runner
type NextAction = 'fix_errors' | 'fix_review' | 'resolve_feedback'
function formatInstructions(result) {
  if (result.nextAction === 'fix_review') { ... } // NO!
}
```

#### external-clients/ - Generic External Service Behavior ONLY

Ask: "Is this behavior the same for EVERY user of git/GitHub/nx?"
- YES → belongs in external-clients
- NO → does NOT belong in external-clients

```typescript
// GOOD - generic git behavior (same for everyone)
git.commit(message)
git.push()
github.createPR({ title, body, branch })

// BAD - our convention (not generic)
git.parseIssueNumberFromBranch() // NO! Our naming convention
git.formatCommitMessage()         // NO! Our co-author convention
```

#### conventions/ - OUR Project Conventions

Project-specific decisions about how we use external services:
- Branch naming: `issue-<number>`
- Commit format: Co-author line
- CLI flag meanings

```typescript
// conventions/branch.ts
export const ISSUE_BRANCH_PATTERN = /issue-(\d+)/
export function parseIssueNumber(branch: string): number | undefined

// conventions/commit.ts
export function formatCommitMessage(title: string): string
```

#### <command>/ - Command-Specific Code

Everything specific to one command:
- Context type and builder
- Steps
- Result formatting
- How to interpret step results

### No Fallback Values

**CRITICAL**: Never use fallback/default values for inputs that Claude should provide explicitly. The orchestrator knows nothing about the work - it only orchestrates.

```typescript
// BAD - dangerous fallback
const commitMsg = cliCommitMessage ?? cliPrTitle

// GOOD - require explicit input
if (!cliCommitMessage) {
  throw new WorkflowError('--commit-message is required')
}
```

### Read/Write Separation

Commands are either read-only or write-only, never both:

| Command | Type | Purpose |
|---------|------|---------|
| `get-pr-feedback` | Read | Fetch PR status and unresolved feedback with thread IDs |
| `respond-to-feedback` | Write | Reply to a thread and mark resolved |
| `complete-task` | Write | Run verification, reviews, submit PR |

### Strong Typing with Zod

**MANDATORY**: Use Zod schemas for ALL type validation. Never use manual type guards. Never remove Zod schemas to satisfy static analysis tools like knip.

```typescript
// schemas.ts - always export schemas even if knip complains
export const inputSchema = z.object({
  threadId: z.string().min(1, 'threadId is required'),
  action: z.enum(['fixed', 'rejected']),
  message: z.string().min(1, 'message is required'),
})
```

For runtime type checking, use Zod's `.safeParse()`:

```typescript
// GOOD - Zod schema for type validation
const failedReviewerSchema = z.object({
  name: z.string(),
  summary: z.string(),
  reportPath: z.string(),
})

const failedReviewerArraySchema = z.array(failedReviewerSchema)

function isFailedReviewerArray(value: unknown): value is FailedReviewer[] {
  return failedReviewerArraySchema.safeParse(value).success
}

// BAD - manual type guard (do not use)
function isFailedReviewerArray(value: unknown): value is FailedReviewer[] {
  return Array.isArray(value) && value.every(
    (item) => typeof item === 'object' && 'name' in item
  )
}
```

### Fail Fast

Validate inputs immediately. Don't proceed with partial data:

```typescript
// GOOD
const input = InputSchema.parse(args) // throws if invalid

// BAD
if (!args.threadId) {
  console.warn('Missing threadId, using default')
}
```

### External Client Isolation

External services (git, GitHub, nx, Claude, CLI) are wrapped in dedicated clients:

```text
external-clients/
├── cli.ts      # CLI argument parsing
├── git.ts      # simple-git wrapper
├── github.ts   # Octokit wrapper
├── nx.ts       # nx commands
└── claude.ts   # Claude Agent SDK
```

Each client:
- Handles authentication
- Provides typed methods
- Throws domain-specific errors (GitError, GitHubError, etc.)

### Directory Structure

```text
dev-workflow/
├── workflow-runner/         # Generic execution mechanics ONLY
│   ├── workflow-runner.ts   # Step/workflow types, generic runner
│   ├── run-workflow.ts      # Entry point helper
│   └── error-handler.ts     # Generic error handling
├── external-clients/        # Generic external service behavior ONLY
│   ├── cli.ts               # CLI argument parsing
│   ├── git.ts               # simple-git wrapper (generic git ops)
│   ├── github.ts            # Octokit wrapper (generic GitHub ops)
│   ├── nx.ts                # nx commands
│   ├── claude.ts            # Claude Agent SDK
│   └── pr-feedback.ts       # PR feedback fetching
├── conventions/             # OUR project conventions
│   ├── branch.ts            # Branch naming (issue-<number>)
│   └── commit.ts            # Commit message format (co-author)
├── complete-task/           # COMMAND: complete-task
│   ├── complete-task.ts     # Entry point, context type, context builder
│   ├── result-formatter.ts  # Step-specific result formatting
│   └── steps/               # Steps unique to this command
├── get-pr-feedback/         # COMMAND: get-pr-feedback
│   ├── get-pr-feedback.ts   # Entry point, context type, context builder
│   └── steps/               # Steps unique to this command
├── get-pr-status/           # COMMAND: get-pr-status
│   ├── get-pr-status.ts     # Entry point, context type, context builder
│   └── steps/               # Steps unique to this command
└── respond-to-feedback/     # COMMAND: respond-to-feedback
    └── respond-to-feedback.ts
```

**What goes where:**
- `workflow-runner/` - Generic execution ONLY (no knowledge of steps or their meaning)
- `external-clients/` - Generic service behavior (same for every user of git/GitHub/nx)
- `conventions/` - OUR project-specific conventions (branch naming, commit format)
- `<command>/` - Everything specific to that command (context, steps, result formatting)

**Entry points should:**
- Import `runWorkflow` from shared infrastructure
- Import context builder from same command directory
- Declare steps on separate lines for readability

```typescript
// GOOD - declarative entry point
import { runWorkflow } from '../workflow-runner/run-workflow'
import { buildWorkflowContext } from './context-builder'
import { verifyBuild } from './steps/verify-build'
import { codeReview } from './steps/code-review'

runWorkflow(
  [
    verifyBuild,
    codeReview,
    submitPR,
    fetchPRFeedback,
  ],
  buildWorkflowContext,
)
```

### Error Handling

Custom error classes should use `Error.captureStackTrace` for cleaner stack traces:

```typescript
export class WorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}
```

### Export Public Types

Export types and error classes that consumers need for error handling:

```typescript
// GOOD - consumers can catch specific errors
export class ClaudeQueryError extends Error { ... }

// BAD - consumers can't distinguish error types
class ClaudeQueryError extends Error { ... }
```

### Declarative Workflow Steps

Workflow steps should be decoupled from generic infrastructure. Steps are declarative and domain-focused, while infrastructure handles the mechanics:

```typescript
// GOOD - declarative step, easy to read
const verifyStep = createStep('verify', async (ctx) => {
  const result = await nx.runMany(['lint', 'typecheck', 'test'])
  if (result.failed) {
    return failure('fix_errors', result.output)
  }
  return success()
})

// BAD - infrastructure mixed with domain logic
async function verify(ctx: Context): Promise<void> {
  try {
    const proc = spawn('pnpm', ['nx', 'run-many', ...])
    await new Promise((resolve, reject) => {
      proc.on('exit', (code) => code === 0 ? resolve() : reject())
    })
    ctx.state = 'verified'
  } catch (e) {
    ctx.errors.push(e)
    throw e
  }
}
```

The workflow should read like a high-level description:

```typescript
// GOOD - workflow is easy to follow
const workflow = createWorkflow([
  verifyStep,
  codeReviewStep,
  fetchPrFeedbackStep,
  submitPrStep,
])

// BAD - workflow buried in infrastructure
async function run() {
  const ctx = new Context()
  try {
    await verify(ctx)
    await review(ctx)
    // ... 50 lines of error handling
  } finally {
    await cleanup(ctx)
  }
}
```

## Commands

### get-pr-feedback (read-only)

```bash
nx run dev-workflow:get-pr-feedback
```

Returns:
```json
{
  "branch": "feature-x",
  "prNumber": 123,
  "mergeable": false,
  "unresolvedFeedback": [
    {
      "threadId": "PRRT_abc123",
      "location": "file.ts:42",
      "author": "reviewer",
      "body": "Please fix this"
    }
  ]
}
```

### get-pr-status (read-only)

```bash
nx run dev-workflow:get-pr-status
```

Returns PR lifecycle state for the current branch:
```json
{
  "state": "merged",
  "prNumber": 123,
  "prUrl": "https://github.com/owner/repo/pull/123",
  "branch": "issue-123-feature"
}
```

Possible states:
- `merged` - PR was merged
- `open` - PR is open
- `closed` - PR was closed without merging
- `not_found` - No PR exists for this branch

### respond-to-feedback (write-only)

```bash
nx run dev-workflow:respond-to-feedback -- \
  --thread-id "PRRT_abc123" \
  --action "fixed" \
  --message "Applied the suggested change"
```

Actions:
- `fixed` - Reply with "✅ Fixed: {message}" and resolve thread
- `rejected` - Reply with "❌ Rejected: {message}" and resolve thread

### complete-task

```bash
nx run dev-workflow:complete-task -- \
  --pr-title "feat: add feature" \
  --pr-body "Description" \
  --commit-message "feat: add feature"
```

For issue branches (pattern: `issue-<number>`), PR details are derived from the GitHub issue.

## Blocked Commands

These commands are blocked by hooks - use dev-workflow tools instead:

| Blocked | Use Instead |
|---------|-------------|
| `gh pr *` | `/complete-task` or `get-pr-feedback` |
| `gh api` (review/thread) | `respond-to-feedback` |
| `git push` | `/complete-task` |
