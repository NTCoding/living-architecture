# REVIEWING State

First get the workflow state. Continue only when `currentStateMachineState` is `REVIEWING` and extract `prNumber`.

Read `tools/dev-workflow-v2/commands/review-pull-request.md` completely and follow its canonical review procedure using that pull request number. The procedure obtains its own changed-file and linked-issue inputs from GitHub. It must not use a workflow command while launching or recording reviews.

After the procedure has finished, transition to `REVIEWING` again. The workflow then reads the GitHub review record, records the statuses, and moves to `ADDRESSING_FEEDBACK` or `HUMAN_REVIEWING` when all required feedback is available.

## Constraints

- Do not use ACP to run reviewers.
- Do not record reviewer status yourself.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
