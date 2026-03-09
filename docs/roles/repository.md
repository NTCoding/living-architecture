# repository

`repository` loads or saves repository-owned state from the filesystem.

- Keep it in persistence-focused infrastructure such as graph loading or extraction-config loading.
- Use it for reading, writing, resolving, or expanding persisted project state.
- Do not format CLI output or embed command orchestration in this role.
