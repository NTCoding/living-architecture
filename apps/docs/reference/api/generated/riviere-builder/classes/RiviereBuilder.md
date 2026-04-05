---
pageClass: reference
---

# Class: RiviereBuilder

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:72](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L72)

Programmatically construct Riviere architecture graphs.

Thin facade preserving the flat public API while delegating
to focused domain classes internally.

## Riviere-role

aggregate

## Properties

### graphPath

> `readonly` **graphPath**: `string`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:75](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L75)

## Methods

### addApi()

> **addApi**(`input`): `APIComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:138](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L138)

Adds an API component to the graph.

#### Parameters

##### input

[`APIInput`](../interfaces/APIInput.md)

API component properties

#### Returns

`APIComponent`

The created API component

***

### addCustom()

> **addCustom**(`input`): `CustomComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:197](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L197)

Adds a Custom component to the graph.

#### Parameters

##### input

[`CustomInput`](../interfaces/CustomInput.md)

Custom component properties

#### Returns

`CustomComponent`

The created Custom component

***

### addDomain()

> **addDomain**(`input`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:118](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L118)

Adds a new domain to the graph.

#### Parameters

##### input

[`DomainInput`](../interfaces/DomainInput.md)

Domain name and description

#### Returns

`void`

***

### addDomainOp()

> **addDomainOp**(`input`): `DomainOpComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:158](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L158)

Adds a DomainOp component to the graph.

#### Parameters

##### input

[`DomainOpInput`](../interfaces/DomainOpInput.md)

DomainOp component properties

#### Returns

`DomainOpComponent`

The created DomainOp component

***

### addEvent()

> **addEvent**(`input`): `EventComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:168](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L168)

Adds an Event component to the graph.

#### Parameters

##### input

[`EventInput`](../interfaces/EventInput.md)

Event component properties

#### Returns

`EventComponent`

The created Event component

***

### addEventHandler()

> **addEventHandler**(`input`): `EventHandlerComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:178](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L178)

Adds an EventHandler component to the graph.

#### Parameters

##### input

[`EventHandlerInput`](../interfaces/EventHandlerInput.md)

EventHandler component properties

#### Returns

`EventHandlerComponent`

The created EventHandler component

***

### addSource()

> **addSource**(`source`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:109](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L109)

Adds an additional source repository to the graph.

#### Parameters

##### source

`SourceInfo`

Source repository information

#### Returns

`void`

***

### addUI()

> **addUI**(`input`): `UIComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:128](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L128)

Adds a UI component to the graph.

#### Parameters

##### input

[`UIInput`](../interfaces/UIInput.md)

UI component properties

#### Returns

`UIComponent`

The created UI component

***

### addUseCase()

> **addUseCase**(`input`): `UseCaseComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:148](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L148)

Adds a UseCase component to the graph.

#### Parameters

##### input

[`UseCaseInput`](../interfaces/UseCaseInput.md)

UseCase component properties

#### Returns

`UseCaseComponent`

The created UseCase component

***

### build()

> **build**(): `RiviereGraph`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:301](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L301)

Validates and returns the completed graph.

#### Returns

`RiviereGraph`

Valid RiviereGraph object

***

### defineCustomType()

> **defineCustomType**(`input`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:187](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L187)

Defines a custom component type for the graph.

#### Parameters

##### input

[`CustomTypeInput`](../interfaces/CustomTypeInput.md)

Custom type definition

#### Returns

`void`

***

### enrichComponent()

> **enrichComponent**(`id`, `enrichment`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:207](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L207)

Enriches a DomainOp component with additional domain details.

#### Parameters

##### id

`string`

The component ID to enrich

##### enrichment

[`EnrichmentInput`](../interfaces/EnrichmentInput.md)

State changes and business rules to add

#### Returns

`void`

***

### link()

> **link**(`input`): `Link`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:228](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L228)

Creates a link between two components in the graph.

#### Parameters

##### input

[`LinkInput`](../interfaces/LinkInput.md)

Link properties including source, target, and type

#### Returns

`Link`

The created link

***

### linkExternal()

> **linkExternal**(`input`): `ExternalLink`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:238](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L238)

Creates a link from a component to an external system.

#### Parameters

##### input

[`ExternalLinkInput`](../interfaces/ExternalLinkInput.md)

External link properties including target system info

#### Returns

`ExternalLink`

The created external link

***

### nearMatches()

> **nearMatches**(`query`, `options?`): [`NearMatchResult`](../interfaces/NearMatchResult.md)[]

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:218](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L218)

Finds components similar to a query for error recovery.

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

***

### orphans()

> **orphans**(): `string`[]

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:274](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L274)

Returns IDs of components with no incoming or outgoing links.

#### Returns

`string`[]

Array of orphaned component IDs

***

### query()

> **query**(): `RiviereQuery`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:283](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L283)

Returns a RiviereQuery instance for the current graph state.

#### Returns

`RiviereQuery`

RiviereQuery instance for the current graph

***

### serialize()

> **serialize**(): `string`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:292](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L292)

Serializes the current graph state as a JSON string.

#### Returns

`string`

JSON string representation of the graph

***

### stats()

> **stats**(): [`BuilderStats`](../interfaces/BuilderStats.md)

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:256](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L256)

Returns statistics about the current graph state.

#### Returns

[`BuilderStats`](../interfaces/BuilderStats.md)

Counts of components by type, domains, and links

***

### validate()

> **validate**(): `ValidationResult`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:265](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L265)

Runs full validation on the graph.

#### Returns

`ValidationResult`

Validation result with valid flag and error details

***

### warnings()

> **warnings**(): [`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:247](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L247)

Returns non-fatal issues found in the graph.

#### Returns

[`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Array of warning objects with type and message

***

### new()

> `static` **new**(`options`, `graphPath`): `RiviereBuilder`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:100](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L100)

Creates a new builder with initial configuration.

#### Parameters

##### options

[`BuilderOptions`](../interfaces/BuilderOptions.md)

Configuration including sources and domains

##### graphPath

`string` = `''`

File path where the graph will be persisted

#### Returns

`RiviereBuilder`

A new RiviereBuilder instance

***

### resume()

> `static` **resume**(`graph`, `graphPath`): `RiviereBuilder`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:89](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L89)

Restores a builder from a previously serialized graph.

#### Parameters

##### graph

`RiviereGraph`

A valid RiviereGraph to resume from

##### graphPath

`string` = `''`

File path where the graph is persisted

#### Returns

`RiviereBuilder`

A new RiviereBuilder with the graph state restored
