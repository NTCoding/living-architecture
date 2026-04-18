# COMPLETE State

The task is done. PR is merged or ready for human review.

## TODO

- [ ] Summarise what was delivered: feature built, PR link, key technical decisions
- [ ] Run `/dev-workflow-v2:workflow show-state` and extract `reflectionPath` from its JSON output
- [ ] Inform the user where the reflection file was written (`reflectionPath`) so they can commit and push it if desired
- [ ] List any follow-up work if applicable
- [ ] Notify the user the PR is ready for their review

## Constraints

- This is a terminal state — no further transitions are possible
- The PR stays as-is — merging is the human's decision
