# workflow-execution-adapter

`workflow-execution-adapter` bridges workflow-domain execution to process and file-output infrastructure.

- Keep it in `tools/dev-workflow/platform/infra/workflow-execution/`.
- Use it for running a workflow, writing optional files, and surfacing final execution errors.
- Do not move command-specific policy into this role.
