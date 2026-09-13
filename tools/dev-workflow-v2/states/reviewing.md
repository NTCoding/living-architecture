# REVIEWING State

First get the workflow state. Continue only when `currentStateMachineState` is `REVIEWING` and extract `prNumber`, the current review cycle, and `reviewedCommit`. `reviewedCommit` is the commit the previous cycle reviewed and is absent on the first cycle.

Read `tools/dev-workflow-v2/commands/review-pull-request.md` completely and follow its canonical review procedure using that pull request number and, when `reviewedCommit` is present, that commit. The procedure obtains its own review-range, pull request body, decision-history, and linked-issue inputs from GitHub. Review only the changes since `reviewedCommit`, or the whole pull request on the first cycle. The procedure reviews the diff, not the files. It must not use a workflow command while launching or recording reviews. Run only the reviewers included in the current review cycle; reviewers that already approved are excluded and must not be run again.

After every included reviewer has finished, wait for CodeRabbit and close the cycle: `/dev-workflow-v2:workflow wait-for-coderabbit-and-close-review-cycle`.

The workflow waits for CodeRabbit to review the current commit, records the outcome of every reviewer, closes the review cycle, and transitions to `ADDRESSING_FEEDBACK` or `HUMAN_REVIEWING`.

## Review cycle maximum

The workflow permits a maximum of 3 review cycles. A cycle is final when the workflow state's `reviewCycleNumber` is 3 before the cycle closes. When a final cycle closes with any included reviewer still holding open feedback, the workflow moves to `HUMAN_REVIEWING` even though not every reviewer approved, and sets `reviewCycleCapReached` in the workflow state.

When the cycle you just closed sets `reviewCycleCapReached` to true, post this ordinary pull request comment before finishing:

```text
[main-agent] 3 review cycles were completed before all reviewers had approved.
```

Post it with `gh api --method POST repos/<owner>/<repo>/issues/<pull-request-number>/comments`. Do not use a review comment for this notice.

## Constraints

- Do not use ACP to run reviewers.
- Do not record reviewer status yourself.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`.
