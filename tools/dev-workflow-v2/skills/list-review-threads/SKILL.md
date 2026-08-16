---
name: list-review-threads
description: List unresolved review threads for the pull request recorded in workflow state. Use only when explicitly invoked as $dev-workflow-v2:list-review-threads.
---

# List Review Threads

1. Invoke `$dev-workflow-v2:workflow get-state` and extract `prNumber`.
2. Stop if `prNumber` is missing. Do not infer a PR from the current branch.
3. Fetch the PR URL, `reviewDecision`, reviews, and `reviewThreads` through GitHub GraphQL. Paginate the reviews, review threads, and every thread's comments connection until `pageInfo.hasNextPage` is false.
4. Keep unresolved review threads only and group them by file path. Use `no file` when a thread has no path.
5. For every unresolved thread, report its thread ID, file path, line when present, comment authors in chronological order, and the latest comment body selected by greatest `createdAt`.
6. Return exactly this report shape:

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
