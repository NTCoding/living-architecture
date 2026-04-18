# ADDRESSING_FEEDBACK State

You are addressing PR review feedback.

Start by fetching the current PR feedback directly from GitHub for the PR recorded in workflow state (`prNumber`).

## TODO

- [ ] Fetch the current PR feedback from GitHub using GraphQL so you can inspect `reviewDecision`, unresolved review threads, thread ids, URLs, paths, and lines
- [ ] Read each unresolved feedback thread
- [ ] For each thread, either:
  - Fix the issue and respond with what was changed
  - Reject with a specific technical reason (never "out of scope" or "nitpick")
- [ ] Respond to each thread using gh CLI:
  ```bash
  # Reply to thread (use ✅ **Fixed** or ❌ **Rejected** prefix)
  gh api graphql -f query='mutation { addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: "<THREAD_ID>", body: "<PREFIX>: <explanation>"}) { comment { id } } }'
  # Resolve thread
  gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<THREAD_ID>"}) { thread { id } } }'
  ```
- [ ] Commit all fixes
- [ ] Re-fetch the PR feedback from GitHub and confirm there are no unresolved actionable threads and no `CHANGES_REQUESTED` review decision
- [ ] Verify the PR is mergeable from a review perspective: `/dev-workflow-v2:workflow record-feedback-addressed`
- [ ] Transition to REVIEWING: `/dev-workflow-v2:workflow transition REVIEWING`

## GraphQL shape

Use a query that fetches this data for the current PR:

- `reviewDecision`
- `reviews { author { login } state }`
- `reviewThreads { id isResolved isOutdated path line comments { body url author { login } } }`

## Constraints

- Cannot transition to REVIEWING unless `record-feedback-addressed` succeeds
- To leave this state, GitHub must show no unresolved actionable PR feedback and no `CHANGES_REQUESTED` review decision
- Default to accepting feedback — reviewers know their codebase
- Every rejection MUST include a specific technical reason
- If the PR cannot be made mergeable, transition to BLOCKED and tell the user you were unable to make the PR mergeable
