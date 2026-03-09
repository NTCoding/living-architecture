# cli-output-formatter

`cli-output-formatter` produces deterministic CLI-facing text or structured output.

- Keep it in formatting code such as `packages/riviere-cli/src/platform/infra/cli-presentation/`.
- Use it for markdown rendering, timing summaries, stats formatting, and presentation-ready output objects.
- Do not choose commands, call external systems, or mutate workflow state here.
