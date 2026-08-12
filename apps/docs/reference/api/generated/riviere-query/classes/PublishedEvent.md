---
pageClass: reference
---

# Class: PublishedEvent

Defined in: packages/riviere-query/src/features/querying/domain/published-event.ts:10

A published event with its subscribers.

## Riviere-role

value-object

## Properties

### domain

> `readonly` **domain**: `DomainName`

Defined in: packages/riviere-query/src/features/querying/domain/published-event.ts:14

***

### eventName

> `readonly` **eventName**: `EventName`

Defined in: packages/riviere-query/src/features/querying/domain/published-event.ts:13

***

### handlers

> `readonly` **handlers**: [`EventSubscriber`](EventSubscriber.md)[]

Defined in: packages/riviere-query/src/features/querying/domain/published-event.ts:15

***

### id

> `readonly` **id**: `EventId`

Defined in: packages/riviere-query/src/features/querying/domain/published-event.ts:12

## Methods

### parse()

> `static` **parse**(`input`): `PublishedEvent`

Defined in: packages/riviere-query/src/features/querying/domain/published-event.ts:29

#### Parameters

##### input

###### domain

`DomainName`

###### eventName

`EventName`

###### handlers

[`EventSubscriber`](EventSubscriber.md)[]

###### id

`EventId`

#### Returns

`PublishedEvent`
