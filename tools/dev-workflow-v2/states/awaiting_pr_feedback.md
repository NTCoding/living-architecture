# AWAITING_PR_FEEDBACK State

This is an automatic workflow-managed state.

The workflow polls GitHub using the fixed constants in `workflow.ts`:

- `PR_FEEDBACK_POLL_INTERVAL_MS = 15_000`
- `PR_FEEDBACK_TIMEOUT_MS = 300_000`

This means the current wait window is fixed at 5 minutes unless those constants are changed in code.

When feedback is available, the workflow automatically transitions to the next state:

- `ADDRESSING_FEEDBACK` if feedback must be addressed
- `REFLECTING` after `awaitPrFeedback` observes two consecutive clean CodeRabbit polls
- `BLOCKED` if the wait times out, feedback cannot be fetched, or CodeRabbit reports that its review is rate limited

`awaitPrFeedback` intentionally does not trust the first clean CodeRabbit result. It waits for a second consecutive clean poll before transitioning to `REFLECTING` so a premature `APPROVED` status can settle into a later `CHANGES_REQUESTED` state without sending the workflow down the wrong path.

If CodeRabbit reports that its review is rate limited, the workflow immediately transitions to `BLOCKED` and tells the user to wait for the rate limit to reset before returning to `AWAITING_PR_FEEDBACK`. Otherwise, if CodeRabbit feedback appears and is not clean, the workflow transitions directly to `ADDRESSING_FEEDBACK`, where feedback is re-checked against live GitHub state before REFLECTING can resume. If the wait times out or feedback fetch fails, the workflow transitions to `BLOCKED`.

## Constraints

- Do not attempt to perform manual work in this state
- If this state does not advance automatically, do not transition manually. The workflow must publish `pr-feedback-verification-failed` with a reason before it transitions to BLOCKED.
