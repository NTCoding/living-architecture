# cli-output-writer

`cli-output-writer` emits already-formatted CLI output to stdout or stderr.

- Keep it focused on writing output channels and top-level output branching.
- Use dedicated formatters to build output text or structured payloads before writing.
- Do not orchestrate extraction or query execution here.
