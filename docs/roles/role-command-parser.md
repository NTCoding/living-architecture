# role-command-parser

`role-command-parser` parses deterministic role-enforcement CLI arguments.

- Keep it in `packages/riviere-role-enforcement/src/features/check/domain/role-enforcement-command.ts`.
- Use it for command-shape parsing, default-target selection, and deterministic option errors.
- Do not invoke Oxlint or load config files here.
