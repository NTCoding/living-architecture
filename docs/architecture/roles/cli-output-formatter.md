# cli-output-formatter

`cli-output-formatter` produces deterministic CLI-facing text or structured output.

- Keep it under `infra/cli/output/`.
- Use it for markdown rendering, timing summaries, stats formatting, and presentation-ready output objects.
- Do not write to stdout/stderr, choose commands, or mutate workflow state here.
