# BLOCKED State

You are blocked and need user intervention.

## TODO

- [ ] Explain the blocker clearly and specifically to the user
- [ ] State exactly what is needed — a decision, missing information, or an action only they can take
- [ ] Wait — do NOT attempt to work around the blocker or make assumptions
- [ ] When the blocker is resolved, transition back to the pre-blocked state: `/dev-workflow-v2:workflow transition <PREVIOUS_STATE>`

## Constraints

- You can only return to the state you were in before BLOCKED was entered — the system recorded your pre-blocked state, that is the only valid return target
- Do not attempt to proceed with incomplete information
- Do not work around missing access or approvals
- Do not make assumptions about business decisions
