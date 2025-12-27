# Class: RiviereBuilder

Defined in: [builder.ts:104](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L104)

Programmatically construct Rivière architecture graphs.

RiviereBuilder provides a fluent API for creating graphs, adding components,
linking them together, and exporting valid JSON conforming to the Rivière schema.

## Example

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder'

const builder = RiviereBuilder.new({
  sources: [{ type: 'git', url: 'https://github.com/org/repo' }],
  domains: { orders: { description: 'Order management' } }
})

const api = builder.addApi({
  name: 'Create Order',
  domain: 'orders',
  module: 'checkout',
  apiType: 'REST',
  sourceLocation: { file: 'src/api/orders.ts', line: 10 }
})

const graph = builder.build()
```

## Properties

### graph

> **graph**: `BuilderGraph`

Defined in: [builder.ts:105](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L105)

## Methods

### addApi()

> **addApi**(`input`): `APIComponent`

Defined in: [builder.ts:292](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L292)

Adds an API component to the graph.

#### Parameters

##### input

[`APIInput`](../interfaces/APIInput.md)

API component properties including type, method, and path

#### Returns

`APIComponent`

The created API component with generated ID

#### Throws

If the specified domain does not exist

#### Example

```typescript
const api = builder.addApi({
  name: 'Create Order',
  domain: 'orders',
  module: 'checkout',
  apiType: 'REST',
  httpMethod: 'POST',
  path: '/api/orders',
  sourceLocation: { file: 'src/api/orders.ts', line: 25 }
})
```

***

### addCustom()

> **addCustom**(`input`): `CustomComponent`

Defined in: [builder.ts:523](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L523)

Adds a Custom component to the graph.

Custom components use types defined via defineCustomType().
Validates that the custom type exists and required properties are provided.

#### Parameters

##### input

[`CustomInput`](../interfaces/CustomInput.md)

Custom component properties including type name and metadata

#### Returns

`CustomComponent`

The created Custom component with generated ID

#### Throws

If the specified domain does not exist

#### Throws

If the custom type has not been defined

#### Throws

If required properties for the custom type are missing

#### Example

```typescript
const queue = builder.addCustom({
  customTypeName: 'MessageQueue',
  name: 'Order Events Queue',
  domain: 'orders',
  module: 'messaging',
  sourceLocation: { file: 'src/queues/orders.ts', line: 5 },
  metadata: { queueName: 'order-events' }
})
```

***

### addDomain()

> **addDomain**(`input`): `void`

Defined in: [builder.ts:225](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L225)

Adds a new domain to the graph.

#### Parameters

##### input

[`DomainInput`](../interfaces/DomainInput.md)

Domain name and description

#### Returns

`void`

#### Throws

If domain with same name already exists

#### Example

```typescript
builder.addDomain({
  name: 'payments',
  description: 'Payment processing'
})
```

***

### addDomainOp()

> **addDomainOp**(`input`): `DomainOpComponent`

Defined in: [builder.ts:369](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L369)

Adds a DomainOp component to the graph.

DomainOp represents domain operations that change entity state.
Can be enriched later with state changes and business rules.

#### Parameters

##### input

[`DomainOpInput`](../interfaces/DomainOpInput.md)

DomainOp component properties including operation name

#### Returns

`DomainOpComponent`

The created DomainOp component with generated ID

#### Throws

If the specified domain does not exist

#### Example

```typescript
const domainOp = builder.addDomainOp({
  name: 'Confirm Order',
  domain: 'orders',
  module: 'fulfillment',
  operationName: 'confirmOrder',
  entity: 'Order',
  sourceLocation: { file: 'src/domain/Order.ts', line: 45 }
})
```

***

### addEvent()

> **addEvent**(`input`): `EventComponent`

Defined in: [builder.ts:410](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L410)

Adds an Event component to the graph.

#### Parameters

##### input

[`EventInput`](../interfaces/EventInput.md)

Event component properties including event name

#### Returns

`EventComponent`

The created Event component with generated ID

#### Throws

If the specified domain does not exist

#### Example

```typescript
const event = builder.addEvent({
  name: 'Order Placed',
  domain: 'orders',
  module: 'checkout',
  eventName: 'OrderPlaced',
  sourceLocation: { file: 'src/events/OrderPlaced.ts', line: 5 }
})
```

***

### addEventHandler()

> **addEventHandler**(`input`): `EventHandlerComponent`

Defined in: [builder.ts:447](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L447)

Adds an EventHandler component to the graph.

#### Parameters

##### input

[`EventHandlerInput`](../interfaces/EventHandlerInput.md)

EventHandler component properties including subscribed events

#### Returns

`EventHandlerComponent`

The created EventHandler component with generated ID

#### Throws

If the specified domain does not exist

#### Example

```typescript
const handler = builder.addEventHandler({
  name: 'Send Confirmation Email',
  domain: 'notifications',
  module: 'email',
  subscribedEvents: ['OrderPlaced'],
  sourceLocation: { file: 'src/handlers/OrderConfirmation.ts', line: 10 }
})
```

***

### addSource()

> **addSource**(`source`): `void`

Defined in: [builder.ts:207](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L207)

Adds an additional source repository to the graph.

#### Parameters

##### source

`SourceInfo`

Source repository information

#### Returns

`void`

#### Example

```typescript
builder.addSource({
  type: 'git',
  url: 'https://github.com/org/another-repo'
})
```

***

### addUI()

> **addUI**(`input`): `UIComponent`

Defined in: [builder.ts:254](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L254)

Adds a UI component to the graph.

#### Parameters

##### input

[`UIInput`](../interfaces/UIInput.md)

UI component properties including route and source location

#### Returns

`UIComponent`

The created UI component with generated ID

#### Throws

If the specified domain does not exist

#### Example

```typescript
const ui = builder.addUI({
  name: 'Order List',
  domain: 'orders',
  module: 'dashboard',
  route: '/orders',
  sourceLocation: { file: 'src/pages/OrderList.tsx', line: 15 }
})
```

***

### addUseCase()

> **addUseCase**(`input`): `UseCaseComponent`

Defined in: [builder.ts:330](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L330)

Adds a UseCase component to the graph.

#### Parameters

##### input

[`UseCaseInput`](../interfaces/UseCaseInput.md)

UseCase component properties

#### Returns

`UseCaseComponent`

The created UseCase component with generated ID

#### Throws

If the specified domain does not exist

#### Example

```typescript
const useCase = builder.addUseCase({
  name: 'Place Order',
  domain: 'orders',
  module: 'checkout',
  sourceLocation: { file: 'src/usecases/PlaceOrder.ts', line: 10 }
})
```

***

### build()

> **build**(): `RiviereGraph`

Defined in: [builder.ts:831](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L831)

Validates and returns the completed graph.

#### Returns

`RiviereGraph`

Valid RiviereGraph object

#### Throws

If validation fails with error details

#### Example

```typescript
try {
  const graph = builder.build()
  console.log('Graph built successfully')
} catch (error) {
  console.error('Build failed:', error.message)
}
```

***

### defineCustomType()

> **defineCustomType**(`input`): `void`

Defined in: [builder.ts:485](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L485)

Defines a custom component type for the graph.

Custom types allow extending the schema with domain-specific component kinds.
Must be defined before adding custom components of that type.

#### Parameters

##### input

[`CustomTypeInput`](../interfaces/CustomTypeInput.md)

Custom type definition with required and optional properties

#### Returns

`void`

#### Throws

If a custom type with the same name already exists

#### Example

```typescript
builder.defineCustomType({
  name: 'MessageQueue',
  description: 'Async message queue',
  requiredProperties: {
    queueName: { type: 'string', description: 'Queue identifier' }
  }
})
```

***

### enrichComponent()

> **enrichComponent**(`id`, `enrichment`): `void`

Defined in: [builder.ts:563](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L563)

Enriches a DomainOp component with additional domain details.

Adds state changes and business rules to an existing DomainOp.
Multiple enrichments accumulate rather than replace.

#### Parameters

##### id

`string`

The component ID to enrich

##### enrichment

[`EnrichmentInput`](../interfaces/EnrichmentInput.md)

State changes and business rules to add

#### Returns

`void`

#### Throws

If the component does not exist

#### Throws

If the component is not a DomainOp type

#### Example

```typescript
builder.enrichComponent('orders:fulfillment:domainop:confirm-order', {
  entity: 'Order',
  stateChanges: [{ entity: 'Order', from: 'pending', to: 'confirmed' }],
  businessRules: ['Order must have valid payment']
})
```

***

### link()

> **link**(`input`): `Link`

Defined in: [builder.ts:653](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L653)

Creates a link between two components in the graph.

Source component must exist; target validation is deferred to build().
Use linkExternal() for connections to external systems.

#### Parameters

##### input

[`LinkInput`](../interfaces/LinkInput.md)

Link properties including source, target, and type

#### Returns

`Link`

The created link

#### Throws

If the source component does not exist

#### Example

```typescript
const link = builder.link({
  from: 'orders:checkout:api:create-order',
  to: 'orders:checkout:usecase:place-order',
  type: 'sync'
})
```

***

### linkExternal()

> **linkExternal**(`input`): `ExternalLink`

Defined in: [builder.ts:687](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L687)

Creates a link from a component to an external system.

Use this for connections to systems outside the graph,
such as third-party APIs or external databases.

#### Parameters

##### input

[`ExternalLinkInput`](../interfaces/ExternalLinkInput.md)

External link properties including target system info

#### Returns

`ExternalLink`

The created external link

#### Throws

If the source component does not exist

#### Example

```typescript
const link = builder.linkExternal({
  from: 'orders:payments:usecase:process-payment',
  target: { name: 'Stripe API', domain: 'payments' },
  type: 'sync'
})
```

***

### nearMatches()

> **nearMatches**(`query`, `options?`): [`NearMatchResult`](../interfaces/NearMatchResult.md)[]

Defined in: [builder.ts:630](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L630)

Finds components similar to a query for error recovery.

Returns fuzzy matches when an exact component lookup fails,
enabling actionable error messages with "Did you mean...?" suggestions.

#### Parameters

##### query

[`NearMatchQuery`](../interfaces/NearMatchQuery.md)

Search criteria including partial ID, name, type, or domain

##### options?

[`NearMatchOptions`](../interfaces/NearMatchOptions.md)

Optional matching thresholds and limits

#### Returns

[`NearMatchResult`](../interfaces/NearMatchResult.md)[]

Array of similar components with similarity scores

#### Example

```typescript
const matches = builder.nearMatches({ name: 'Place Ordr' })
// [{ component: {...}, score: 0.9, mismatches: [...] }]
```

***

### orphans()

> **orphans**(): `string`[]

Defined in: [builder.ts:776](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L776)

Returns IDs of components with no incoming or outgoing links.

#### Returns

`string`[]

Array of orphaned component IDs

#### Example

```typescript
const orphans = builder.orphans()
if (orphans.length > 0) {
  console.warn('Orphaned components:', orphans)
}
```

***

### query()

> **query**(): `RiviereQuery`

Defined in: [builder.ts:793](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L793)

Returns a RiviereQuery instance for the current graph state.

Enables querying mid-construction without affecting builder state.

#### Returns

`RiviereQuery`

RiviereQuery instance for the current graph

#### Example

```typescript
const query = builder.query()
const apis = query.componentsByType('API')
```

***

### save()

> **save**(`path`): `Promise`\<`void`\>

Defined in: [builder.ts:853](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L853)

Validates the graph and writes it to a file.

#### Parameters

##### path

`string`

Absolute or relative file path to write

#### Returns

`Promise`\<`void`\>

#### Throws

If validation fails

#### Throws

If the directory does not exist

#### Throws

If write fails

#### Example

```typescript
await builder.save('./output/architecture.json')
```

***

### serialize()

> **serialize**(): `string`

Defined in: [builder.ts:811](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L811)

Serializes the current graph state as a JSON string.

Does not validate. Use for saving drafts mid-construction
that can be resumed later with RiviereBuilder.resume().

#### Returns

`string`

JSON string representation of the graph

#### Example

```typescript
const json = builder.serialize()
await fs.writeFile('draft.json', json)
```

***

### stats()

> **stats**(): [`BuilderStats`](../interfaces/BuilderStats.md)

Defined in: [builder.ts:737](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L737)

Returns statistics about the current graph state.

#### Returns

[`BuilderStats`](../interfaces/BuilderStats.md)

Counts of components by type, domains, and links

#### Example

```typescript
const stats = builder.stats()
console.log(`Components: ${stats.componentCount}`)
console.log(`Links: ${stats.linkCount}`)
```

***

### validate()

> **validate**(): `ValidationResult`

Defined in: [builder.ts:759](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L759)

Runs full validation on the graph.

Checks for dangling references, orphans, and schema compliance.
Called automatically by build().

#### Returns

`ValidationResult`

Validation result with valid flag and error details

#### Example

```typescript
const result = builder.validate()
if (!result.valid) {
  for (const error of result.errors) {
    console.error(error.message)
  }
}
```

***

### warnings()

> **warnings**(): [`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Defined in: [builder.ts:721](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L721)

