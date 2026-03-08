# query-entity

`query-entity` models read-only query result objects that package multiple query facts behind a small API.

- Use it for classes that represent query-side entities returned from `packages/riviere-query`.
- Keep methods read-only and limited to lightweight derived facts about the entity.
- Do not use it for write-side domain behavior or orchestration.
- Place it under `packages/riviere-query/src/features/querying/queries/`.
