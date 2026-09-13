# ADDRESSING_FEEDBACK State

Run `/dev-workflow-v2:workflow get-pr-context` and use its recorded pull request identity.

Read `tools/dev-workflow-v2/commands/address-pull-request-feedback.md` completely and follow its canonical procedure using that pull request number. The procedure fetches pull request feedback directly from GitHub and must not read or mutate workflow state while addressing it.

When the procedure finishes with every actionable thread resolved and no `CHANGES_REQUESTED` review, transition to `REVIEWING`: `/dev-workflow-v2:workflow transition REVIEWING`.

## Constraints

- Do not infer pull request identity from branch state, history, or prior messages.
- If the shared procedure needs human input or cannot make the pull request mergeable, remain in `ADDRESSING_FEEDBACK` and report the blocker to the human user.
