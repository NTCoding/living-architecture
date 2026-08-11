# ADDRESSING_FEEDBACK State

You are addressing PR review feedback.

Start by running `/dev-workflow-v2:workflow get-state` and extracting `prNumber` from its JSON output, then fetch the current PR feedback directly from GitHub for that PR.

## TODO

- [ ] Fetch the current PR feedback from GitHub using GraphQL so you can inspect `reviewDecision`, unresolved review threads, thread ids, URLs, paths, and lines
- [ ] Read each unresolved feedback thread
- [ ] For each thread, either:
  - Fix the issue and respond with what was changed
  - Reject with a specific technical reason (never "out of scope" or "nitpick")
- [ ] Respond to each thread using gh CLI:
  ```bash
  # Reply to thread (use ✅ **Fixed** or ❌ **Rejected** prefix)
  gh api graphql \
    -f query='mutation($pullRequestReviewThreadId: ID!, $body: String!) { addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $pullRequestReviewThreadId, body: $body}) { comment { id } } }' \
    -f pullRequestReviewThreadId='<THREAD_ID>' \
    -f body='<PREFIX>: <explanation>'
  # Resolve thread
  gh api graphql \
    -f query='mutation($threadId: ID!) { resolveReviewThread(input: {threadId: $threadId}) { thread { id } } }' \
    -f threadId='<THREAD_ID>'
  ```
- [ ] Commit all fixes
- [ ] Re-fetch the PR feedback from GitHub and confirm there are no unresolved actionable threads and no `CHANGES_REQUESTED` review decision
- [ ] Record that feedback has been addressed (this also verifies live GitHub state — no unresolved threads and no `CHANGES_REQUESTED`): `/dev-workflow-v2:workflow verify-feedback-addressed`
- [ ] Transition to REVIEWING: `/dev-workflow-v2:workflow transition REVIEWING`

## GraphQL shape

Use a query that fetches this data for the current PR:

- `reviewDecision`
- `reviews { author { login } state }`
- `reviewThreads { id isResolved isOutdated path line comments { body url author { login } } }`

## Constraints

- Cannot transition to REVIEWING unless `verify-feedback-addressed` succeeds
- To leave this state, GitHub must show no unresolved actionable PR feedback and no `CHANGES_REQUESTED` review decision
- Do not infer `prNumber` from branch state or prior messages. When workflow state values are needed, run `/dev-workflow-v2:workflow get-state` and extract the exact fields required from its JSON output.
- Default to accepting feedback — reviewers know their codebase
- Every rejection MUST include a specific technical reason
- If the PR cannot be made mergeable, transition to BLOCKED and tell the user you were unable to make the PR mergeable
