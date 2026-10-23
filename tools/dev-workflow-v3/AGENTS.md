# dev-workflow-v3 — the software factory

A Mastra app that carries a GitHub issue to a pull request that is ready for a person to review.
Run it from the repository root with `pnpm factory <command>`.

## What a session is

A session is one working copy of this repository with its own factory state in
`<workingDirectory>/.factory/`:

- `mastra.db` — the LibSQL database holding workflow runs, messages, scores and observability spans
- `logs/` — run logs, command logs, and `<agentId>-failed-request.json` files written when a model
  provider rejects a request
- `worktrees/` — the git worktrees the implementer works in

## Mastra wiring

`src/infra/external-clients/mastra/` builds everything Mastra needs:

- **Storage and memory** (`create-mastra.ts`): one `LibSQLStore` over `.factory/mastra.db`, shared by
  the `Memory` instance and the `Mastra` instance.
- **Observability** (`createObservability()` in `create-mastra.ts`): service name
  `dev-workflow-v3` with a `MastraStorageExporter`, so spans persist to the `mastra_ai_spans` table
  in the same database. No external exporters, nothing paid.
- **Agents** (`create-agent.ts`): one factory producing `Agent` instances per request, with the ask
  user tool, message processors and an optional workspace over the run's worktree.
- **Generation** (`generate-with-agent.ts`): the single path every model call goes through. The
  thinking level is passed to Mastra as the neutral `modelSettings.reasoning` setting (AI SDK v7
  models), and a provider that rejects a request is recorded to
  `.factory/logs/<agentId>-failed-request.json` before the error is rethrown unchanged.

## Observability tips

Start the server that serves the same Mastra instance with:

```bash
pnpm mastra-ui
```

Then open `http://localhost:4111` for the Mastra UI (Studio).

To prove tracing is on, run any factory command and then query the spans in the database:

```bash
sqlite3 .factory/mastra.db 'SELECT COUNT(*) FROM mastra_ai_spans'
```

If the count grows after a run, spans are being persisted. In Studio, each run shows a trace tree
with per-span durations and token usage.
