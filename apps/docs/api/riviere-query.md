---
pageClass: reference
---

# RiviereQuery

Query and analyze Riviere graphs.

**Schema version:** `v1.0`

## Creating a Query Instance

### From RiviereBuilder

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder'

const builder = new RiviereBuilder({
  sources: [{ repository: 'your-repo' }],
  domains: {
    orders: { description: 'Order management', systemType: 'domain' }
  }
})
const query = builder.query()
```

### From JSON File

```typescript
import { RiviereQuery } from '@living-architecture/riviere-query'

const contents = readFileSync('graph.json', 'utf-8')
const query = RiviereQuery.fromFile(contents)
```

### From RiviereGraph Object

```typescript
const graph: RiviereGraph = JSON.parse(jsonString)
const query = new RiviereQuery(graph)
```

---

## Component Methods

### `components`

```typescript
components(): Component[]
```

Returns all components in the graph.

**Example:**

```typescript
const allComponents = query.components()
console.log(`Total: ${allComponents.length}`)
```

---

### `componentById`

```typescript
componentById(id: string): Component | undefined
```

Finds a component by its ID.

**Example:**

```typescript
const component = query.componentById('orders:checkout:api:postorders')
```

---

### `componentsInDomain`

```typescript
componentsInDomain(domainName: string): Component[]
```

Returns all components in a domain.

**Example:**

```typescript
const orderComponents = query.componentsInDomain('orders')
```

---

### `componentsByType`

```typescript
componentsByType(type: ComponentType): Component[]
```

Returns all components of a specific type.

**Example:**

```typescript
const apis = query.componentsByType('API')
const events = query.componentsByType('Event')
```

---

### `find`

```typescript
find(predicate: (component: Component) => boolean): Component | undefined
```

Finds the first component matching a predicate.

**Example:**

```typescript
const checkout = query.find(c => c.name.includes('checkout'))
```

---

### `findAll`

```typescript
findAll(predicate: (component: Component) => boolean): Component[]
```

Finds all components matching a predicate.

**Example:**

```typescript
const orderHandlers = query.findAll(c =>
  c.type === 'EventHandler' && c.domain === 'orders'
)
```

---

## Link Methods

### `links`

```typescript
links(): Link[]
```

Returns all links in the graph.

**Example:**

```typescript
const allLinks = query.links()
console.log(`Total links: ${allLinks.length}`)
```

---

## Entity Methods

### `entities`

```typescript
entities(domainName?: string): Entity[]
```

Returns entities with their domain operations. If `domainName` provided, returns only entities in that domain.

**Example:**

```typescript
const allEntities = query.entities()

const orderEntities = query.entities('orders')

for (const entity of orderEntities) {
  console.log(`${entity.name} has ${entity.operations.length} operations`)
}
```

---

### `operationsFor`

```typescript
operationsFor(entity: string): DomainOp[]
```

Returns all domain operations for a specific entity.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `entity` | `string` | Entity name |

**Returns:** Array of DomainOp components for the entity

**Example:**

```typescript
const orderOps = query.operationsFor('Order')
```

---

### `statesFor`

```typescript
statesFor(entity: string): string[]
```

Returns ordered list of states for an entity based on state transitions.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `entity` | `string` | Entity name |

**Returns:** Array of state names, ordered by transition flow (initial to final)

**Example:**

```typescript
const orderStates = query.statesFor('Order')
```

---

### `transitionsFor`

```typescript
transitionsFor(entity: string): EntityTransition[]
```

Returns state transitions for an entity.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `entity` | `string` | Entity name |

**Returns:** Array of `EntityTransition` objects

**Example:**

```typescript
const transitions = query.transitionsFor('Order')
```

---

### `businessRulesFor`

```typescript
businessRulesFor(entity: string): string[]
```

Collects all business rules across operations of an entity.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `entity` | `string` | Entity name |

**Returns:** Array of business rule strings

**Example:**

```typescript
const rules = query.businessRulesFor('Order')
```

---

## Domain Methods

### `domains`

```typescript
domains(): Domain[]
```

Returns domain information with component counts.

**Returns:** Array of `Domain` objects sorted by name.

**Example:**

```typescript
const domainInfo = query.domains()
for (const domain of domainInfo) {
  console.log(`${domain.name}: ${domain.componentCounts.total} components`)
}
```

---

### `crossDomainLinks`

```typescript
crossDomainLinks(domainName: string): CrossDomainLink[]
```

Returns links from a domain to other domains.

**Returns:** Array of `CrossDomainLink` objects (deduplicated by target domain and type).

**Example:**

```typescript
const outgoing = query.crossDomainLinks('orders')
```

---

## Analysis Methods

### `entryPoints`

```typescript
entryPoints(): Component[]
```

Returns components that could be entry points (UI, API, or EventHandler with no incoming links).

**Example:**

```typescript
const entryPoints = query.entryPoints()
```

---

### `detectOrphans`

```typescript
detectOrphans(): string[]
```

Returns IDs of components with no incoming or outgoing links (orphan nodes).

**Example:**

```typescript
const orphanIds = query.detectOrphans()
if (orphanIds.length > 0) {
  console.warn(`Found ${orphanIds.length} orphan nodes`)
}
```

---

### `traceFlow`

```typescript
traceFlow(startNodeId: string): FlowResult
```

Traces the complete flow bidirectionally from a starting node. Returns all connected nodes and links.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `startNodeId` | `string` | ID of the starting component |

**Returns:** `FlowResult` with `nodeIds` and `linkIds` arrays.

**Example:**

```typescript
const flow = query.traceFlow('orders:checkout:api:postorders')
console.log(`Flow includes ${flow.nodeIds.length} nodes`)
```

---

### `search`

```typescript
search(query: string): Component[]
```

Searches components by name, domain, or type. Returns all components if query is empty.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `query` | `string` | Search term (case-insensitive) |

**Returns:** Array of matching components.

**Example:**

```typescript
const results = query.search('order')
// Matches: "PlaceOrder", "orders" domain, etc.
```

---

## Event Methods

### `publishedEvents`

```typescript
publishedEvents(domainName?: string): PublishedEvent[]
```

Returns published events with their handlers. Optionally filter by domain.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `domainName` | `string?` | Optional domain to filter by |

**Returns:** Array of `PublishedEvent` objects sorted by event name.

**Example:**

```typescript
const allEvents = query.publishedEvents()
const orderEvents = query.publishedEvents('orders')

