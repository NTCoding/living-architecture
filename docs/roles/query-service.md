# query-service

`query-service` covers exported read-side functions in `packages/riviere-query`.

- Keep the function pure and read-only.
- Limit it to graph lookups, filtering, traversal, validation, diffing, or typed parsing that supports query reads.
- Keep orchestration inside the function focused on producing query results, not mutating graph state.
- Place it under `packages/riviere-query/src/features/querying/queries/`.
