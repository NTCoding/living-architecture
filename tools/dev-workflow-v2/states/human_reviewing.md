# HUMAN_REVIEWING State

Stop and wait for the human to review or merge the pull request.

Run `/dev-workflow-v2:workflow get-state` and read `reviewCycleCapReached`.

- When `reviewCycleCapReached` is false, every custom reviewer and CodeRabbit approved.
- When `reviewCycleCapReached` is true, the 3 review-cycle maximum was reached before all reviewers approved. If the notice has not already been posted, post this ordinary pull request comment once, then wait:

  ```text
  [main-agent] 3 review cycles were completed before all reviewers had approved.
  ```

If the human gives feedback, transition to `ADDRESSING_FEEDBACK` and address it on the pull request.