Returns non-fatal issues found in the graph.

Warnings indicate potential problems that don't prevent building,
such as orphaned components or unused domains.

#### Returns

[`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Array of warning objects with type and message

#### Example

```typescript
const warnings = builder.warnings()
for (const w of warnings) {
  console.log(`${w.type}: ${w.message}`)
}
```

***

### new()

> `static` **new**(`options`): `RiviereBuilder`

Defined in: [builder.ts:168](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L168)

Creates a new builder with initial configuration.

#### Parameters

##### options

[`BuilderOptions`](../interfaces/BuilderOptions.md)

Configuration including sources and domains

#### Returns

`RiviereBuilder`

A new RiviereBuilder instance

#### Throws

If sources array is empty

#### Throws

If domains object is empty

#### Example

```typescript
const builder = RiviereBuilder.new({
  name: 'My System',
  sources: [{ type: 'git', url: 'https://github.com/org/repo' }],
  domains: {
    orders: { description: 'Order management' },
    users: { description: 'User accounts' }
  }
})
```

***

### resume()

> `static` **resume**(`graph`): `RiviereBuilder`

Defined in: [builder.ts:129](https://github.com/ntcoding/living-architecture/blob/0187e5d7378806600c01437dfa0ddf19b749a24f/packages/riviere-builder/src/builder.ts#L129)

Restores a builder from a previously serialized graph.

Use this to continue building a graph that was saved mid-construction,
or to modify an existing graph.

#### Parameters

##### graph

`RiviereGraph`

A valid RiviereGraph object to resume from

#### Returns

`RiviereBuilder`

A new RiviereBuilder instance with the graph state restored

#### Throws

If the graph is missing required sources

#### Example

```typescript
const json = await fs.readFile('draft.json', 'utf-8')
const graph = JSON.parse(json)
const builder = RiviereBuilder.resume(graph)
builder.addApi({ ... })
```
