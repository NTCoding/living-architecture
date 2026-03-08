# extract-project-loader

`extract-project-loader` loads or configures the project context used by extraction flows.

- Keep it in `packages/riviere-cli/src/features/extract/infra/external-clients/`.
- Use it for filesystem checks, tsconfig discovery, glob expansion, and ts-morph project setup.
- Do not mix extraction-domain analysis or CLI presentation into this role.
