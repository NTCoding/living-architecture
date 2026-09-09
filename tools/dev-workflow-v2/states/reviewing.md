# REVIEWING State

GitHub is the review record. Run only reviewers whose workflow status is not `APPROVED`; they publish prefixed inline feedback on the pull request.

The state's `afterEntry` reads CodeRabbit feedback and records its status. Run `/dev-workflow-v2:code-review` for custom reviewers. When they finish, re-enter REVIEWING; its `afterEntry` moves automatically to `ADDRESSING_FEEDBACK` when feedback is open or to `HUMAN_REVIEWING` when every reviewer has approved.

## Constraints

- An approved reviewer is never invoked again for this pull request.
- Workflow events store reviewer status only. GitHub stores every finding and reply.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
