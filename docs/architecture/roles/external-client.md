# external-client

`external-client` wraps deterministic access to an external tool, library, or service.

- Keep it under capability-first paths such as `infra/external-client/<technology>/`.
- Use it for process execution, network calls, and external-system adapters.
- Do not hide domain policy or command orchestration in this role.
