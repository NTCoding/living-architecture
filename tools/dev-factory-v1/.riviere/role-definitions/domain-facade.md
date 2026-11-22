# domain-facade

## Purpose

A class that gives command use cases and query consumers one stable domain interface over several related domain capabilities. It removes the need for those consumers to discover and assemble the capabilities themselves.

## Contract

- It is explicitly approved and includes a justification that answers the role's configured question.
- It may depend on domain services, domain errors, and published language roles.
- Only command use cases, query models, and query model values may depend on it.
- It may coordinate several domain services.
- It may have no instance data. Any instance data it has is private and readonly.
- It is not used internally by its domain model.
