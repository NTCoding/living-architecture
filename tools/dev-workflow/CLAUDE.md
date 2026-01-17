# dev-workflow

TypeScript orchestration tools for Claude Code development workflow.

## Architecture Principles

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

### Directory Structure: Infrastructure vs Commands

**CRITICAL**: Understand what is shared vs command-specific.

```text
dev-workflow/
├── workflow-runner/         # SHARED: Workflow execution mechanics
│   ├── workflow-runner.ts   # Core workflow types and execution
│   ├── run-workflow.ts      # Entry point helper
│   ├── error-handler.ts     # Standard error handling
│   └── schemas.ts           # Shared Zod schemas
├── external-clients/        # SHARED: External service clients
│   ├── cli.ts               # CLI argument parsing
│   ├── git.ts               # simple-git wrapper
│   ├── github.ts            # Octokit wrapper
│   ├── nx.ts                # nx commands
│   ├── claude.ts            # Claude Agent SDK
│   └── pr-feedback.ts       # PR feedback fetching
├── complete-task/           # COMMAND: complete-task
│   ├── complete-task.ts     # Entry point (declarative)
│   ├── context-builder.ts   # Builds context FOR THIS COMMAND
│   └── steps/               # Steps unique to this command
├── get-pr-feedback/         # COMMAND: get-pr-feedback
│   ├── get-pr-feedback.ts   # Entry point (declarative)
│   ├── context-builder.ts   # Builds context FOR THIS COMMAND
│   └── steps/               # Steps unique to this command
└── respond-to-feedback/     # COMMAND: respond-to-feedback
    └── respond-to-feedback.ts
```

**What goes where:**
- `workflow-runner/` - Generic workflow execution (running steps, handling results)
- `external-clients/` - Clients for external services (git, GitHub, nx, Claude)
- `<command>/` - Everything specific to that command (context builder, steps)

**Context builders are command-specific** - each command knows what context it needs.

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
