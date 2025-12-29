# riviere-cli

CLI tool for building and querying Rivière architecture graphs.

## Workflow Prompts

The `docs/workflow/` directory contains AI extraction workflow prompts (step-1 through step-6). These prompts reference CLI commands directly.

**When modifying CLI commands, update the corresponding workflow prompts.**

If a command's flags, behavior, or output format changes, ensure the workflow prompts still work correctly. This keeps the extraction workflow in sync with the CLI.

## Commands

- `riviere builder <command>` - Graph building commands
- `riviere query <command>` - Graph query commands

Run `nx generate-docs riviere-cli` to regenerate CLI reference documentation after command changes.
