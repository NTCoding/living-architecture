# ID Generation

The library automatically generates IDs following a consistent convention. You never need to specify IDs manually.

## ID Format

```text
{domain}:{module}:{type}:{name}
```

All parts are lowercased. Special characters in names are stripped.

## Component ID Examples

| Component Type | Input | Generated ID |
|---------------|-------|--------------|
| UI | `name: 'checkout-page'` | `frontend:checkout:ui:checkoutpage` |
| API (REST) | `httpMethod: 'POST', path: '/orders'` | `orders:api:api:post/orders` |
| API (GraphQL) | `operationName: 'placeOrder'` | `orders:api:api:placeorder` |
| UseCase | `name: 'place-order'` | `orders:checkout:usecase:placeorder` |
| DomainOp | `entity: 'Order', operationName: 'begin'` | `orders:core:domainop:order.begin` |
| Event | `eventName: 'order-placed'` | `orders:events:event:orderplaced` |
| EventHandler | `name: 'on-order-placed'` | `shipping:handlers:eventhandler:onorderplaced` |
| Custom | `customType: 'Queue', name: 'order-events'` | `messaging:queues:custom:orderevents` |

## Name Derivation

Names are derived from the input parameters:

| Component | Name Source |
|-----------|-------------|
| UI | `name` field |
| API (REST) | `{httpMethod}:{path}` |
| API (GraphQL) | `operationName` |
| UseCase | `name` field |
| DomainOp | `{entity}.{operationName}` or just `operationName` |
| Event | `eventName` |
| EventHandler | `name` field |
| Custom | `name` field |

## Normalization Rules

1. **Lowercase**: All characters converted to lowercase
2. **Strip special characters**: Only `a-z`, `0-9` kept (except `/` in API paths)
3. **No transformation of input**: If code uses `PlaceOrder`, ID uses `placeorder`

## Link ID Format

Link IDs follow this pattern:

```text
{sourceId}→{targetId}:{type}
```

Example:
```text
orders:api:api:post/orders→orders:checkout:usecase:placeorder:sync
```

## Name Validation

Names cannot contain whitespace. Use kebab-case for multi-word names:

```typescript
// Invalid - will throw error
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

// Valid
builder.addUseCase({
  domain: 'orders',
  module: 'checkout',
  name: 'place-order',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/use-cases/place-order.ts',
    lineNumber: 10
  }
})
```

Error message:
```text
Invalid name: "place order". Names cannot contain whitespace. Use kebab-case instead.
```

## Uniqueness

IDs must be unique within a graph. The combination of `domain`, `module`, `type`, and normalized `name` should be unique. If you have two components with the same derived ID, the library will overwrite the first one (the Map uses the ID as key).

## Why Auto-Generation?

1. **Consistency**: All IDs follow the same convention
2. **Predictability**: Given component properties, you can predict the ID
3. **Less error-prone**: No manual ID strings to mistype
4. **Cross-repo linking**: Matching IDs between repos becomes reliable
