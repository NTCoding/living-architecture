# cli-input-parser

`cli-input-parser` turns CLI-facing input into validated internal values.

- Keep it in CLI presentation or parsing code such as `packages/riviere-cli/src/platform/infra/cli-presentation/`.
- Use it for flag parsing, validation, stdin decoding, and argument collection.
- Do not execute workflows or persist data in this role.
