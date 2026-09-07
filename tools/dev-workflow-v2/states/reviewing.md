# REVIEWING State

Review execution is owned by the workflow, not by you. The four review agents (architecture-review, code-review, bug-scanner, task-check) were launched automatically when the workflow entered this state, run in parallel, and publish their feedback as ordinary inline PR review comments. The pull request is the visible review record.

This is a fresh context: do not rely on earlier conversation. Initialise from the workflow state.

## TODO

- [ ] Run `/dev-workflow-v2:workflow get-state` and extract `prNumber`, `prUrl`, `featureBranch`, and the PR snapshot head SHA from its JSON output
- [ ] Wait for the review bundle, GitHub checks, and CodeRabbit to make progress
- [ ] Sync reviewer completions into the workflow: `/dev-workflow-v2:workflow sync-reviewer-satisfaction`
- [ ] Evaluate the review gate: `/dev-workflow-v2:workflow verify-pr-review-gate`
  - When feedback or failed checks exist, it transitions the workflow to `ADDRESSING_FEEDBACK` automatically
  - When the gate is satisfied, it transitions the workflow to `REFLECTING` automatically
  - While reviewers, checks, or CodeRabbit are still pending it reports the exact reason; wait and run it again
- [ ] Repeat the sync and gate evaluation until the workflow leaves this state

## Constraints

- Never launch, retry, replace, or record reviewers yourself; the workflow owns reviewer invocation, supervision, and completion
- Never call `/dev-workflow-v2:workflow transition` to leave REVIEWING, except to BLOCKED below; the review gate owns the transition out of this state
- The gate passes only when all of the following hold for the exact current PR head: required PR checks pass, all four reviewers recorded satisfaction, CodeRabbit completed with no unresolved actionable feedback (or is recorded `SKIPPED_RATE_LIMIT` for this PR), and no unresolved review threads remain
- Do not infer completion from silence, elapsed time, or model prose; only the gate's verified evidence counts
- Do not infer `prNumber` or other state values from the branch or prior messages; run `get-state` and extract the exact fields from its JSON output
- If a required input is missing or gate evaluation fails closed, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED` and report the exact failure to the user
