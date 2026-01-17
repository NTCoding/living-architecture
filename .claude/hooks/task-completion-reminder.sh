#!/bin/bash
# shellcheck disable=SC2034
read -r input

jq -n '{
  "decision": "block",
  "reason": "MANDATORY: Before stopping on a feature task, you MUST either:\n\n1.
PROVE the PR is mergeable by running:\n   pnpm nx run
dev-workflow:get-pr-feedback\n   Show the output to the user as evidence.\n\n2. OR
  explain clearly why you need help:\n   \"I was not able to achieve a mergeable
PR. I need help with <specific issue>.\"\n\nKeep polling until mergeable or you
hit an unfixable blocker. Pending checks is NOT a blocker - wait for them."
}'
