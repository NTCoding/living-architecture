---
pageClass: reference
---

# Class: RiviereQuery

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:86

Query and analyze Riviere architecture graphs.

RiviereQuery provides methods to explore components, trace execution flows,
analyze domain models, and compare graph versions.

## Example

```typescript
import { RiviereQuery } from '@living-architecture/riviere-builder-domain-model/query'

// From JSON
const query = RiviereQuery.fromJSON(graphData)

// Query components
const apis = query.componentsByType('API')
const orderDomain = query.componentsInDomain('orders')

// Trace flows
const flow = query.traceFlow('orders:checkout:api:post-orders')
```

## Riviere-role

domain-service

## Constructors

### Constructor

> **new RiviereQuery**(`graph`): `RiviereQuery`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:101

Creates a new RiviereQuery instance.

#### Parameters

##### graph

`RiviereGraph`

A valid RiviereGraph object

#### Returns

`RiviereQuery`

#### Throws

If the graph fails schema validation

#### Example

```typescript
const graph: RiviereGraph = JSON.parse(jsonString)
const query = new RiviereQuery(graph)
```

## Methods

### businessRulesFor()

> **businessRulesFor**(`entityName`): `string`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:349

Returns all business rules for an entity's operations.

#### Parameters

##### entityName

`string`

The entity name to get rules for

#### Returns

`string`[]

Array of business rule strings

#### Example

```typescript
const rules = query.businessRulesFor('Order')
```

***

### componentById()

> **componentById**(`id`): `Component` \| `undefined`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:233

Finds a component by its ID.

#### Parameters

##### id

`ComponentId`

The component ID to look up

#### Returns

`Component` \| `undefined`

The component, or undefined if not found

#### Example

```typescript
const component = query.componentById('orders:checkout:api:post-orders')
```

***

### components()

> **components**(): `Component`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:135

Returns all components in the graph.

#### Returns

`Component`[]

Array of all components

#### Example

```typescript
const allComponents = query.components()
console.log(`Total: ${allComponents.length}`)
```

***

### componentsByType()

> **componentsByType**(`type`): `Component`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:282

Returns all components of a specific type.

#### Parameters

##### type

`ComponentType`

The component type to filter by

#### Returns

`Component`[]

Array of components of that type

#### Example

```typescript
const apis = query.componentsByType('API')
const events = query.componentsByType('Event')
```

***

### componentsInDomain()

> **componentsInDomain**(`domainName`): `Component`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:266

Returns all components in a specific domain.

#### Parameters

##### domainName

`string`

The domain name to filter by

#### Returns

`Component`[]

Array of components in the domain

#### Example

```typescript
const orderComponents = query.componentsInDomain('orders')
```

***

### crossDomainLinks()

> **crossDomainLinks**(`domainName`): `CrossDomainLink`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:536

Returns links from a domain to other domains.

#### Parameters

##### domainName

`string`

The source domain name

#### Returns

`CrossDomainLink`[]

Array of CrossDomainLink objects (deduplicated by target domain and type)

#### Example

```typescript
const outgoing = query.crossDomainLinks('orders')
```

***

### detectOrphans()

> **detectOrphans**(): `ComponentId`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:186

Detects orphan components with no incoming or outgoing links.

#### Returns

`ComponentId`[]

Array of component IDs that are disconnected from the graph

#### Example

```typescript
const orphanIds = query.detectOrphans()
if (orphanIds.length > 0) {
  console.warn(`Found ${orphanIds.length} orphan nodes`)
}
```

***

### diff()

> **diff**(`other`): `GraphDiff`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:441

Compares this graph with another and returns the differences.

#### Parameters

##### other

`RiviereGraph`

The graph to compare against

#### Returns

`GraphDiff`

GraphDiff with added, removed, and modified items

#### Example

```typescript
const oldGraph = RiviereQuery.fromJSON(oldData)
const newGraph = RiviereQuery.fromJSON(newData)
const diff = newGraph.diff(oldGraph.graph)

console.log(`Added: ${diff.stats.componentsAdded}`)
console.log(`Removed: ${diff.stats.componentsRemoved}`)
```

***

### domainConnections()

> **domainConnections**(`domainName`): `DomainConnection`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:556

Returns cross-domain connections with API and event counts.

Shows both incoming and outgoing connections for a domain.

#### Parameters

##### domainName

`string`

The domain to analyze

#### Returns

`DomainConnection`[]

Array of DomainConnection objects

#### Example

```typescript
const connections = query.domainConnections('orders')
for (const conn of connections) {
  console.log(`${conn.direction} to ${conn.targetDomain}: ${conn.apiCount} API, ${conn.eventCount} event`)
}
```

