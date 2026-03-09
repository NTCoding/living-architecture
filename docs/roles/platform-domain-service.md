# platform-domain-service

`platform-domain-service` covers shared domain logic under a package's `platform/domain/` layer.

- Keep it in package-level `platform/domain/` code such as `packages/riviere-cli/src/platform/domain/`.
- Use it for pure business behavior shared across multiple entrypoints or commands.
- Do not mix filesystem, process execution, or CLI transport formatting into this role.
