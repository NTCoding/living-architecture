# extraction-config-loader

`extraction-config-loader` loads, expands, parses, and validates extraction config files for the CLI.

- Keep it in `packages/riviere-cli/src/platform/infra/extraction-config/`.
- Use it for config-file resolution, module-ref expansion, parse or validation staging, and source-file resolution tied to extraction config loading.
- Do not mix CLI command orchestration or generic graph persistence into this role.
