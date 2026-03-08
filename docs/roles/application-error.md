# application-error

`application-error` represents exported non-domain errors used by application, query, entrypoint, or infra code.

- Use it for typed failures that callers are expected to catch or surface.
- Keep the class focused on one failure concept with stable fields for diagnostics.
- Do not use it for domain invariants when a domain-specific error role is more accurate.
