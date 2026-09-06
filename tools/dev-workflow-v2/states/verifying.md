# VERIFYING State

Run `/dev-workflow-v2:workflow verify-local`. This operation runs the full local checks and records the exact verified commit. Do not record a claimed check result manually.

After success, transition to SUBMITTING_PR with `/dev-workflow-v2:workflow transition SUBMITTING_PR`.

Do not change files or commits while verification is running. If verification fails, the workflow records the failure and enters BLOCKED. Report that exact failure and wait for user direction. Do not retry or change verification infrastructure as a workaround.
