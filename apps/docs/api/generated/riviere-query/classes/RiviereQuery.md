# Class: RiviereQuery

Defined in: [packages/riviere-query/src/RiviereQuery.ts:48](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L48)

Query and analyze Riviere architecture graphs.

RiviereQuery provides methods to explore components, trace execution flows,
analyze domain models, and compare graph versions.

## Example

```typescript
import { RiviereQuery } from '@living-architecture/riviere-query'

// From JSON
const query = RiviereQuery.fromJSON(graphData)

// Query components
const apis = query.componentsByType('API')
const orderDomain = query.componentsInDomain('orders')

// Trace flows
const flow = query.traceFlow('orders:checkout:api:post-orders')
```

## Constructors

### Constructor

> **new RiviereQuery**(`graph`): `RiviereQuery`

Defined in: [packages/riviere-query/src/RiviereQuery.ts:63](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L63)

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:311](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L311)

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:195](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L195)

Finds a component by its ID.

#### Parameters

##### id

`string` & `$brand`\<`"ComponentId"`\>

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:97](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L97)

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:244](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L244)

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:228](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L228)

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

> **crossDomainLinks**(`domainName`): [`CrossDomainLink`](../interfaces/CrossDomainLink.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:495](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L495)

Returns links from a domain to other domains.

#### Parameters

##### domainName

`string`

The source domain name

#### Returns

[`CrossDomainLink`](../interfaces/CrossDomainLink.md)[]

Array of CrossDomainLink objects (deduplicated by target domain and type)

#### Example

```typescript
const outgoing = query.crossDomainLinks('orders')
```

***

### detectOrphans()

> **detectOrphans**(): `string` & `$brand`\<`"ComponentId"`\>[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:148](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L148)

Detects orphan components with no incoming or outgoing links.

#### Returns

`string` & `$brand`\<`"ComponentId"`\>[]

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

> **diff**(`other`): [`GraphDiff`](../interfaces/GraphDiff.md)

Defined in: [packages/riviere-query/src/RiviereQuery.ts:400](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L400)

Compares this graph with another and returns the differences.

#### Parameters

##### other

`RiviereGraph`

The graph to compare against

#### Returns

[`GraphDiff`](../interfaces/GraphDiff.md)

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

> **domainConnections**(`domainName`): [`DomainConnection`](../interfaces/DomainConnection.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:515](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L515)

Returns cross-domain connections with API and event counts.

Shows both incoming and outgoing connections for a domain.

#### Parameters

##### domainName

`string`

The domain to analyze

#### Returns

[`DomainConnection`](../interfaces/DomainConnection.md)[]

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

> **domains**(): [`Domain`](../interfaces/Domain.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:261](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L261)

Returns domain information with component counts.

#### Returns

[`Domain`](../interfaces/Domain.md)[]

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

> **entities**(`domainName?`): [`Entity`](../interfaces/Entity.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:296](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L296)

Returns entities with their domain operations.

#### Parameters

##### domainName?

`string`

Optional domain to filter by

#### Returns

[`Entity`](../interfaces/Entity.md)[]

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:361](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L361)

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

> **eventHandlers**(`eventName?`): [`EventHandlerInfo`](../interfaces/EventHandlerInfo.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:436](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L436)

Returns event handlers with their subscriptions.

#### Parameters

##### eventName?

`string`

Optional event name to filter handlers by

#### Returns

[`EventHandlerInfo`](../interfaces/EventHandlerInfo.md)[]

Array of EventHandlerInfo objects sorted by handler name

#### Example

```typescript
const allHandlers = query.eventHandlers()
const orderPlacedHandlers = query.eventHandlers('order-placed')
```

***

### externalDomains()

> **externalDomains**(): [`ExternalDomain`](../interfaces/ExternalDomain.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:591](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L591)

Returns external domains that components connect to.

Each unique external target is returned as a separate ExternalDomain,
with aggregated source domains and connection counts.

#### Returns

[`ExternalDomain`](../interfaces/ExternalDomain.md)[]

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:571](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L571)

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:163](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L163)

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:180](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L180)

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

> **flows**(): [`Flow`](../interfaces/Flow.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:460](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L460)

Returns all flows in the graph.

Each flow starts from an entry point (UI, API, or Custom with no
incoming links) and traces forward through the graph.

