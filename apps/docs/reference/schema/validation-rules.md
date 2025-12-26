# Validation Rules

The library uses a hybrid validation strategy: some rules are checked immediately, others are deferred to build time.

## Validation Strategy

| Validation | When | Rationale |
|------------|------|-----------|
| Domain exists | Immediate | Catch typos early |
| Name format (no whitespace) | Immediate | Catch invalid names immediately |
| Required fields present | Immediate | Schema compliance |
| Custom type registered | Immediate | Fail fast on unknown types |
| Custom type required fields | Immediate | Type-specific validation |
| Link targets exist | Deferred (build) | Allow forward references |
| Component references valid domain | Deferred (build) | Full graph needed |

## Immediate Validation

These checks happen when you call the method:

### Domain Must Exist

```typescript
const builder = new RiviereBuilder({
  domains: {
    orders: { description: '...', systemType: 'domain' }
  },
  sources: [{ repository: 'your-repo/orders' }]
})

builder.addUseCase({
  domain: 'shipping',
  module: 'checkout',
  name: 'place-order',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/use-cases/place-order.ts',
    lineNumber: 10
  }
})
```

Error:
```text
Unknown domain: "shipping". Available domains: orders
```

### Name Cannot Contain Whitespace

```typescript
builder.addUseCase({
  domain: 'orders',
  module: 'checkout',
  name: 'place order',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/use-cases/place-order.ts',
    lineNumber: 10
  }
})
```

Error:
```text
Invalid name: "place order". Names cannot contain whitespace. Use kebab-case instead.
```

### Custom Type Must Be Registered

```typescript
builder.addCustom({
  domain: 'messaging',
  module: 'queues',
  customType: 'Queue',
  name: 'my-queue',
  queueName: 'my-queue',
  sourceLocation: {
    repository: 'your-repo/messaging',
    filePath: 'src/queues/my-queue.ts',
    lineNumber: 1
  }
})
```

Error:
```text
Unknown custom type: "Queue". Define it first with defineCustomType() or in builder config.
```

### Custom Type Required Fields

```typescript
builder.defineCustomType('Queue', {
  requiredFields: ['queueName']
})

builder.addCustom({
  domain: 'messaging',
  module: 'queues',
  customType: 'Queue',
  name: 'my-queue',
  sourceLocation: {
    repository: 'your-repo/messaging',
    filePath: 'src/queues/my-queue.ts',
    lineNumber: 1
  }
})
```

Error:
```text
Custom type "Queue" requires field "queueName"
```

## Deferred Validation (Build Time)

These checks happen when you call `build()`:

### Link References Must Exist

```typescript
builder.link(api, useCase, 'sync')

const graph = builder.build()
```

Error:
```text
Validation failed:
Link target not found: orders:checkout:usecase:missing
```

### Component Domains Must Be Valid

Components reference domains from config. At build time, this is verified:

```typescript
const graph = builder.build()
```

Error:
```text
Validation failed:
Component "orders:checkout:usecase:placeorder" references unknown domain: orders
```

## Build-Time Validation

The `build()` method runs full validation before returning the graph:

```typescript
const graph = builder.build()
```

If validation fails, an error is thrown with all issues:

```text
Validation failed:
Link source not found: api-missing
Link target not found: usecase-missing
Component "bad:module:usecase:test" references unknown domain: bad
```

## Manual Validation

You can validate without building:

```typescript
const result = builder.validate()
// { valid: boolean, errors: string[] }

if (!result.valid) {
  console.log(result.errors)
}
```

## Duplicate Handling

Adding a component with the same ID overwrites the previous one silently. Adding a link with the same ID is silently ignored (idempotent).

## Summary

| Check | Timing | Method |
|-------|--------|--------|
| Domain exists | Immediate | All `add*` methods |
| Name format | Immediate | `addUI`, `addUseCase`, `addEvent`, `addEventHandler`, `addCustom` |
| Custom type exists | Immediate | `addCustom` |
| Custom required fields | Immediate | `addCustom` |
| Link targets exist | Build | `build()` |
| All domains valid | Build | `build()` |
