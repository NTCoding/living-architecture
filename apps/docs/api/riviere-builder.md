---
pageClass: reference
---

# RiviereBuilder

The main class for constructing Riviere graphs.

**Schema version:** `v1.0`

## Constructor

```typescript
constructor(config: RiviereBuilderConfig)
```

Creates a new builder instance.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `config` | `RiviereBuilderConfig` | Builder configuration |

**Config Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | No | Graph name |
| `description` | `string` | No | Graph description |
| `sources` | `SourceMetadata[]` | Yes | At least one source |
| `domains` | `Record<string, DomainMetadata>` | Yes | At least one domain |
| `customTypes` | `Record<string, CustomTypeDefinition>` | No | Pre-registered custom types |

**Throws:**
- `Error` if `sources` is empty
- `Error` if `domains` is empty

**Example:**

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder'

const builder = new RiviereBuilder({
  name: 'my-service',
  description: 'Order processing service',
  sources: [
    { repository: 'your-repo/my-service', commit: 'abc123' }
  ],
  domains: {
    orders: { description: 'Order management', systemType: 'domain' },
    shipping: { description: 'Shipping operations', systemType: 'domain' }
  }
})
```

---

## Component Methods

### `addUI`

```typescript
addUI(input: AddUIInput): Component
```

Adds a UI component.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | Yes | Domain name |
| `module` | `string` | Yes | Module name |
| `name` | `string` | Yes | Component name (no whitespace) |
| `route` | `string` | Yes | UI route path |
| `sourceLocation` | `SourceLocation` | Yes | Code location |
| `description` | `string` | No | Description |
| `metadata` | `Record<string, unknown>` | No | Custom metadata |

**Returns:** The created `UIComponent`

**Throws:**
- `Error` if domain doesn't exist
- `Error` if name contains whitespace

**Example:**

```typescript
const ui = builder.addUI({
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

---

### `addApi`

```typescript
addApi(input: AddAPIInput | AddGraphQLAPIInput): Component
```

Adds an API component. Supports both REST and GraphQL APIs.

**REST API Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | Yes | Domain name |
| `module` | `string` | Yes | Module name |
| `httpMethod` | `HttpMethod` | Yes | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| `path` | `string` | Yes | API path |
| `apiType` | `'REST' \| 'other'` | No | Defaults to 'REST' |
| `sourceLocation` | `SourceLocation` | Yes | Code location |
| `description` | `string` | No | Description |
| `metadata` | `Record<string, unknown>` | No | Custom metadata |

**GraphQL API Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | Yes | Domain name |
| `module` | `string` | Yes | Module name |
| `apiType` | `'GraphQL'` | Yes | Must be 'GraphQL' |
| `operationName` | `string` | Yes | GraphQL operation name |
| `sourceLocation` | `SourceLocation` | Yes | Code location |
| `description` | `string` | No | Description |
| `metadata` | `Record<string, unknown>` | No | Custom metadata |

**Returns:** The created `APIComponent`

**Throws:**
- `Error` if domain doesn't exist

**Examples:**

```typescript
const restApi = builder.addApi({
  domain: 'orders',
  module: 'api',
  httpMethod: 'POST',
  path: '/orders',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/api/orders.ts',
    lineNumber: 10
  }
})

const graphqlApi = builder.addApi({
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

---

### `addUseCase`

```typescript
addUseCase(input: AddUseCaseInput): Component
```

Adds a UseCase component.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | Yes | Domain name |
| `module` | `string` | Yes | Module name |
| `name` | `string` | Yes | UseCase name (no whitespace) |
| `sourceLocation` | `SourceLocation` | Yes | Code location |
| `description` | `string` | No | Description |
| `metadata` | `Record<string, unknown>` | No | Custom metadata |

**Returns:** The created `UseCaseComponent`

**Throws:**
- `Error` if domain doesn't exist
- `Error` if name contains whitespace

**Example:**

```typescript
const useCase = builder.addUseCase({
  domain: 'orders',
  module: 'checkout',
  name: 'place-order',
  description: 'Handles order placement workflow',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/use-cases/place-order.ts',
    lineNumber: 15
  }
})
```

---

### `addDomainOp`

```typescript
addDomainOp(input: AddDomainOpInput): Component
```

Adds a DomainOp (domain operation) component.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | Yes | Domain name |
| `module` | `string` | Yes | Module name |
| `operationName` | `string` | Yes | Operation/method name |
| `entity` | `string` | No | Entity this operation belongs to |
| `stateChanges` | `StateTransition[]` | No | State transitions caused by this operation |
| `businessRules` | `string[]` | No | Business rules enforced by this operation |
| `sourceLocation` | `SourceLocation` | Yes | Code location |
| `description` | `string` | No | Description |
| `metadata` | `Record<string, unknown>` | No | Custom metadata |

**Returns:** The created `DomainOpComponent`

**Throws:**
- `Error` if domain doesn't exist

**Example:**

```typescript
const domainOp = builder.addDomainOp({
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

---

### `addEvent`

```typescript
addEvent(input: AddEventInput): Component
```

Adds an Event component.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | Yes | Domain name |
| `module` | `string` | Yes | Module name |
| `eventName` | `string` | Yes | Event name (no whitespace) |
| `sourceLocation` | `SourceLocation` | Yes | Code location |
| `description` | `string` | No | Description |
| `eventSchema` | `string` | No | Event payload schema |
| `metadata` | `Record<string, unknown>` | No | Custom metadata |

**Returns:** The created `EventComponent`

**Throws:**
- `Error` if domain doesn't exist
- `Error` if eventName contains whitespace

**Example:**

```typescript
const event = builder.addEvent({
  domain: 'orders',
  module: 'events',
  eventName: 'order-placed',
  eventSchema: '{ orderId: string, customerId: string, items: Item[] }',
  sourceLocation: {
    repository: 'your-repo/orders',
    filePath: 'src/events/order-placed.ts',
    lineNumber: 5
  }
})
```

---

### `addEventHandler`

```typescript
addEventHandler(input: AddEventHandlerInput): Component
```

Adds an EventHandler component.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | Yes | Domain name |
| `module` | `string` | Yes | Module name |
| `name` | `string` | Yes | Handler name (no whitespace) |
| `subscribedEvents` | `string[]` | Yes | Event names this handler subscribes to |
| `sourceLocation` | `SourceLocation` | Yes | Code location |
| `description` | `string` | No | Description |
| `metadata` | `Record<string, unknown>` | No | Custom metadata |

**Returns:** The created `EventHandlerComponent`

**Throws:**
- `Error` if domain doesn't exist
- `Error` if name contains whitespace

**Example:**

```typescript
const handler = builder.addEventHandler({
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

---

### `addCustom`

```typescript
addCustom(input: AddCustomInput): Component
```

Adds a Custom component. The custom type must be registered first.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | Yes | Domain name |
| `module` | `string` | Yes | Module name |
| `customType` | `string` | Yes | Registered custom type name |
| `name` | `string` | Yes | Component name (no whitespace) |
| `sourceLocation` | `SourceLocation` | Yes | Code location |
| `description` | `string` | No | Description |
| `metadata` | `Record<string, unknown>` | No | Custom metadata |
| `[key: string]` | `unknown` | Varies | Custom type-specific fields |

**Returns:** The created `CustomComponent`

**Throws:**
- `Error` if domain doesn't exist
- `Error` if name contains whitespace
- `Error` if custom type not registered
- `Error` if required fields missing

**Example:**

```typescript
builder.defineCustomType('Queue', {
  requiredFields: ['queueName'],
  optionalFields: ['dlqEnabled']
})

const queue = builder.addCustom({
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

---

## Custom Type Methods

### `defineCustomType`

```typescript
defineCustomType(name: string, definition: CustomTypeDefinition): void
```

Registers a custom component type.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `name` | `string` | Type name |
| `definition` | `CustomTypeDefinition` | Type definition |

**Definition Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `requiredFields` | `string[]` | Yes | Fields that must be provided |
| `optionalFields` | `string[]` | No | Fields that may be provided |

**Throws:**
- `Error` if type already defined

**Example:**

```typescript
builder.defineCustomType('Database', {
  requiredFields: ['connectionString'],
  optionalFields: ['poolSize', 'ssl']
})
```

---

## Enrichment Methods

### `enrichComponent`

```typescript
enrichComponent(component: Component, enrichment: ComponentEnrichment): void
```

Adds additional data to an existing component. Currently supports DomainOp enrichment.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `component` | `Component` | The component to enrich (from `findComponent()`) |
| `enrichment` | `ComponentEnrichment` | Data to add to the component |

**Throws:**
- `Error` if component type doesn't match enrichment type

**Example:**

```typescript
const domainOp = builder.findComponent({
  type: 'DomainOp',
  operationName: 'begin'
})

if (domainOp) {
  builder.enrichComponent(domainOp, {
    type: 'DomainOp',
    stateChanges: [
      { from: 'none', to: 'pending' }
    ],
    businessRules: [
      'Order must have at least one item'
    ]
  })
}
```

---

## Link Methods

### `link`

```typescript
link(
  source: Component,
  target: Component,
  type: LinkType,
  sourceLocation?: SourceLocation
): void
```

Creates a link between components.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `source` | `Component` | Source component |
| `target` | `Component` | Target component |
| `type` | `'sync' \| 'async'` | Link type |
| `sourceLocation` | `SourceLocation` | Where the link is made (optional) |

**Behavior:**
- If link already exists (same source, target, type), silently ignored
- Link ID generated as `{sourceId}→{targetId}:{type}`

**Example:**

```typescript
builder.link(api, useCase, 'sync')

builder.link(useCase, event, 'async', {
  repository: 'your-repo/orders',
  filePath: 'src/use-cases/place-order.ts',
  lineNumber: 55
})
```

---

### `linkExternal`

```typescript
linkExternal(
  source: Component,
  target: ExternalTarget,
  type: LinkType,
  options?: { description?: string; sourceLocation?: SourceLocation }
): void
```

Creates a link from a component to an external system not in the current graph.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `source` | `Component` | Source component |
| `target` | `ExternalTarget` | External system target |
| `type` | `'sync' \| 'async'` | Link type |
| `options.description` | `string` | Description of the integration (optional) |
| `options.sourceLocation` | `SourceLocation` | Where the link is made (optional) |

**ExternalTarget Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | External system name |
| `domain` | `string` | No | Domain name if known |
| `repository` | `string` | No | Repository name if known |
| `url` | `string` | No | External system URL |

**Example:**

```typescript
builder.linkExternal(
  paymentUseCase,
  { name: 'Stripe', url: 'https://api.stripe.com' },
  'sync',
  { description: 'Process payment via Stripe' }
)
```

---

## Lookup Methods

### `findComponent`

```typescript
findComponent(criteria: ComponentLookupCriteria): Component | undefined
```

Finds a component matching the criteria.

**Returns:** First matching component or `undefined`

**Example:**

```typescript
const component = builder.findComponent({
  sourceLocation: { filePath: 'src/api/orders.ts', lineNumber: 42 }
})

const api = builder.findComponent({
  type: 'API',
  httpMethod: 'POST',
  path: '/orders'
})
```

---

### `find`

```typescript
find(predicate: (component: Component) => boolean): Component | undefined
```

Finds a component using a custom predicate.

**Example:**

```typescript
const component = builder.find(c => c.name.includes('order'))
```

---

### `findAll`

```typescript
findAll(predicate: (component: Component) => boolean): Component[]
```

Finds all components matching a predicate.

**Example:**

```typescript
const orderComponents = builder.findAll(c => c.domain === 'orders')
```

---

### `nearMatches`

```typescript
nearMatches(criteria: ComponentLookupCriteria): NearMatchResult[]
```

Finds components similar to the criteria. Useful when exact match fails.

**Returns:** Array of `{ component, reason }` objects (up to 5).

**Example:**

```typescript
const similar = builder.nearMatches({ eventName: 'order-place' })
```

---

### `getComponents`

```typescript
getComponents(): Component[]
```

Returns all components added to the builder.

---

## Validation Methods

### `validate`

```typescript
validate(): ValidationResult
```

Validates the graph without building.

**Returns:**

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
}
```

**Example:**

```typescript
const result = builder.validate()
if (!result.valid) {
  console.log(result.errors)
}
```

---

### `stats`

```typescript
stats(): BuilderStats
```

Returns builder statistics.

**Returns:**

```typescript
interface BuilderStats {
  components: number
  links: number
  warnings: number
}
```

---

### `orphans`

```typescript
orphans(): Component[]
```

Returns components with no links (neither source nor target).

---

### `warnings`

```typescript
warnings(): string[]
```

Returns all warning messages.

---

## Build Method

### `build`

```typescript
build(): RiviereGraph
```

Validates and builds the final graph.

**Returns:** Complete `RiviereGraph` object

**Throws:**
- `Error` if validation fails

**Example:**

```typescript
const graph = builder.build()
```

---

## Query Method

### `query`

```typescript
query(): RiviereQuery
```

Returns a query client for analyzing the graph.

**Returns:** A `RiviereQuery` instance

**Example:**

```typescript
const query = builder.query()
const entities = query.entities('orders')
const domains = query.domains()
```

See [RiviereQuery](./generated/riviere-query/classes/RiviereQuery) for available query methods.

## See also

- [API reference](/api/)
- [CLI reference](/cli/cli-reference)
