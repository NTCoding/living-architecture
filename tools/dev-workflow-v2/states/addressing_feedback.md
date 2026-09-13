# ADDRESSING_FEEDBACK State

Start by running `/dev-workflow-v2:workflow get-state` and extracting `prNumber` from its JSON output.

Read `tools/dev-workflow-v2/commands/address-pull-request-feedback.md` completely and follow its canonical procedure using that pull request number. The procedure fetches pull request feedback directly from GitHub and must not use a workflow command while addressing it.

When the procedure finishes with every actionable thread resolved and no `CHANGES_REQUESTED` review, transition to `REVIEWING`: `/dev-workflow-v2:workflow transition REVIEWING`.

## Constraints

- Do not infer `prNumber` from branch state or prior messages. When workflow state values are needed, run `/dev-workflow-v2:workflow get-state` and extract the exact fields required from its JSON output.
- If the shared procedure needs human input or cannot make the pull request mergeable, remain in `ADDRESSING_FEEDBACK` and report the blocker to the human user.