***

### domains()

> **domains**(): `Domain`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:299

Returns domain information with component counts.

#### Returns

`Domain`[]

Array of Domain objects sorted by name

#### Example

```typescript
const domains = query.domains()
for (const domain of domains) {
  console.log(`${domain.name}: ${domain.componentCounts.total} components`)
}
```

***

### entities()

> **entities**(`domainName?`): `Entity`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:334

Returns entities with their domain operations.

#### Parameters

##### domainName?

`string`

Optional domain to filter by

#### Returns

`Entity`[]

Array of Entity objects with their operations

#### Example

```typescript
const allEntities = query.entities()
const orderEntities = query.entities('orders')

for (const entity of orderEntities) {
  console.log(`${entity.name} has ${entity.operations.length} operations`)
}
```

***

### entryPoints()

> **entryPoints**(): `Component`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:399

Returns components that are entry points to the system.

Entry points are UI, API, EventHandler, or Custom components
with no incoming links.

#### Returns

`Component`[]

Array of entry point components

#### Example

```typescript
const entryPoints = query.entryPoints()
```

***

### eventHandlers()

> **eventHandlers**(`eventName?`): `EventHandlerInfo`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:477

Returns event handlers with their subscriptions.

#### Parameters

##### eventName?

`string`

Optional event name to filter handlers by

#### Returns

`EventHandlerInfo`[]

Array of EventHandlerInfo objects sorted by handler name

#### Example

```typescript
const allHandlers = query.eventHandlers()
const orderPlacedHandlers = query.eventHandlers('order-placed')
```

***

### externalDomains()

> **externalDomains**(): `ExternalDomain`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:632

Returns external domains that components connect to.

Each unique external target is returned as a separate ExternalDomain,
with aggregated source domains and connection counts.

#### Returns

`ExternalDomain`[]

Array of ExternalDomain objects, sorted alphabetically by name

#### Example

```typescript
const externals = query.externalDomains()
for (const ext of externals) {
  console.log(`${ext.name}: ${ext.connectionCount} connections from ${ext.sourceDomains.join(', ')}`)
}
```

***

### externalLinks()

> **externalLinks**(): `ExternalLink`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:612

Returns all external links in the graph.

External links represent connections from components to external
systems that are not part of the graph (e.g., third-party APIs).

#### Returns

`ExternalLink`[]

Array of all external links, or empty array if none exist

#### Example

```typescript
const externalLinks = query.externalLinks()
for (const link of externalLinks) {
  console.log(`${link.source} -> ${link.target.name}`)
}
```

***

### find()

> **find**(`predicate`): `Component` \| `undefined`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:201

Finds the first component matching a predicate.

#### Parameters

##### predicate

(`component`) => `boolean`

Function that returns true for matching components

#### Returns

`Component` \| `undefined`

The first matching component, or undefined if none found

#### Example

```typescript
const checkout = query.find(c => c.name.includes('checkout'))
```

***

### findAll()

> **findAll**(`predicate`): `Component`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:218

Finds all components matching a predicate.

#### Parameters

##### predicate

(`component`) => `boolean`

Function that returns true for matching components

#### Returns

`Component`[]

Array of all matching components

#### Example

```typescript
const orderHandlers = query.findAll(c =>
  c.type === 'EventHandler' && c.domain === 'orders'
)
```

***

### flows()

> **flows**(): `Flow`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:501

Returns all flows in the graph.

Each flow starts from an entry point (UI, API, or Custom with no
incoming links) and traces forward through the graph.

#### Returns

`Flow`[]

Array of Flow objects with entry point and steps

#### Example

```typescript
const flows = query.flows()

for (const flow of flows) {
  console.log(`Flow: ${flow.entryPoint.name}`)
  for (const step of flow.steps) {
    console.log(`  ${step.component.name} (depth: ${step.depth})`)
  }
}
```

***

### links()

> **links**(): `Link`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:150

Returns all links in the graph.

#### Returns

`Link`[]

Array of all links

#### Example

```typescript
const allLinks = query.links()
console.log(`Total links: ${allLinks.length}`)
```

***

### nodeDepths()

> **nodeDepths**(): `ComponentDepths`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:592

Calculates depth from entry points for each component.

Components unreachable from entry points will not be in the map.

#### Returns

`ComponentDepths`

Map of component ID to depth (0 = entry point)

#### Example

```typescript
const depths = query.nodeDepths()
for (const [id, depth] of depths) {
  console.log(`${id}: depth ${depth}`)
}
```

***

### operationsFor()

> **operationsFor**(`entityName`): `DomainOpComponent`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:314

