---
name: list-review-threads
description: List unresolved review threads for the pull request recorded in workflow state. Use only when explicitly invoked as the list-review-threads skill.
---

# List Review Threads

1. Detect the current harness before reading review threads:
   - If `CODEX_THREAD_ID` is present, run workflow operations from the repository root with `node --conditions=@living-architecture/source --import tsx tools/dev-workflow-v2/src/shell/codex-workflow-command.ts <operation> [args]`.
   - Otherwise, run workflow operations with `/dev-workflow-v2:workflow <operation> [args]`.
1. Run the selected harness's `get-state` workflow operation and extract `prNumber`.
1. Stop if `prNumber` is missing. Do not infer a PR from the current branch.
1. Fetch the PR URL, `reviewDecision`, reviews, and `reviewThreads` through GitHub GraphQL. Paginate the reviews, review threads, and every thread's comments connection until `pageInfo.hasNextPage` is false.
1. Keep unresolved review threads only and group them by file path. Use `no file` when a thread has no path.
1. For every unresolved thread, report its thread ID, file path, line when present, comment authors in chronological order, and the latest comment body selected by greatest `createdAt`.
1. Return exactly this report shape:

```text
PR: #<number> <url>
Unresolved threads: <count>

## <file path or "no file">
- Thread: <id>
  Line: <line or —>
  Authors: <author1>, <author2>
  Latest comment: <summary>
```

This skill is read-only. Do not reply to or resolve threads, and do not record workflow state.
