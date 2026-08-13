---
pageClass: reference
---

# Class: RiviereBuilder

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:143

Programmatically construct Riviere architecture graphs.

Thin facade preserving the flat public API while delegating
to focused domain classes internally.

## Riviere-role

aggregate

## Properties

### graphPath

> `readonly` **graphPath**: `string`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:146

## Methods

### addApi()

> **addApi**(`input`): `APIComponent`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:219

Adds an API component to the graph.

#### Parameters

##### input

`APIInput`

API component properties

#### Returns

`APIComponent`

The created API component

***

### addCustom()

> **addCustom**(`input`): `CustomComponent`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:337

Adds a Custom component to the graph.

#### Parameters

##### input

`CustomInput`

Custom component properties

#### Returns

`CustomComponent`

The created Custom component

***

### addDomain()

> **addDomain**(`input`): `void`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:189

Adds a new domain to the graph.

#### Parameters

##### input

`DomainInput`

Domain name and description

#### Returns

`void`

***

### addDomainOp()

> **addDomainOp**(`input`): `DomainOpComponent`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:259

Adds a DomainOp component to the graph.

#### Parameters

##### input

`DomainOpInput`

DomainOp component properties

#### Returns

`DomainOpComponent`

The created DomainOp component

***

### addEvent()

> **addEvent**(`input`): `EventComponent`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:279

Adds an Event component to the graph.

#### Parameters

##### input

`EventInput`

Event component properties

#### Returns

`EventComponent`

The created Event component

***

### addEventHandler()

> **addEventHandler**(`input`): `EventHandlerComponent`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:299

Adds an EventHandler component to the graph.

#### Parameters

##### input

`EventHandlerInput`

EventHandler component properties

#### Returns

`EventHandlerComponent`

The created EventHandler component

***

### addSource()

> **addSource**(`source`): `void`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:180

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

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:199

Adds a UI component to the graph.

#### Parameters

##### input

`UIInput`

UI component properties

#### Returns

`UIComponent`

The created UI component

***

### addUseCase()

> **addUseCase**(`input`): `UseCaseComponent`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:239

Adds a UseCase component to the graph.

#### Parameters

##### input

`UseCaseInput`

UseCase component properties

#### Returns

`UseCaseComponent`

The created UseCase component

***

### build()

> **build**(): `RiviereGraph`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:461

Validates and returns the completed graph.

#### Returns

`RiviereGraph`

Valid RiviereGraph object

***

### defineCustomType()

> **defineCustomType**(`input`): `void`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:318

Defines a custom component type for the graph.

#### Parameters

##### input

`CustomTypeInput`

Custom type definition

#### Returns

`void`

***

### defineRelationshipType()

> **defineRelationshipType**(`input`): `void`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:327

Defines a relationship type for the graph.

#### Parameters

##### input

`RelationshipTypeInput`

Relationship type name and description

#### Returns

`void`

***

### enrichComponent()

> **enrichComponent**(`id`, `enrichment`): `void`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:357

Enriches a DomainOp component with additional domain details.

#### Parameters

##### id

`string`

The component ID to enrich

##### enrichment

`EnrichmentInput`

State changes and business rules to add

#### Returns

`void`

***

### link()

> **link**(`input`): `Link`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:388

Creates a link between two components in the graph.

#### Parameters

##### input

`LinkInput`

Link properties including source, target, and type

#### Returns

`Link`

The created link

***

### linkExternal()

> **linkExternal**(`input`): `ExternalLink`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:398

Creates a link from a component to an external system.

#### Parameters

##### input

`ExternalLinkInput`

External link properties including target system info

#### Returns

`ExternalLink`

The created external link

***

### nearMatches()

> **nearMatches**(`query`, `options?`): `Readonly`\<\{ `component`: `Component`; `mismatch?`: `Readonly`\<\{ `actual`: `string`; `expected`: `string`; `field`: `"type"` \| `"domain"`; \}\>; `score`: `number`; \}\>[]

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:368

Finds components similar to a query for error recovery.

#### Parameters

##### query

`Readonly`\<\{ `domain?`: `string`; `name`: `string`; `type?`: `ComponentType`; \}\>

Search criteria including partial ID, name, type, or domain

##### options?

`Readonly`\<\{ `limit?`: `number`; `threshold?`: `number`; \}\>

Optional matching thresholds and limits

#### Returns

`Readonly`\<\{ `component`: `Component`; `mismatch?`: `Readonly`\<\{ `actual`: `string`; `expected`: `string`; `field`: `"type"` \| `"domain"`; \}\>; `score`: `number`; \}\>[]

Array of similar components with similarity scores