Returns all domain operations for a specific entity.

#### Parameters

##### entityName

`string`

The entity name to get operations for

#### Returns

`DomainOpComponent`[]

Array of DomainOp components targeting the entity

#### Example

```typescript
const orderOps = query.operationsFor('Order')
```

***

### publishedEvents()

> **publishedEvents**(`domainName?`): `PublishedEvent`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:461

Returns published events with their handlers.

#### Parameters

##### domainName?

`string`

Optional domain to filter by

#### Returns

`PublishedEvent`[]

Array of PublishedEvent objects sorted by event name

#### Example

```typescript
const allEvents = query.publishedEvents()
const orderEvents = query.publishedEvents('orders')

for (const event of orderEvents) {
  console.log(`${event.eventName} has ${event.handlers.length} handlers`)
}
```

***

### search()

> **search**(`query`): `Component`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:251

Searches components by name, domain, or type.

Case-insensitive search across component name, domain, and type fields.

#### Parameters

##### query

`string`

Search term

#### Returns

`Component`[]

Array of matching components

#### Example

```typescript
const results = query.search('order')
// Matches: "PlaceOrder", "orders" domain, etc.
```

***

### searchWithFlow()

> **searchWithFlow**(`query`, `options`): `SearchWithFlowResult`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:521

Searches for components and returns their flow context.

Returns both matching component IDs and all visible IDs in their flows.

#### Parameters

##### query

`string`

Search term

##### options

`SearchWithFlowOptions`

Search options including returnAllOnEmptyQuery

#### Returns

`SearchWithFlowResult`

Object with matchingIds and visibleIds arrays

#### Example

```typescript
const result = query.searchWithFlow('checkout', { returnAllOnEmptyQuery: true })
console.log(`Found ${result.matchingIds.length} matches`)
console.log(`Showing ${result.visibleIds.length} nodes in context`)
```

***

### statesFor()

> **statesFor**(`entityName`): `State`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:382

Returns ordered states for an entity based on transitions.

States are ordered by transition flow from initial to final states.

#### Parameters

##### entityName

`string`

The entity name to get states for

#### Returns

`State`[]

Array of state names in transition order

#### Example

```typescript
const orderStates = query.statesFor('Order')
// ['pending', 'confirmed', 'shipped', 'delivered']
```

***

### stats()

> **stats**(): `GraphStats`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:573

Returns aggregate statistics about the graph.

#### Returns

`GraphStats`

GraphStats with counts for components, links, domains, APIs, entities, and events

#### Example

```typescript
const stats = query.stats()
console.log(`Components: ${stats.componentCount}`)
console.log(`Links: ${stats.linkCount}`)
console.log(`Domains: ${stats.domainCount}`)
```

***

### traceFlow()

> **traceFlow**(`startComponentId`): `object`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:418

Traces the complete flow bidirectionally from a starting component.

Returns all nodes and links connected to the starting point,
following links in both directions.

#### Parameters

##### startComponentId

`ComponentId`

ID of the component to start tracing from

#### Returns

`object`

Object with componentIds and linkIds in the flow

##### componentIds

> **componentIds**: `ComponentId`[]

##### linkIds

> **linkIds**: `LinkId`[]

#### Example

```typescript
const flow = query.traceFlow('orders:checkout:api:post-orders')
console.log(`Flow includes ${flow.componentIds.length} nodes`)
```

***

### transitionsFor()

> **transitionsFor**(`entityName`): `EntityTransition`[]

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:364

Returns state transitions for an entity.

#### Parameters

##### entityName

`string`

The entity name to get transitions for

#### Returns

`EntityTransition`[]

Array of EntityTransition objects

#### Example

```typescript
const transitions = query.transitionsFor('Order')
```

***

### validate()

> **validate**(): `ValidationResult`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:169

Validates the graph structure beyond schema validation.

Checks for structural issues like invalid link references.

#### Returns

`ValidationResult`

Validation result with any errors found

#### Example

```typescript
const result = query.validate()
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

***

### fromJSON()

> `static` **fromJSON**(`json`): `RiviereQuery`

Defined in: packages/riviere-builder/domain-model/src/domain/query/RiviereQuery.ts:119

Creates a RiviereQuery from raw JSON data.

#### Parameters

##### json

`unknown`

Raw JSON data to parse as a RiviereGraph

#### Returns

`RiviereQuery`

A new RiviereQuery instance

#### Throws

If the JSON fails schema validation

#### Example

```typescript
const jsonData = await fetch('/graph.json').then(r => r.json())
const query = RiviereQuery.fromJSON(jsonData)
```
