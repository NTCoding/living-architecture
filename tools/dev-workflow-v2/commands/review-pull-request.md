# review-pull-request

Run the repository review agents for a pull request without reading or changing `dev-workflow-v2` workflow state.

## Arguments

The user provides a GitHub pull request number — use `123`, not `#123`.

## Review inputs

1. Resolve the current repository owner and name:

   ```bash
   gh repo view --json owner,name
   ```

2. Use GitHub GraphQL to read the pull request's changed files and every linked closing issue. Paginate both connections until `pageInfo.hasNextPage` is false. Read each closing issue's number, URL, title, and body.

   The query must include:

   ```graphql
   pullRequest(number: <number>) {
     files(first: 100) { nodes { path } pageInfo { hasNextPage endCursor } }
     closingIssuesReferences(first: 100) {
       nodes { number url title body }
       pageInfo { hasNextPage endCursor }
     }
   }
   ```

   Use `gh api graphql`. Do not use a workflow command, the `workflow` tool, or `codex-workflow`.

3. Build the changed-file list from every returned `path`.

4. When at least one linked issue exists, create the `Task Details` input for `task-check` by including every linked issue's number, URL, title, and body. Keep the individual issues distinct so the reviewer can assess every acceptance criterion.

## Launch and diagnostic record

Launch `architecture-review`, `code-review`, and `bug-scanner` in parallel. When one or more linked issues exist, launch `task-check` in the same parallel group and give it the `Task Details` input.

For Pi, use the `subagent` tool once, with one `workflowScript` containing `runs.all`. Launch each reviewer in a fresh context and wait for all of them. For every other harness, use its supported parallel subagent mechanism. Give each launched reviewer its agent definition, the pull request number, and the complete changed-file list.

Only after every applicable reviewer has been launched successfully, publish this ordinary pull request comment through the GitHub REST API:

```text
[workflow-orchestrator] Code review started via manual trigger.

Agents started:
- architecture-review
- code-review
- bug-scanner
- task-check

Agents not started:
- None
```

When no linked issue exists, do not launch `task-check`. After the other three reviewers have launched successfully, publish this instead:

```text
[workflow-orchestrator] Code review started via manual trigger.

Agents started:
- architecture-review
- code-review
- bug-scanner

Agents not started:
- task-check: no linked issue
```

Use `gh api --method POST repos/<owner>/<repo>/issues/<pull-request-number>/comments` to publish the comment. Do not publish it if launching any applicable reviewer fails. Do not record reviewer status or transition workflow state.

After the reviewers finish, return only their completion receipts.
