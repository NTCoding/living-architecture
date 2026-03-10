# domain-factory

`domain-factory` constructs domain value objects or aggregates from already-loaded data and ports.

- Keep construction rules in domain files.
- Inject capabilities through domain interfaces instead of pulling infra details into the factory.
- Do not mix command orchestration or side effects into this role.
