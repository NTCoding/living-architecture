---
pageClass: reference
---

# Connection Config Reference

Reference for connection detection options in Extraction Config.

## Overview

| Option                             | Description                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| `connections.eventPublishers`      | Event publisher declarations for convention-based async Links    |
| `connections.httpLinks`            | HTTP link resolution for cross-domain and external service calls |

---

### `connections.eventPublishers`

Declares custom component types that publish Events using metadata. Used with convention decorators:
- `@EventPublisherContainer` on publisher classes
- `@Event` on published event classes
- `@EventHandlerContainer` on subscriber handlers consuming those Events

The extractor matches publisher components (by `fromType`) to Event components (by the metadata value in `metadataKey`), creating async Links.

**Parameters:**

| Field                                       | Type     | Required | Description                                              |
| ------------------------------------------- | -------- | -------- | -------------------------------------------------------- |
| `connections.eventPublishers[].fromType`    | `string` | **Yes**  | Custom component type name matching the `eventPublisher` type defined in `customTypes`. This is the type used by `@EventPublisherContainer` classes. |
| `connections.eventPublishers[].metadataKey` | `string` | **Yes**  | Metadata key containing the published Event type name. Must match an extracted field on the custom type (e.g., `publishedEventType` from `@Event` classes). |

**Example:**

```json
{
  "connections": {
    "eventPublishers": [
      {
        "fromType": "eventPublisher",
        "metadataKey": "publishedEventType"
      }
    ]
  }
}
```

`fromType: "eventPublisher"` matches the `eventPublisher` custom type defined in `customTypes`. The extractor reads the `publishedEventType` metadata value from each publisher component and finds the Event component with a matching `eventName`.

[View config in ecommerce-demo-app →](https://github.com/NTCoding/ecommerce-demo-app/blob/main/.riviere/config/extraction.config.json)

---

### `connections.httpLinks`

Resolves cross-domain HTTP calls into Links targeting API components in other domains. When a component calls a method on an `httpCall` component, the extractor uses the HTTP client's metadata to find the target API component.

**Parameters:**

| Field                                    | Type       | Required | Description                                                          |
| ---------------------------------------- | ---------- | -------- | -------------------------------------------------------------------- |
| `connections.httpLinks[].fromCustomType` | `string`   | **Yes**  | Custom component type name for HTTP clients (must exist in `customTypes`) |
| `connections.httpLinks[].matchDomainBy`  | `string`   | **Yes**  | Metadata key whose value identifies the target domain                |
| `connections.httpLinks[].matchApiBy`     | `string[]` | **Yes**  | Metadata keys used to match the target API component                 |

**Full example:**

Config:

```yaml
modules:
  - domain: orders
    name: orders
    path: ../../orders
    modules: /src/{module}
    extends: '@living-architecture/riviere-extract-conventions'

  - domain: bff
    name: bff
    path: ../../bff
    modules: /src/{module}
    extends: '@living-architecture/riviere-extract-conventions'

connections:
  eventPublishers:
    - fromType: eventPublisher
      metadataKey: publishedEventType
  httpLinks:
    - fromCustomType: httpCall
      matchDomainBy: serviceName
      matchApiBy: [route, method]
```

BFF HTTP client:

```typescript
/** @httpClient */
export class OrdersServiceClient {
  readonly serviceName = 'orders'
  readonly route = '/orders'
  readonly method = 'POST'

  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    return fetch('http://localhost:3000/orders', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }
}
```

Orders domain API:

```typescript
@APIContainer
export class OrdersEndpoint {
  @Post('/orders')
  async createOrder(req: Request): Promise<Response> { /* ... */ }
}
```

The call graph detects `PlaceOrderBFFUseCase → OrdersServiceClient.placeOrder()`. The `httpLinks` config resolves this: `serviceName: 'orders'` matches the `orders` domain, `route: '/orders'` + `method: 'POST'` matches `createOrder`. The link becomes:

```json
{
  "source": "bff:bff:useCase:placeorderbffusecase",
  "target": "orders:orders:api:createorder",
  "type": "sync"
}
```

When `serviceName` doesn't match any domain (e.g., `'Fraud Detection Service'`), the link becomes an external link:

```json
{
  "source": "bff:bff:useCase:placeorderbffusecase",
  "target": { "name": "Fraud Detection Service", "route": "/api/check", "method": "POST" },
  "type": "sync"
}
```

---

## See Also

- [Extraction Config](/reference/extraction-config/schema) — Full schema, including connection-related definitions
- [TypeScript Extraction Examples](/reference/extraction-config/examples) — Additional config examples
- [Predicate Reference](/reference/extraction-config/predicates) — Predicate options used by component detection
- [Step 4: Link](/extract/deterministic/typescript/workflow/step-4-link) — Connection workflow step
