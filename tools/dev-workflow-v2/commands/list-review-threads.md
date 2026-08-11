# list-review-threads

List unresolved review threads for the pull request recorded in workflow state.

## Usage

```bash
/dev-workflow-v2:list-review-threads
```

## Instructions

1. Read `/dev-workflow-v2:workflow get-state` and extract `prNumber`.
2. Stop if `prNumber` is missing. Do not infer a PR from the current branch.
3. Fetch the PR's `reviewDecision`, reviews, and `reviewThreads` through GitHub GraphQL. Paginate the `reviews`, `reviewThreads`, and every thread's `comments` connection with `pageInfo.hasNextPage` and `pageInfo.endCursor` until all pages are read.
4. Filter to unresolved review threads only.
5. Group the unresolved threads by file path. Use `no file` for threads without a path.
6. For each unresolved thread, report:
   - thread id
   - file path
   - line number if present
   - comment authors in order
   - the latest comment body as the primary summary, selected by the greatest `createdAt` value
7. Return a concise structured report with this order:

```text
PR: #<number> <url>
Unresolved threads: <count>

## <file path or "no file">
- Thread: <id>
  Line: <line or —>
  Authors: <author1>, <author2>
  Latest comment: <summary>
```

## Scope

- This command only reads and lists current unresolved review threads.
- Do not reply to threads.
- Do not resolve threads.
- Do not record workflow state here.
