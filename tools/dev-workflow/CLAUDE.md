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

### Separation of Entry Points and Infrastructure

**CRITICAL**: Entry point files (e.g., `complete-task.ts`) must be declarative and contain ONLY high-level orchestration. All parsing, validation, and context-building logic belongs in dedicated modules.

```text
complete-task/
├── complete-task.ts     # Entry point - DECLARATIVE ONLY
├── context-builder.ts   # Context construction logic
└── steps/               # Workflow step implementations
```

**Entry points should:**
- Import and compose high-level components
- Call a context builder to get workflow context
- Execute the workflow and output results
- Be readable at a glance (< 50 lines)

**Entry points must NOT contain:**
- CLI argument parsing logic
- Regex patterns or string parsing
- Complex conditional logic for input resolution
- Helper functions for formatting or validation

```typescript
// GOOD - declarative entry point (complete-task.ts)
const steps = [verifyBuild, codeReview, submitPR, fetchPRFeedback]
const completeTask = workflow(steps)

async function main(): Promise<void> {
  const context = await buildWorkflowContext()  // all complexity hidden
  const result = await completeTask(context)
  console.log(JSON.stringify(result, null, 2))
}

// BAD - entry point mixed with parsing logic
async function main(): Promise<void> {
  const branch = await git.currentBranch()
  const issuePattern = /issue-(\d+)/           // parsing in entry point
  const match = issuePattern.exec(branch)       // parsing in entry point
  const issueNumber = match ? parseInt(match[1], 10) : undefined

  const cliPrTitle = process.argv.indexOf('--pr-title')  // CLI parsing
  // ... 50 more lines of setup
}
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
