# create-pr

Push the current branch and create a PR using the standard repo format.

## Usage

```bash
/dev-workflow-v2:create-pr
```

## Instructions

1. Read the current branch name: `git branch --show-current`
1. Fail if the current branch is `main`.
1. Extract the GitHub issue number from the branch name pattern `issue-<N>-...`
   - If no issue number can be inferred, stop and tell the user the command requires an issue-based branch name.
1. Get a GitHub token: `gh auth token`
1. Check whether a PR already exists for the current branch with `gh pr view --json number,url`
   - Run the command as `GITHUB_TOKEN=<token> gh pr view ...`
   - If a PR already exists, report the PR number and URL, then stop without updating it.
1. Read the issue title and body with `GITHUB_TOKEN=<token> gh issue view <issue-number> --json title,body`
1. Inspect the actual branch changes before drafting the PR:
   - `git log --oneline $(git merge-base HEAD main)..HEAD`
   - `git diff --stat $(git merge-base HEAD main)..HEAD`
1. Draft the PR title in this format:

```text
<type>(<scope>): <implemented summary> (#<issue-number>)
```

1. Draft the PR body using the issue as source context and the branch diff as source truth. Do **not** copy the full issue body verbatim. Rewrite it into this structure:

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

1. Push the branch: `git push -u origin <branch-name>`
1. Create the PR with `GITHUB_TOKEN=<token> gh pr create --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"`
1. Return the created PR number and URL.

## Scope

- This command owns the push + PR creation flow.
- Use the issue for intent, but summarize the actual diff in `## Summary`.
- Do not copy the full issue body into the PR description.
- Do not record workflow state here.
