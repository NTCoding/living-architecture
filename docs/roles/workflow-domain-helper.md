# workflow-domain-helper

`workflow-domain-helper` provides deterministic state-machine helpers for the dev workflow domain.

- Keep it in workflow-domain helper locations such as `tools/dev-workflow/features/*/domain/`, `tools/dev-workflow/platform/domain/`, and `tools/dev-workflow-v2/src/workflow-definition/domain/`.
- Use it for schemas, predicates, folding, lookup helpers, CLI-mode validation, and user-facing state text.
- Do not embed external process access or CLI hook wiring in this role.
