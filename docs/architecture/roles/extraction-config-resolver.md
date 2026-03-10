# extraction-config-resolver

`extraction-config-resolver` resolves extraction-config inheritance into executable config.

- Keep it in `packages/riviere-extract-ts/src/features/extraction/domain/config-resolution/`.
- Use it for module inheritance, custom-type merging, and required-rule resolution.
- Do not traverse ASTs or detect components in this role.