***

### orphans()

> **orphans**(): `string`[]

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:434

Returns IDs of components with no incoming or outgoing links.

#### Returns

`string`[]

Array of orphaned component IDs

***

### query()

> **query**(): [`RiviereQuery`](RiviereQuery.md)

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:443

Returns query capabilities for the current graph state.

#### Returns

[`RiviereQuery`](RiviereQuery.md)

A snapshot that can be queried without mutating the builder

***

### serialize()

> **serialize**(): `string`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:452

Serializes the current graph state as a JSON string.

#### Returns

`string`

JSON string representation of the graph

***

### stats()

> **stats**(): `object`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:416

Returns statistics about the current graph state.

#### Returns

`object`

Counts of components by type, domains, and links

##### componentCount

> **componentCount**: `number` = `components.length`

##### componentsByType

> **componentsByType**: `object`

###### componentsByType.API

> **API**: `number`

###### componentsByType.Custom

> **Custom**: `number`

###### componentsByType.DomainOp

> **DomainOp**: `number`

###### componentsByType.Event

> **Event**: `number`

###### componentsByType.EventHandler

> **EventHandler**: `number`

###### componentsByType.UI

> **UI**: `number`

###### componentsByType.UseCase

> **UseCase**: `number`

##### domainCount

> **domainCount**: `number`

##### externalLinkCount

> **externalLinkCount**: `number` = `graph.externalLinks.length`

##### linkCount

> **linkCount**: `number` = `graph.links.length`

***

### upsertApi()

> **upsertApi**(`input`, `options?`): `object`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:223

#### Parameters

##### input

`APIInput`

##### options?

`Readonly`\<\{ `noOverwrite?`: `boolean`; \}\>

#### Returns

`object`

##### component

> **component**: `APIComponent`

##### created

> **created**: `boolean`

***

### upsertCustom()

> **upsertCustom**(`input`, `options?`): `object`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:341

#### Parameters

##### input

`CustomInput`

##### options?

`Readonly`\<\{ `noOverwrite?`: `boolean`; \}\>

#### Returns

`object`

##### component

> **component**: `CustomComponent`

##### created

> **created**: `boolean`

***

### upsertDomainOp()

> **upsertDomainOp**(`input`, `options?`): `object`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:263

#### Parameters

##### input

`DomainOpInput`

##### options?

`Readonly`\<\{ `noOverwrite?`: `boolean`; \}\>

#### Returns

`object`

##### component

> **component**: `DomainOpComponent`

##### created

> **created**: `boolean`

***

### upsertEvent()

> **upsertEvent**(`input`, `options?`): `object`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:283

#### Parameters

##### input

`EventInput`

##### options?

`Readonly`\<\{ `noOverwrite?`: `boolean`; \}\>

#### Returns

`object`

##### component

> **component**: `EventComponent`

##### created

> **created**: `boolean`

***

### upsertEventHandler()

> **upsertEventHandler**(`input`, `options?`): `object`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:303

#### Parameters

##### input

`EventHandlerInput`

##### options?

`Readonly`\<\{ `noOverwrite?`: `boolean`; \}\>

#### Returns

`object`

##### component

> **component**: `EventHandlerComponent`

##### created

> **created**: `boolean`

***

### upsertUI()

> **upsertUI**(`input`, `options?`): `object`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:203

#### Parameters

##### input

`UIInput`

##### options?

`Readonly`\<\{ `noOverwrite?`: `boolean`; \}\>

#### Returns

`object`

##### component

> **component**: `UIComponent`

##### created

> **created**: `boolean`

***

### upsertUseCase()

> **upsertUseCase**(`input`, `options?`): `object`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:243

#### Parameters

##### input

`UseCaseInput`

##### options?

`Readonly`\<\{ `noOverwrite?`: `boolean`; \}\>

#### Returns

`object`

##### component

> **component**: `UseCaseComponent`

##### created

> **created**: `boolean`

***

### validate()

> **validate**(): `ValidationResult`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:425

Runs full validation on the graph.

#### Returns

`ValidationResult`

Validation result with valid flag and error details

***

### warnings()

> **warnings**(): (`InspectionWarning` \| `OperationWarning`)[]

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:407

Returns non-fatal issues found in the graph.

#### Returns

(`InspectionWarning` \| `OperationWarning`)[]

Array of warning objects with type and message

***

### new()

> `static` **new**(`options`, `graphPath`): `RiviereBuilder`

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:171

Creates a new builder with initial configuration.

#### Parameters

##### options

`BuilderOptions`

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

Defined in: packages/riviere-builder/src/domain/builder-facade.ts:160

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
