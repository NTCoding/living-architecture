# data-store

`data-store` persists or retrieves feature-owned data structures from storage.

- Keep it in persistence-focused infrastructure such as `infra/persistence/`.
- Use it for loading, saving, and resolving stored feature data.
- Do not embed domain decisions, CLI formatting, or command orchestration in this role.