for (const event of orderEvents) {
  console.log(`${event.eventName} has ${event.handlers.length} handlers`)
}
```

---

### `eventHandlers`

```typescript
eventHandlers(eventName?: string): EventHandlerInfo[]
```

Returns event handlers with their subscribed events. Optionally filter by event name.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `eventName` | `string?` | Optional event name to filter by |

**Returns:** Array of `EventHandlerInfo` objects sorted by handler name.

**Example:**

```typescript
const allHandlers = query.eventHandlers()
const orderPlacedHandlers = query.eventHandlers('order-placed')
```

---

### `domainConnections`

```typescript
domainConnections(domainName: string): DomainConnection[]
```

Returns cross-domain connections for a domain with API and event counts.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `domainName` | `string` | Domain to analyze |

**Returns:** Array of `DomainConnection` objects (both incoming and outgoing).

**Example:**

```typescript
const connections = query.domainConnections('orders')
for (const conn of connections) {
  console.log(`${conn.direction} to ${conn.targetDomain}: ${conn.apiCount} API, ${conn.eventCount} event`)
}
```

---

## Flow Methods

### `flows`

```typescript
flows(): Flow[]
```

Returns all flows in the graph, ready to render. Each flow starts from an entry point (UI, API, or Custom with no incoming links) and traces forward through the graph.

**Returns:** Array of `Flow` objects with entry point and steps.

**Example:**

```typescript
const flows = query.flows()

for (const flow of flows) {
  console.log(`Flow: ${flow.entryPoint.name}`)
  for (const step of flow.steps) {
    const indent = '  '.repeat(step.depth)
    const arrow = step.linkType ? ` --${step.linkType}-->` : ''
    console.log(`${indent}${step.component.name}${arrow}`)
  }
}
```

**Output:**
```text
Flow: POST /orders
  POST /orders --sync-->
    PlaceOrder --sync-->
      Order.begin
```

---

## Types

### Domain

```typescript
interface Domain {
  name: string
  description: string
  systemType: 'domain' | 'bff' | 'ui' | 'other'
  componentCounts: {
    UI: number
    API: number
    UseCase: number
    DomainOp: number
    Event: number
    EventHandler: number
    Custom: number
    total: number
  }
}
```

### Entity

```typescript
interface Entity {
  name: string
  domain: string
  operations: DomainOp[]
}
```

### CrossDomainLink

```typescript
interface CrossDomainLink {
  targetDomain: string
  linkType: 'sync' | 'async'
}
```

### FlowResult

```typescript
interface FlowResult {
  nodeIds: string[]
  linkIds: string[]
}
```

### PublishedEvent

```typescript
interface PublishedEvent {
  id: string
  eventName: string
  domain: string
  handlers: EventSubscriber[]
}
```

### EventSubscriber

```typescript
interface EventSubscriber {
  domain: string
  handlerName: string
}
```

### EventHandlerInfo

```typescript
interface EventHandlerInfo {
  id: string
  handlerName: string
  domain: string
  subscribedEvents: string[]
  subscribedEventsWithDomain: Array<{
    eventName: string
    sourceDomain: string | undefined
  }>
}
```

### DomainConnection

```typescript
interface DomainConnection {
  targetDomain: string
  direction: 'incoming' | 'outgoing'
  apiCount: number
  eventCount: number
}
```

### FlowStep

```typescript
interface FlowStep {
  component: Component
  linkType: 'sync' | 'async' | undefined
  depth: number
}
```

### Flow

```typescript
interface Flow {
  entryPoint: Component
  steps: FlowStep[]
}
```

## See also

- [API reference](/api/)
- [RiviereBuilder](./riviere-builder)
