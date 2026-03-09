# workflow-step

`workflow-step` is a single workflow operation inside a larger dev-workflow command.

- Keep it in `tools/dev-workflow/features/*/domain/steps/`.
- Use it for one focused step such as fetch, verify, merge, submit, or cleanup.
- Do not embed whole-command CLI parsing or generic workflow execution mechanics here.
