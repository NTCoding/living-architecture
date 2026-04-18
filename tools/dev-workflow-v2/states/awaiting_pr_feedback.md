# AWAITING_PR_FEEDBACK State

This is an automatic workflow-managed state.

The workflow polls GitHub for up to 5 minutes while waiting for a CodeRabbit review on the recorded PR.

When feedback is available, the workflow automatically transitions to the next state:

- `ADDRESSING_FEEDBACK` if feedback must be addressed
- `REFLECTING` if the PR is already clean
- `BLOCKED` if the wait times out or feedback cannot be fetched

## Constraints

- Do not attempt to perform manual work in this state
- If this state does not advance automatically, transition to BLOCKED and explain the problem to the user
