# role-assignment-parser

`role-assignment-parser` reads explicit `@riviere-role` annotations from comments.

- Keep it in `packages/riviere-role-enforcement/src/features/check/infra/role-assignment.ts`.
- Use it for annotation parsing and malformed or duplicate-assignment diagnostics.
- Do not infer roles from names or paths here.
