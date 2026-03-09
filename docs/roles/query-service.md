# query-service

`query-service` covers read-side functions and static factory helpers in `packages/riviere-query`.

- Keep the symbol pure and read-only.
- Limit it to graph lookups, filtering, traversal, validation, diffing, typed parsing, or query-factory helpers such as `fromJSON`.
- Keep orchestration focused on producing query results, not mutating graph state.
- Place it under `packages/riviere-query/src/features/querying/queries/`.
