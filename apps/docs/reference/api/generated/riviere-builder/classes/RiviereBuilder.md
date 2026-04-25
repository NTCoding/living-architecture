---
pageClass: reference
---

# Class: RiviereBuilder

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:74](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L74)

Programmatically construct Riviere architecture graphs.

Thin facade preserving the flat public API while delegating
to focused domain classes internally.

## Riviere-role

aggregate

## Properties

### graphPath

> `readonly` **graphPath**: `string`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:77](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L77)

## Methods

### addApi()

> **addApi**(`input`): `APIComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:150](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L150)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:259](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L259)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:120](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L120)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:190](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L190)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:210](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L210)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:230](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L230)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:111](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L111)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:130](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L130)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:170](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L170)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:373](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L373)

Validates and returns the completed graph.

#### Returns

`RiviereGraph`

Valid RiviereGraph object

***

### defineCustomType()

> **defineCustomType**(`input`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:249](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L249)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:279](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L279)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:300](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L300)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:310](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L310)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:290](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L290)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:346](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L346)

Returns IDs of components with no incoming or outgoing links.

#### Returns

`string`[]

Array of orphaned component IDs

***

### query()

> **query**(): `RiviereQuery`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:355](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L355)

Returns a RiviereQuery instance for the current graph state.

#### Returns

`RiviereQuery`

RiviereQuery instance for the current graph

***

### serialize()

> **serialize**(): `string`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:364](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L364)

Serializes the current graph state as a JSON string.

#### Returns

`string`

JSON string representation of the graph

***

### stats()

> **stats**(): [`BuilderStats`](../interfaces/BuilderStats.md)

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:328](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L328)

Returns statistics about the current graph state.

#### Returns

[`BuilderStats`](../interfaces/BuilderStats.md)

Counts of components by type, domains, and links

***

### upsertApi()

> **upsertApi**(`input`, `options?`): `object`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:154](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L154)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:263](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L263)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:194](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L194)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:214](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L214)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:234](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L234)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:134](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L134)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:174](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L174)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:337](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L337)

Runs full validation on the graph.

#### Returns

`ValidationResult`

Validation result with valid flag and error details

***

### warnings()

> **warnings**(): [`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:319](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L319)

Returns non-fatal issues found in the graph.

#### Returns

[`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Array of warning objects with type and message

***

### new()

> `static` **new**(`options`, `graphPath`): `RiviereBuilder`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:102](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L102)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:91](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L91)

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
