# role-checker

`role-checker` validates one extracted target symbol against one explicit role assignment.

- Keep it in `packages/riviere-role-enforcement/src/features/check/domain/check-role-target.ts`.
- Use it for deterministic missing-role, unknown-role, location, naming, target-kind, and method-shape checks.
- Keep source parsing and config loading outside this role.
