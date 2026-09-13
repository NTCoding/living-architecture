# review-pull-request

Run the repository review agents for a pull request without reading or changing `dev-workflow-v2` workflow state.

## Review inputs

Run:

```text
/dev-workflow-v2:workflow get-review-inputs
```

The operation returns one validated JSON object. Give reviewers its `pr`, `reviewCycle`, `includedReviewers`, `excludedReviewers`, `linkedIssues`, `reviewThreads`, and `decisionHistory` values. Do not gather pull request context with `gh`, GraphQL, `jq`, shell commands, or direct workflow state reads.

Review only the supplied `reviewCycle.range`. Use `git diff <range>` to inspect changed lines and `git diff --name-only <range>` to inspect changed paths. Raise findings only on added or changed lines. Read related files only to judge impact and do not report findings on unchanged lines.

Create `Task Details` for `task-check` from each distinct linked issue and the pull request body. The pull request body is authoritative for a scope amendment approved by the human user.

## Launch and diagnostic record

Launch only the reviewers named by `includedReviewers`. Launch `architecture-review`, `code-review`, and `bug-scanner` in parallel when included. Launch `task-check` in that group only when it is included and linked issues exist.

For Pi, use the `subagent` tool once, with one `workflowScript` containing `runs.all`. Launch each reviewer in a fresh context and wait for all of them. For every other harness, use its supported parallel subagent mechanism. Give each launched reviewer the validated JSON values.

Only after every applicable reviewer has launched successfully, publish this ordinary pull request comment through the GitHub REST API:

```text
[workflow-orchestrator] Code review started via manual trigger.

Agents started:
- <included reviewers>

Agents not started:
- <excluded reviewers and reasons>
```

Use `gh api --method POST repos/<owner>/<repo>/issues/<pull-request-number>/comments` to publish the comment. Do not publish it if launching any applicable reviewer fails. Do not record reviewer status or transition workflow state.

After reviewers finish, return only their completion receipts.

## Command failures

Block immediately for an unknown workflow operation, invalid state transition, missing access, ambiguous or externally partial mutation, or a user or product decision.

Any failed command is a process failure that needs to be fixed. Transition to `BLOCKED` and report the failing command with a 5 whys analysis of why it failed, so the instructions can be corrected. Do not improvise a workaround, retry with a modified command, or continue past the failure.
