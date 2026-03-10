# repository

`repository` loads or saves aggregate persistence state from storage.

- Keep it under `infra/persistence/` or another explicit persistence capability.
- Use it for reading, writing, resolving, or expanding persisted project state.
- Do not format CLI output or embed command orchestration in this role.
