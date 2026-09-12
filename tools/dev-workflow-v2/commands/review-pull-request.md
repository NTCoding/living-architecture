# review-pull-request

Run the repository review agents for a pull request without reading or changing `dev-workflow-v2` workflow state.

## Arguments

The workflow provides:

- a GitHub pull request number — use `123`, not `#123`;
- when a previous review cycle has already closed, the commit that the previous cycle reviewed. On the first cycle there is no previous reviewed commit.

## Review inputs

1. Resolve the current repository owner and name:

   ```bash
   gh repo view --json owner,name
   ```

2. Read the pull request number, URL, title, body, base ref, base commit, and head commit:

   ```bash
   gh api repos/<owner>/<repo>/pulls/<number>
   ```

   The head commit is `head.sha`. The base ref is `base.ref` and the base commit is `base.sha`.

3. Read the linked closing issues, the pull request body, and the decision history. Paginate the closing-issues connection until `pageInfo.hasNextPage` is false.

   The query must include:

   ```graphql
   pullRequest(number: <number>) {
     body
     closingIssuesReferences(first: 100) {
       nodes { number url title body }
       pageInfo { hasNextPage endCursor }
     }
   }
   ```

   Fetch every review thread and every thread comment with GraphQL, paginating both, and include each comment's author and body. This includes `[main-agent]` comments, which are binding records of decisions already made with the human user.

   Use `gh api graphql`. Do not use a workflow command, the `workflow` tool, or `codex-workflow`.

4. Determine the review range:

   - When a previous reviewed commit was provided, the range is `<previous-reviewed-commit>..<head-commit>`. Review only what changed since that commit.
   - When no previous reviewed commit was provided, this is the first review cycle and the whole pull request is in scope. Determine the merge base of the base branch and the head commit, for example `git merge-base origin/<base-ref> <head-commit>`, and use `<merge-base>..<head-commit>`.

   Verify the base of the range is an ancestor of the head commit. If it is not, fail and report the mismatch instead of widening the range.

5. Give each reviewer the exact review range and tell it to review the diff, not the files:

   - run `git diff <range>` to see the changed lines, and `git diff --name-only <range>` for the changed paths;
   - raise findings only on added or changed lines in that diff;
   - read related files only to judge impact, and do not report findings on unchanged lines.

6. Reviewers see only the review range, the pull request body, and the decision history.

7. Create the `Task Details` input for `task-check` from every linked issue's number, URL, title, and body, plus the pull request body. Keep the individual issues distinct so the reviewer can assess every acceptance criterion. The pull request body is authoritative for any scope amendment the human user approved.

## Launch and diagnostic record

Launch `architecture-review`, `code-review`, and `bug-scanner` in parallel. When one or more linked issues exist, launch `task-check` in the same parallel group and give it the `Task Details` input.

For Pi, use the `subagent` tool once, with one `workflowScript` containing `runs.all`. Launch each reviewer in a fresh context and wait for all of them. For every other harness, use its supported parallel subagent mechanism. Give each launched reviewer its agent definition, the pull request number, the review range, the pull request body, and the decision history.

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