#### Returns

[`Flow`](../interfaces/Flow.md)[]

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:112](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L112)

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

> **nodeDepths**(): `Map`\<`string` & `$brand`\<`"ComponentId"`\>, `number`\>

Defined in: [packages/riviere-query/src/RiviereQuery.ts:551](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L551)

Calculates depth from entry points for each component.

Components unreachable from entry points will not be in the map.

#### Returns

`Map`\<`string` & `$brand`\<`"ComponentId"`\>, `number`\>

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:276](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L276)

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

> **publishedEvents**(`domainName?`): [`PublishedEvent`](../interfaces/PublishedEvent.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:420](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L420)

Returns published events with their handlers.

#### Parameters

##### domainName?

`string`

Optional domain to filter by

#### Returns

[`PublishedEvent`](../interfaces/PublishedEvent.md)[]

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:213](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L213)

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

> **searchWithFlow**(`query`, `options`): [`SearchWithFlowResult`](../interfaces/SearchWithFlowResult.md)

Defined in: [packages/riviere-query/src/RiviereQuery.ts:480](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L480)

Searches for components and returns their flow context.

Returns both matching component IDs and all visible IDs in their flows.

#### Parameters

##### query

`string`

Search term

##### options

[`SearchWithFlowOptions`](../interfaces/SearchWithFlowOptions.md)

Search options including returnAllOnEmptyQuery

#### Returns

[`SearchWithFlowResult`](../interfaces/SearchWithFlowResult.md)

Object with matchingIds and visibleIds arrays

#### Example

```typescript
const result = query.searchWithFlow('checkout', { returnAllOnEmptyQuery: true })
console.log(`Found ${result.matchingIds.length} matches`)
console.log(`Showing ${result.visibleIds.length} nodes in context`)
```

***

### statesFor()

> **statesFor**(`entityName`): `string` & `$brand`\<`"State"`\>[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:344](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L344)

Returns ordered states for an entity based on transitions.

States are ordered by transition flow from initial to final states.

#### Parameters

##### entityName

`string`

The entity name to get states for

#### Returns

`string` & `$brand`\<`"State"`\>[]

Array of state names in transition order

#### Example

```typescript
const orderStates = query.statesFor('Order')
// ['pending', 'confirmed', 'shipped', 'delivered']
```

***

### stats()

> **stats**(): [`GraphStats`](../interfaces/GraphStats.md)

Defined in: [packages/riviere-query/src/RiviereQuery.ts:532](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L532)

Returns aggregate statistics about the graph.

#### Returns

[`GraphStats`](../interfaces/GraphStats.md)

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:380](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L380)

Traces the complete flow bidirectionally from a starting component.

Returns all nodes and links connected to the starting point,
following links in both directions.

#### Parameters

##### startComponentId

`string` & `$brand`\<`"ComponentId"`\>

ID of the component to start tracing from

#### Returns

`object`

Object with componentIds and linkIds in the flow

##### componentIds

> **componentIds**: `string` & `$brand`\<`"ComponentId"`\>[]

##### linkIds

> **linkIds**: `string` & `$brand`\<`"LinkId"`\>[]

#### Example

```typescript
const flow = query.traceFlow('orders:checkout:api:post-orders')
console.log(`Flow includes ${flow.componentIds.length} nodes`)
```

***

### transitionsFor()

> **transitionsFor**(`entityName`): [`EntityTransition`](../interfaces/EntityTransition.md)[]

Defined in: [packages/riviere-query/src/RiviereQuery.ts:326](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L326)

Returns state transitions for an entity.

#### Parameters

##### entityName

`string`

The entity name to get transitions for

#### Returns

[`EntityTransition`](../interfaces/EntityTransition.md)[]

Array of EntityTransition objects

#### Example

```typescript
const transitions = query.transitionsFor('Order')
```

***

### validate()

> **validate**(): [`ValidationResult`](../interfaces/ValidationResult.md)

Defined in: [packages/riviere-query/src/RiviereQuery.ts:131](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L131)

Validates the graph structure beyond schema validation.

Checks for structural issues like invalid link references.

#### Returns

[`ValidationResult`](../interfaces/ValidationResult.md)

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

Defined in: [packages/riviere-query/src/RiviereQuery.ts:81](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-query/src/RiviereQuery.ts#L81)

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
