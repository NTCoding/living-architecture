# code-review

Run the reusable automated review bundle for the current branch.

## Usage

```bash
/dev-workflow-v2:code-review
```

## Instructions

1. Determine the current branch name: `git branch --show-current`
2. Determine the default branch. Prefer `git symbolic-ref refs/remotes/origin/HEAD --short` and strip the `origin/` prefix. If that fails, use `main`.
3. Determine changed files against the merge base with the default branch: `git diff --name-only $(git merge-base HEAD <default-branch>)..HEAD`
4. If no files changed, report that no review is needed and stop.
5. Create the review report directory: `reviews/<branch-name>/`
6. Build prompts for these three agents, each with the changed files list and its report path:
   - `architecture-review` → `reviews/<branch-name>/architecture-review.md`
   - `code-review` → `reviews/<branch-name>/code-review.md`
   - `bug-scanner` → `reviews/<branch-name>/bug-scanner.md`
7. Spawn those three agents in parallel.
8. Wait for all agents to finish, parse each JSON verdict, and return a concise summary containing:
   - changed files reviewed
   - report directory
   - each agent verdict
   - overall PASS/FAIL

## Prompt Format

Each agent prompt must use this structure:

```text
Files to Review:
- path/to/file.ts
- path/to/other-file.ts

Report Path: reviews/<branch-name>/<agent-name>.md
```

## Scope

- This command only runs the reusable review bundle.
- Do not run `task-check` here.
- Do not record workflow state here.
- Do not transition workflow state here.
