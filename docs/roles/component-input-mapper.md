# component-input-mapper

`component-input-mapper` converts external CLI input into component-oriented internal input.

- Keep it in `packages/riviere-cli/src/platform/infra/component-mapping/`.
- Use it for deterministic field mapping and shape conversion only.
- Do not read files, write graphs, or print CLI output here.
