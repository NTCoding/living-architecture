# command-orchestrator

`command-orchestrator` runs a feature command flow from validated input through infra and domain collaborators.

- Keep it in `commands/` and focused on orchestration.
- Allow branching for command flow, validation, and error mapping, but keep low-level formatting and persistence in dedicated helpers.
- Do not build Commander command trees here; that belongs to `cli-entrypoint`.
