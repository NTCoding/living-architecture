# role-enforcement-runner

`role-enforcement-runner` launches deterministic role enforcement through the chosen lint runtime.

- Keep it in `packages/riviere-role-enforcement/src/features/check/infra/run-role-enforcement-command.ts`.
- Use it for temporary config shims, Oxlint invocation, and process exit-code handling.
- Do not parse source files or classify roles directly here.
