# list-review-threads

List unresolved review threads for the current PR in a structured format.

## Usage

```bash
/dev-workflow-v2:list-review-threads
```

## Instructions

1. Read the current branch name: `git branch --show-current`
2. Get a GitHub token: `gh auth token`
3. Resolve the PR for the current branch with `gh pr view --json number,url,reviewThreads`
   - Run the command as `GITHUB_TOKEN=<token> gh pr view ...`
   - If no PR exists for the current branch, report that and stop.
4. Filter to unresolved review threads only.
5. Group the unresolved threads by file path. Use `no file` for threads without a path.
6. For each unresolved thread, report:
   - thread id
   - file path
   - line number if present
   - comment authors in order
   - the latest comment body as the primary summary
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

- This command only lists current unresolved review threads.
- Do not reply to threads.
- Do not resolve threads.
- Do not record workflow state here.
