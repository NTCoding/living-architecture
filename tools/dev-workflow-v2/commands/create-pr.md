# create-pr

Push the current branch and create a PR using the standard repo format.

## Usage

```bash
/dev-workflow-v2:create-pr
```

## Instructions

1. Read the current branch name: `git branch --show-current`
2. Determine the default branch. Prefer `git symbolic-ref refs/remotes/origin/HEAD --short` and strip the `origin/` prefix. If that fails, use `main`.
3. Fail if the current branch is the default branch.
4. Extract the GitHub issue number from the branch name pattern `issue-<N>-...`
   - If no issue number can be inferred, stop and tell the user the command requires an issue-based branch name.
5. Get a GitHub token: `gh auth token`
6. Check whether a PR already exists for the current branch with `gh pr view --json number,url`
   - Run the command as `GITHUB_TOKEN=<token> gh pr view ...`
   - If a PR already exists, report the PR number and URL, then stop without updating it.
7. Read the issue title and body with `GITHUB_TOKEN=<token> gh issue view <issue-number> --json title,body`
8. Inspect the actual branch changes before drafting the PR:
   - `git log --oneline $(git merge-base HEAD <default-branch>)..HEAD`
   - `git diff --stat $(git merge-base HEAD <default-branch>)..HEAD`
9. Draft the PR title in this format:

```text
<type>(<scope>): <implemented summary> (#<issue-number>)
```

10. Draft the PR body using the issue as source context and the branch diff as source truth. Do **not** copy the full issue body verbatim. Rewrite it into this structure:

```md
Closes #<issue-number>

## Summary
- <2-4 bullets describing the actual implemented changes>

## Context
<1 short paragraph explaining the problem and why this PR exists>

## Traceability
- PRD: <path or —>
- PRD Section: <section refs or —>
- Dependencies: <dependencies or omit if none>

## Verification
~~~bash
<verification commands from the issue, preserved when present>
~~~
```

11. Push the branch: `git push -u origin <branch-name>`
12. Create the PR with `GITHUB_TOKEN=<token> gh pr create --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"`
13. Return the created PR number and URL.

## Scope

- This command owns the push + PR creation flow.
- Use the issue for intent, but summarize the actual diff in `## Summary`.
- Do not copy the full issue body into the PR description.
- Do not record workflow state here.
