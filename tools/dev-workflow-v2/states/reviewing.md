# REVIEWING State

First get the workflow state. Continue only when `currentStateMachineState` is `REVIEWING` and extract `prNumber` and the current review cycle.

Read `tools/dev-workflow-v2/commands/review-pull-request.md` completely and follow its canonical review procedure using that pull request number. The procedure obtains its own changed-file and linked-issue inputs from GitHub. It must not use a workflow command while launching or recording reviews. Run only the reviewers included in the current review cycle; reviewers that already approved are excluded and must not be run again.

After every included reviewer has finished, wait for CodeRabbit and close the cycle: `/dev-workflow-v2:workflow wait-for-coderabbit-and-close-review-cycle`.

The workflow waits for CodeRabbit to review the current commit, records the outcome of every reviewer, closes the review cycle, and transitions to `ADDRESSING_FEEDBACK` or `HUMAN_REVIEWING`.

## Constraints

- Do not use ACP to run reviewers.
- Do not record reviewer status yourself.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`.
