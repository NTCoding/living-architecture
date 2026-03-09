# workflow-infra-client

`workflow-infra-client` talks to Git, GitHub, Nx, Claude, or other external process and API boundaries for the workflow tool.

- Keep it in workflow external-client locations such as `tools/dev-workflow/platform/infra/external-clients/` and `tools/dev-workflow-v2/src/infra/`.
- Use it for command execution, response parsing setup, and external data loading.
- Keep state-machine policy and transition logic in workflow domain roles.
