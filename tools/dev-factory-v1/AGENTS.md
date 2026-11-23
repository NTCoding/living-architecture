# dev-factory-v1

The software factory plans epics and carries GitHub issues through implementation
and review to pull requests. Its local server and UI work with a Claude Code
planning session and Mastra implementation runs.

## Start the factory

From the repository root, run `./start-factory-ui`. This installs the factory's
dependencies, builds the UI, and starts the factory server on port 4800 and
Mastra Studio on port 4111.

Run agent commands from the repository root as `pnpm factory <command>`. The
root script sets `FACTORY_TARGET_REPO` to the repository root.

## Checks

Run `pnpm verify` from this directory. It runs the role check, lint, typecheck,
tests and Knip for the factory. The repository's own `pnpm verify` does not run
these checks.

## Folder layout

- `software-factory/domain-model/` — planning and implementation workflow rules.
- `software-factory/use-cases/` — commands, queries, data access and adapters.
- `server/` — CLI and HTTP entrypoints, infrastructure and Mastra composition.
- `ui/` — the React planning boards, document editor and run views.

## Workspace and role enforcement

This folder is a separate pnpm workspace with its own lockfile. It is excluded
from the repository's pnpm workspace and Nx graph so that it can move into its
own repository later.

Role enforcement uses this workspace's own configuration in `.riviere/`. Keep
it aligned with its own [allowed folder structures
ADR](docs/adr/ADR-001-allowed-folder-structures.md), rather than the repository's
role configuration and ADR.
