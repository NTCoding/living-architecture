/compact

# ADDRESSING_FEEDBACK State

You are the fresh remediation agent. Re-read this file (`${CLAUDE_PLUGIN_ROOT}/states/addressing_feedback.md`) after the compaction and follow it completely. The review gate found actionable feedback or failed required checks on the current PR head. Reviewer feedback is evidence: fix clear, valid, in-scope findings autonomously, and treat everything else as a user decision.

This is a fresh context: do not rely on earlier conversation. Initialise from the workflow state.

## TODO

- [ ] Run `/dev-workflow-v2:workflow get-state` and extract `prNumber`, `prUrl`, `featureBranch`, and the PR snapshot head SHA from its JSON output
- [ ] Fetch the current PR feedback from GitHub so you can inspect `reviewDecision`, unresolved review threads, thread ids, URLs, paths, and lines
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
- [ ] When all findings are handled and committed, return to verification for a follow-up review: `/dev-workflow-v2:workflow transition VERIFYING`

## GraphQL shape

Use a query that fetches this data for the current PR:

- `reviewDecision`
- `reviews { author { login } state }`
- `reviewThreads { id isResolved isOutdated path line comments { body url author { login } } }`

## Constraints

- The review gate owns the decision to leave the review cycle. Remediation returns through VERIFYING so unsatisfied reviewers re-review the new head
- Cannot transition to REFLECTING directly from this state; only the review gate in REVIEWING may open REFLECTING
- Do not infer `prNumber` or other state values from branch state or prior messages. When workflow state values are needed, run `/dev-workflow-v2:workflow get-state` and extract the exact fields required from its JSON output
- Default to accepting feedback — reviewers know their codebase
- Every rejection MUST include a specific technical reason
- Enter BLOCKED only when a finding is unclear, conflicts with approved requirements or guidance, expands scope, belongs elsewhere, requires a product or architecture decision, or cannot be resolved safely. Present the exact finding, the code, the observable behaviour, the task impact, the proposed change, alternatives, and the decision you need: `/dev-workflow-v2:workflow transition BLOCKED`
- Never ask the user to approve vague labels such as "confirmed fixes" or "review remediation"
- Never call a risk a defect without current evidence
