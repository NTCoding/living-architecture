# extract-domain-service

`extract-domain-service` performs extraction-specific domain work over draft or enriched component data.

- Keep it under `packages/riviere-cli/src/features/extract/domain/`.
- Prefer pure transformations and deterministic analysis over I/O.
- Keep filesystem, ts-morph project loading, and CLI output concerns in infra or entrypoint roles.
