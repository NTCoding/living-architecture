# domain-error

`domain-error` represents an invariant or failure that belongs to the domain layer itself.

- Keep it in domain-layer code when the error describes domain rules, aggregate validity, or domain-owned lookup failures.
- Use it for typed failures that domain services and facades intentionally raise.
- Do not use it for CLI transport, workflow process, or generic infrastructure failures.
