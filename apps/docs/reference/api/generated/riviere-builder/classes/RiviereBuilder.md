---
pageClass: reference
---

# Class: RiviereBuilder

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:71](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L71)

Programmatically construct Riviere architecture graphs.

Thin facade preserving the flat public API while delegating
to focused domain classes internally.

## Methods

### addApi()

> **addApi**(`input`): `APIComponent`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:134](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L134)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:193](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L193)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:114](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L114)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:154](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L154)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:164](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L164)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:174](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L174)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:105](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L105)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:124](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L124)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:144](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L144)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:297](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L297)

Validates and returns the completed graph.

#### Returns

`RiviereGraph`

Valid RiviereGraph object

***

### defineCustomType()

> **defineCustomType**(`input`): `void`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:183](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L183)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:203](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L203)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:224](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L224)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:234](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L234)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:214](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L214)

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

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:270](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L270)

Returns IDs of components with no incoming or outgoing links.

#### Returns

`string`[]

Array of orphaned component IDs

***

### query()

> **query**(): `RiviereQuery`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:279](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L279)

Returns a RiviereQuery instance for the current graph state.

#### Returns

`RiviereQuery`

RiviereQuery instance for the current graph

***

### serialize()

> **serialize**(): `string`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:288](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L288)

Serializes the current graph state as a JSON string.

#### Returns

`string`

JSON string representation of the graph

***

### stats()

> **stats**(): [`BuilderStats`](../interfaces/BuilderStats.md)

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:252](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L252)

Returns statistics about the current graph state.

#### Returns

[`BuilderStats`](../interfaces/BuilderStats.md)

Counts of components by type, domains, and links

***

### validate()

> **validate**(): `ValidationResult`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:261](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L261)

Runs full validation on the graph.

#### Returns

`ValidationResult`

Validation result with valid flag and error details

***

### warnings()

> **warnings**(): [`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:243](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L243)

Returns non-fatal issues found in the graph.

#### Returns

[`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Array of warning objects with type and message

***

### new()

> `static` **new**(`options`): `RiviereBuilder`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:96](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L96)

#### Parameters

##### options

[`BuilderOptions`](../interfaces/BuilderOptions.md)

#### Returns

`RiviereBuilder`

#### Riviere-role

aggregate

***

### resume()

> `static` **resume**(`graph`): `RiviereBuilder`

Defined in: [packages/riviere-builder/src/features/building/domain/builder-facade.ts:85](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/features/building/domain/builder-facade.ts#L85)

#### Parameters

##### graph

`RiviereGraph`

#### Returns

`RiviereBuilder`

#### Riviere-role

aggregate
