---
pageClass: reference
---

# Class: RiviereBuilder

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:76](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L76)

Programmatically construct Riviere architecture graphs.

Thin facade preserving the flat public API while delegating
to focused domain classes internally.

## Riviere-role

aggregate

## Properties

### graphPath

> `readonly` **graphPath**: `string`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:79](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L79)

## Methods

### addApi()

> **addApi**(`input`): `APIComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:152](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L152)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:270](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L270)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:122](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L122)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:192](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L192)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:212](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L212)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:232](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L232)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:113](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L113)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:132](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L132)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:172](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L172)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:384](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L384)

Validates and returns the completed graph.

#### Returns

`RiviereGraph`

Valid RiviereGraph object

***

### defineCustomType()

> **defineCustomType**(`input`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:251](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L251)

Defines a custom component type for the graph.

#### Parameters

##### input

[`CustomTypeInput`](../interfaces/CustomTypeInput.md)

Custom type definition

#### Returns

`void`

***

### defineRelationshipType()

> **defineRelationshipType**(`input`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:260](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L260)

Defines a relationship type for the graph.

#### Parameters

##### input

[`RelationshipTypeInput`](../interfaces/RelationshipTypeInput.md)

Relationship type name and description

#### Returns

`void`

***

### enrichComponent()

> **enrichComponent**(`id`, `enrichment`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:290](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L290)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:311](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L311)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:321](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L321)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:301](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L301)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:357](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L357)

Returns IDs of components with no incoming or outgoing links.

#### Returns

`string`[]

Array of orphaned component IDs

***

### query()

> **query**(): `RiviereQuery`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:366](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L366)

Returns a RiviereQuery instance for the current graph state.

#### Returns

`RiviereQuery`

RiviereQuery instance for the current graph

***

### serialize()

> **serialize**(): `string`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:375](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L375)

Serializes the current graph state as a JSON string.

#### Returns

`string`

JSON string representation of the graph

***

### stats()

> **stats**(): [`BuilderStats`](../interfaces/BuilderStats.md)

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:339](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L339)

Returns statistics about the current graph state.

#### Returns

[`BuilderStats`](../interfaces/BuilderStats.md)

Counts of components by type, domains, and links

***

### upsertApi()

> **upsertApi**(`input`, `options?`): `object`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:156](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L156)

#### Parameters

##### input

[`APIInput`](../interfaces/APIInput.md)

##### options?

[`UpsertOptions`](../interfaces/UpsertOptions.md)

#### Returns

`object`

##### component

> **component**: `APIComponent`

##### created

> **created**: `boolean`

***

### upsertCustom()

> **upsertCustom**(`input`, `options?`): `object`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:274](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L274)

#### Parameters

##### input

[`CustomInput`](../interfaces/CustomInput.md)

##### options?

[`UpsertOptions`](../interfaces/UpsertOptions.md)

#### Returns

`object`

##### component

> **component**: `CustomComponent`

##### created

> **created**: `boolean`

***

### upsertDomainOp()

> **upsertDomainOp**(`input`, `options?`): `object`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:196](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L196)

#### Parameters

##### input

[`DomainOpInput`](../interfaces/DomainOpInput.md)

##### options?

[`UpsertOptions`](../interfaces/UpsertOptions.md)

#### Returns

`object`

##### component

> **component**: `DomainOpComponent`

##### created

> **created**: `boolean`

***

### upsertEvent()

> **upsertEvent**(`input`, `options?`): `object`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:216](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L216)

#### Parameters

##### input

[`EventInput`](../interfaces/EventInput.md)

##### options?

[`UpsertOptions`](../interfaces/UpsertOptions.md)

#### Returns

`object`

##### component

> **component**: `EventComponent`

##### created

> **created**: `boolean`

***

### upsertEventHandler()

> **upsertEventHandler**(`input`, `options?`): `object`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:236](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L236)

#### Parameters

##### input

[`EventHandlerInput`](../interfaces/EventHandlerInput.md)

##### options?

[`UpsertOptions`](../interfaces/UpsertOptions.md)

#### Returns

`object`

##### component

> **component**: `EventHandlerComponent`

##### created

> **created**: `boolean`

***

### upsertUI()

> **upsertUI**(`input`, `options?`): `object`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:136](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L136)

#### Parameters

##### input

[`UIInput`](../interfaces/UIInput.md)

##### options?

[`UpsertOptions`](../interfaces/UpsertOptions.md)

#### Returns

`object`

##### component

> **component**: `UIComponent`

##### created

> **created**: `boolean`

***

### upsertUseCase()

> **upsertUseCase**(`input`, `options?`): `object`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:176](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L176)

#### Parameters

##### input

[`UseCaseInput`](../interfaces/UseCaseInput.md)

##### options?

[`UpsertOptions`](../interfaces/UpsertOptions.md)

#### Returns

`object`

##### component

> **component**: `UseCaseComponent`

##### created

> **created**: `boolean`

***

### validate()

> **validate**(): `ValidationResult`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:348](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L348)

Runs full validation on the graph.

#### Returns

`ValidationResult`

Validation result with valid flag and error details

***

### warnings()

> **warnings**(): [`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:330](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L330)

Returns non-fatal issues found in the graph.

#### Returns

[`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Array of warning objects with type and message

***

### new()

> `static` **new**(`options`, `graphPath`): `RiviereBuilder`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:104](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L104)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:93](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L93)

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
