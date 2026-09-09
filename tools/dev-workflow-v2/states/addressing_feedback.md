# ADDRESSING_FEEDBACK State

/compact ignore all previous information. Here are your new instructions:

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
- [ ] Push the recorded feature branch: `git push`
- [ ] Wait for CodeRabbit to process the pushed commit, then re-fetch the PR feedback from GitHub
- [ ] If feedback remains unresolved, return to the fix loop above
- [ ] Commit all fixes and push, then transition to `REVIEWING`: `/dev-workflow-v2:workflow transition REVIEWING`.

## GraphQL shape

Use a query that fetches this data for the current PR:

- `reviewDecision`
- `reviews { author { login } state }`
- `reviewThreads { id isResolved isOutdated path line comments { body url author { login } } }`

## Constraints

- Return to REVIEWING after pushing fixes. Reviewers that have not approved validate their own resolved feedback.
- When all threads are resolved but CodeRabbit remains `CHANGES_REQUESTED` while it processes new commits, wait and periodically re-fetch the feedback; do not transition to `BLOCKED`.
- If CodeRabbit reports that its review is rate limited, transition to `BLOCKED` and tell the user to wait for the rate limit to reset.
- Do not infer `prNumber` from branch state or prior messages. When workflow state values are needed, run `/dev-workflow-v2:workflow get-state` and extract the exact fields required from its JSON output.
- Default to accepting feedback — reviewers know their codebase
- Every rejection MUST include a specific technical reason
- If the PR cannot be made mergeable for a reason other than CodeRabbit processing new commits after all threads were resolved, transition to BLOCKED and tell the user you were unable to make the PR mergeable
