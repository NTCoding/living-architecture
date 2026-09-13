# BLOCKED State

You are blocked and need user intervention.

## TODO

- [ ] Explain the blocker clearly and specifically to the user.
- [ ] State exactly what is needed: a decision, missing information, or an action only they can take.
- [ ] Wait. Do not attempt to work around the blocker or make assumptions.
- [ ] Run `/dev-workflow-v2:workflow get-state`, read `preBlockedState` from its JSON output, then transition back to that exact state: `/dev-workflow-v2:workflow transition <preBlockedState>`.

## Constraints

- You can only return to the state held before BLOCKED was entered. The system recorded it in `preBlockedState`; it is the only valid return target.
- Do not attempt to proceed with incomplete information.
- Do not work around missing access or approvals.
- Do not make assumptions about business decisions.
