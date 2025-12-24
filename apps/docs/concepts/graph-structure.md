# Graph Structure

A Riviere graph consists of metadata, components, and links.

> **See the real thing**: Load example graphs in Eclair to explore interactively. The structure below matches the Riviere JSON Schema.

## Top-Level Structure

```typescript
interface RiviereGraph {
  version: string
  metadata: {
    name?: string
    description?: string
    generated: string
    sources: SourceMetadata[]
    domains: Record<string, DomainMetadata>
  }
  components: Component[]
  links: Link[]
}
```

## Components

Components represent architectural elements. All components share a base structure:

```typescript
interface BaseComponent {
  id: string
  type: ComponentType
  name: string
  domain: string
  module: string
  sourceLocation: SourceLocation
  description?: string
  metadata?: Record<string, unknown>
}
```

### Component Types

| Type | Purpose | Type-Specific Fields |
|------|---------|---------------------|
| `UI` | User interface entry points | `route` (required) |
| `API` | HTTP endpoints | `apiType`, `httpMethod`, `path` or `operationName` |
| `UseCase` | Application layer orchestration | — |
| `DomainOp` | Domain logic operations | `operationName`, `entity`, `stateChanges`, `businessRules` |
| `Event` | Published domain events | `eventName`, `eventSchema` (optional) |
| `EventHandler` | Event subscribers | `subscribedEvents` |
| `Custom` | Extension point | Defined by custom type registration |

### UI Component

```typescript
builder.addUI({
  domain: 'frontend',
  module: 'checkout',
  name: 'checkout-page',
  route: '/checkout',
  sourceLocation: {
    repository: 'your-repo/frontend',
    filePath: 'src/pages/checkout.tsx',
    lineNumber: 1
  }
})
```

### API Component

REST API:
```typescript
builder.addApi({
  domain: 'orders',
  module: 'api',
  httpMethod: 'POST',
  path: '/orders',
  apiType: 'REST',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/api/orders.ts',
    lineNumber: 10
  }
})
```

GraphQL API:
```typescript
builder.addApi({
  domain: 'orders',
  module: 'api',
  apiType: 'GraphQL',
  operationName: 'placeOrder',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/graphql/place-order.ts',
    lineNumber: 5
  }
})
```

### UseCase Component

```typescript
builder.addUseCase({
  domain: 'orders',
  module: 'checkout',
  name: 'place-order',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/use-cases/place-order.ts',
    lineNumber: 15
  }
})
```

### DomainOp Component

With entity and state changes (method on aggregate):
```typescript
builder.addDomainOp({
  domain: 'orders',
  module: 'core',
  entity: 'Order',
  operationName: 'begin',
  stateChanges: [
    { from: 'none', to: 'pending' }
  ],
  businessRules: [
    'Order must have at least one item',
    'Total must be positive'
  ],
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/domain/order.ts',
    lineNumber: 42,
    methodName: 'begin'
  }
})
```

Without entity (domain service):
```typescript
builder.addDomainOp({
  domain: 'orders',
  module: 'services',
  operationName: 'calculateTax',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/domain/tax.ts',
    lineNumber: 12,
    methodName: 'calculateTax'
  }
})
```

### Event Component

```typescript
builder.addEvent({
  domain: 'orders',
  module: 'events',
  eventName: 'order-placed',
  eventSchema: '{ orderId: string, items: Item[] }',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/events/order-placed.ts',
    lineNumber: 5
  }
})
```

### EventHandler Component

```typescript
builder.addEventHandler({
  domain: 'shipping',
  module: 'handlers',
  name: 'on-order-placed',
  subscribedEvents: ['order-placed'],
  sourceLocation: {
    repository: 'your-repo/shipping',
    filePath: 'src/handlers/on-order-placed.ts',
    lineNumber: 10
  }
})
```

### Custom Component

First register the type, then use it:

```typescript
builder.defineCustomType('Queue', {
  requiredFields: ['queueName'],
  optionalFields: ['dlqEnabled']
})

builder.addCustom({
  domain: 'messaging',
  module: 'queues',
  customType: 'Queue',
  name: 'order-events',
  queueName: 'order-events-queue',
  dlqEnabled: true,
  sourceLocation: {
    repository: 'your-repo/messaging',
    filePath: 'src/queues/order-events.ts',
    lineNumber: 1
  }
})
```

## Links

Links connect components to show flow:

```typescript
interface Link {
  id: string
  source: string
  target: string
  type: 'sync' | 'async'
  sourceLocation?: SourceLocation
}
```

### Link Types

| Type | Meaning | Example |
|------|---------|---------|
| `sync` | Synchronous call, waits for response | API → UseCase |
| `async` | Asynchronous, fire-and-forget | Event → EventHandler |

### Creating Links

```typescript
builder.link(sourceComponent, targetComponent, 'sync')

builder.link(api, useCase, 'sync', {
  repository: 'your-repo/service',
  filePath: 'src/api/handler.ts',
  lineNumber: 55
})
```

## Domains

Domains represent system boundaries (an ownership or deployment area you want to group components under):

```typescript
interface DomainMetadata {
  description: string
  systemType: 'domain' | 'bff' | 'ui' | 'other'
}
```

Domains are declared in the builder configuration:

```typescript
const builder = new RiviereBuilder({
  sources: [{ repository: '...' }],
  domains: {
    orders: {
      description: 'Order management and checkout',
      systemType: 'domain',
    },
    frontend: {
      description: 'Customer-facing UI',
      systemType: 'ui'
    }
  }
})
```

Entity information (state machines, business rules) is captured on DomainOp components via `stateChanges` and `businessRules` fields.

## Source Location

Every component requires a source location:

```typescript
interface SourceLocation {
  repository: string
  filePath: string
  lineNumber?: number
  endLineNumber?: number
  methodName?: string
  url?: string
}
```

Example:
```typescript
sourceLocation: {
  repository: 'your-repo/my-service',
  filePath: 'src/domain/order.ts',
  lineNumber: 42,
  methodName: 'begin'
}
```

## See Also

- **Riviere JSON Schema** — `/schema/riviere.schema.json`
- [Resources](/guide/resources) — Complete list of references
