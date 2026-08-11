# domain-port

## Purpose

An interface or function type owned by the domain that describes one capability the domain can invoke without knowing its concrete implementation.

## Rules

1. Defines only the input, output, and invocation contract.
2. Uses domain language and domain-owned types.
3. Contains no implementation or technology-specific types.
4. Lives in `domain/ports/`.

## Canonical Example

```typescript
/** @riviere-role domain-port */
export type PaymentAuthorizer = (
  request: PaymentAuthorizationRequest,
) => PaymentAuthorizationResult
```

## Anti-Patterns

- Importing an external client model.
- Naming the port after a particular library or vendor.
- Implementing I/O inside the port declaration.
