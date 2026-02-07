# riviere-cli

CLI tool for building and querying Rivière architecture graphs.

Architecture defined in [ADR-002](../../docs/architecture/adr/ADR-002-allowed-folder-structures.md).

## Workflow Prompts

The `docs/workflow/` directory contains AI extraction workflow prompts (step-1 through step-6). These prompts reference CLI commands directly.

**When modifying CLI commands, update the corresponding workflow prompts.**

If a command's flags, behavior, or output format changes, ensure the workflow prompts still work correctly. This keeps the extraction workflow in sync with the CLI.

## Design Philosophy

Default to the most reliable, powerful behavior. Opt-out flags (`--no-*`) for edge cases. Users should get the best experience by default, not discover it when things don't work.

## Layer Pattern

Follows [`development-skills:separation-of-concerns`](https://github.com/NTCoding/claude-skillz/blob/main/separation-of-concerns/SKILL.md) skill. See decision tree (Q1-Q7) for code placement.

## Commands

- `riviere builder <command>` - Graph building commands
- `riviere query <command>` - Graph query commands

Run `nx generate-docs riviere-cli` to regenerate CLI reference documentation after command changes.
