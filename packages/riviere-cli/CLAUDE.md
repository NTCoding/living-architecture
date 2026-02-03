# riviere-cli

CLI tool for building and querying Rivière architecture graphs.

Architecture defined in [ADR-003](../../docs/architecture/adr/ADR-003-riviere-cli-architecture.md).

## Workflow Prompts

The `docs/workflow/` directory contains AI extraction workflow prompts (step-1 through step-6). These prompts reference CLI commands directly.

**When modifying CLI commands, update the corresponding workflow prompts.**

If a command's flags, behavior, or output format changes, ensure the workflow prompts still work correctly. This keeps the extraction workflow in sync with the CLI.

## Layer Pattern

Each layer maps its input to the next layer's types:

```text
entrypoint (CLI options) → command (command input) → domain (domain types)
```

- **Entrypoint**: Defines CLI options, maps to command input, calls command
- **Command**: Validates, maps to domain types, does load→mutate→persist
- **Domain**: Pure logic, takes domain types only, no infra imports

Example: `features/builder/*/add-component.ts`

## Commands

- `riviere builder <command>` - Graph building commands
- `riviere query <command>` - Graph query commands

Run `nx generate-docs riviere-cli` to regenerate CLI reference documentation after command changes.
