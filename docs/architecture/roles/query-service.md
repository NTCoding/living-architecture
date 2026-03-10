# query-service

`query-service` provides exported read helpers that support feature logic without owning the main query package facade.

- Keep it read-only and free of graph mutation.
- Use it for feature-local filtering or lookup helpers under `features/*/queries/`.
- Do not mix output formatting or CLI command construction into this role.
