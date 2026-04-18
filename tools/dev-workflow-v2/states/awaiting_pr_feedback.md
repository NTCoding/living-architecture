# AWAITING_PR_FEEDBACK State

This is an automatic workflow-managed state.

The workflow polls GitHub using the fixed constants in `workflow.ts`:

- `PR_FEEDBACK_POLL_INTERVAL_MS = 15_000`
- `PR_FEEDBACK_TIMEOUT_MS = 300_000`

This means the current wait window is fixed at 5 minutes unless those constants are changed in code.

When feedback is available, the workflow automatically transitions to the next state:

- `ADDRESSING_FEEDBACK` if feedback must be addressed
- `REFLECTING` only after `awaitPrFeedback` observes consecutive clean CodeRabbit polls
- `BLOCKED` if the wait times out or feedback cannot be fetched

`awaitPrFeedback` intentionally does not trust the first clean CodeRabbit result. It waits for a second consecutive clean poll before transitioning to `REFLECTING` so a premature `APPROVED` status can settle into a later `CHANGES_REQUESTED` state without sending the workflow down the wrong path.

If CodeRabbit feedback appears and is not clean, the workflow transitions directly to `ADDRESSING_FEEDBACK`, where feedback is re-checked against live GitHub state before REVIEWING can resume. If the wait times out or feedback fetch fails, the workflow transitions to `BLOCKED`.

## Constraints

- Do not attempt to perform manual work in this state
- If this state does not advance automatically, transition to BLOCKED and explain the problem to the user
