# domain-port-adapter

## Purpose

A narrow implementation of one domain port using one generic external-client API.

## Rules

1. Implements exactly one domain port.
2. Translates the port input into the external-client input.
3. Invokes exactly one external-client API.
4. Translates the external-client result or error into the port result or error.
5. Contains no domain decisions, application orchestration, or direct infrastructure calls.
6. Lives in `adapters/{adapter}/`.

## Canonical Example

```typescript
/** @riviere-role domain-port-adapter */
export function createPaymentAuthorizer(
  paymentClient: PaymentClient,
): PaymentAuthorizer {
  return request => paymentClient.authorize(toPaymentRequest(request))
}
```

## Anti-Patterns

- Importing an aggregate or domain service directly.
- Importing Node APIs or third-party packages.
- Coordinating multiple external clients.
- Implementing the external client itself.
