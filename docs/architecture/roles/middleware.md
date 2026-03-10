# middleware

`middleware` handles cross-cutting CLI concerns such as top-level error routing and exit behavior.

- Keep it under `infra/middleware/`.
- Let formatters build messages and payloads before middleware writes or exits.
- Do not embed feature-specific domain logic here.
