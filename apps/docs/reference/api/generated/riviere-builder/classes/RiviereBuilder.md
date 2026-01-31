---
pageClass: reference
---

# Class: RiviereBuilder

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:70](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L70)

Programmatically construct Riviere architecture graphs.

Thin facade preserving the flat public API while delegating
to focused domain classes internally.

## Methods

### addApi()

> **addApi**(`input`): `APIComponent`

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:131](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L131)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:190](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L190)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:111](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L111)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:151](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L151)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:161](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L161)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:171](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L171)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:102](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L102)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:121](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L121)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:141](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L141)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:294](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L294)

Validates and returns the completed graph.

#### Returns

`RiviereGraph`

Valid RiviereGraph object

***

### defineCustomType()

> **defineCustomType**(`input`): `void`

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:180](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L180)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:200](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L200)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:221](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L221)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:231](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L231)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:211](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L211)

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

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:267](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L267)

Returns IDs of components with no incoming or outgoing links.

#### Returns

`string`[]

Array of orphaned component IDs

***

### query()

> **query**(): `RiviereQuery`

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:276](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L276)

Returns a RiviereQuery instance for the current graph state.

#### Returns

`RiviereQuery`

RiviereQuery instance for the current graph

***

### serialize()

> **serialize**(): `string`

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:285](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L285)

Serializes the current graph state as a JSON string.

#### Returns

`string`

JSON string representation of the graph

***

### stats()

> **stats**(): [`BuilderStats`](../interfaces/BuilderStats.md)

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:249](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L249)

Returns statistics about the current graph state.

#### Returns

[`BuilderStats`](../interfaces/BuilderStats.md)

Counts of components by type, domains, and links

***

### validate()

> **validate**(): `ValidationResult`

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:258](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L258)

Runs full validation on the graph.

#### Returns

`ValidationResult`

Validation result with valid flag and error details

***

### warnings()

> **warnings**(): [`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:240](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L240)

Returns non-fatal issues found in the graph.

#### Returns

[`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Array of warning objects with type and message

***

### new()

> `static` **new**(`options`): `RiviereBuilder`

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:93](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L93)

Creates a new builder with initial configuration.

#### Parameters

##### options

[`BuilderOptions`](../interfaces/BuilderOptions.md)

Configuration including sources and domains

#### Returns

`RiviereBuilder`

A new RiviereBuilder instance

***

### resume()

> `static` **resume**(`graph`): `RiviereBuilder`

Defined in: [packages/riviere-builder/src/domain/builder-facade.ts:83](https://github.com/NTCoding/living-architecture/blob/main/packages/riviere-builder/src/domain/builder-facade.ts#L83)

Restores a builder from a previously serialized graph.

#### Parameters

##### graph

`RiviereGraph`

A valid RiviereGraph to resume from

#### Returns

`RiviereBuilder`

A new RiviereBuilder with the graph state restored
