# role-config-loader

`role-config-loader` loads and compiles repository role-enforcement config.

- Keep it in `packages/riviere-role-enforcement/src/platform/infra/load-role-enforcement-config.ts`.
- Use it for YAML loading, schema validation, regex compilation, and matcher creation.
- Do not run repository scans or role checks in this role.
