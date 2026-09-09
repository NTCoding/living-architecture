# REVIEWING State

GitHub is the review record. The state's `afterEntry` starts only reviewers whose recorded GitHub status is not `APPROVED`, waits for every required reviewer and CodeRabbit, reads their GitHub inline feedback and approval comments, records only the resulting reviewer statuses, and transitions to the next state. The main agent does not orchestrate reviewers or receive review results.

## Constraints

- An approved reviewer is never invoked again for this pull request.
- Workflow events store reviewer status only. GitHub stores every finding, reply, and approval comment.
- If blocked, transition to BLOCKED: `/dev-workflow-v2:workflow transition BLOCKED`
