---
pageClass: reference
---

# Class: KnownSourceEvent

Defined in: packages/riviere-query/src/features/querying/domain/known-source-event.ts:8

A subscribed event where the source domain is known.

## Riviere-role

value-object

## Properties

### eventName

> `readonly` **eventName**: `EventName`

Defined in: packages/riviere-query/src/features/querying/domain/known-source-event.ts:10

***

### sourceDomain

> `readonly` **sourceDomain**: `DomainName`

Defined in: packages/riviere-query/src/features/querying/domain/known-source-event.ts:11

***

### sourceKnown

> `readonly` **sourceKnown**: `true`

Defined in: packages/riviere-query/src/features/querying/domain/known-source-event.ts:12

## Methods

### parse()

> `static` **parse**(`input`): `KnownSourceEvent`

Defined in: packages/riviere-query/src/features/querying/domain/known-source-event.ts:24

#### Parameters

##### input

###### eventName

`EventName`

###### sourceDomain

`DomainName`

###### sourceKnown

`true`

#### Returns

`KnownSourceEvent`
