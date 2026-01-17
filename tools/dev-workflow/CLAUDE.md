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

All inputs and outputs use Zod schemas for validation:

```typescript
// schemas.ts
export const InputSchema = z.object({
  threadId: z.string().min(1, 'threadId is required'),
  action: z.enum(['fixed', 'rejected']),
  message: z.string().min(1, 'message is required'),
})
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

External services (git, GitHub, nx, Claude) are wrapped in dedicated clients:

```text
external-clients/
├── git.ts      # simple-git wrapper
├── github.ts   # Octokit wrapper
├── nx.ts       # pnpm nx commands
└── claude.ts   # Claude Agent SDK
```

Each client:
- Handles authentication
- Provides typed methods
- Throws domain-specific errors (GitError, GitHubError, etc.)

## Commands

### get-pr-feedback (read-only)

```bash
pnpm nx run dev-workflow:get-pr-feedback
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
pnpm nx run dev-workflow:respond-to-feedback -- \
  --thread-id "PRRT_abc123" \
  --action "fixed" \
  --message "Applied the suggested change"
```

Actions:
- `fixed` - Reply with "✅ Fixed: {message}" and resolve thread
- `rejected` - Reply with "❌ Rejected: {message}" and resolve thread

### complete-task

```bash
pnpm nx run dev-workflow:complete-task -- \
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
