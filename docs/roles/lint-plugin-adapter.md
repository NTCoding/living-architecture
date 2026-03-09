# lint-plugin-adapter

`lint-plugin-adapter` connects deterministic role enforcement to the Oxlint plugin surface.

- Keep it in `packages/riviere-role-enforcement/src/features/check/infra/oxlint-plugin.ts`.
- Use it for filename handling, config loading, extraction wiring, and reporting into the linter API.
- Keep validation logic in the checker rather than in the adapter.
