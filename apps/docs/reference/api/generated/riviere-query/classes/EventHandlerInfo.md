---
pageClass: reference
---

# Class: EventHandlerInfo

Defined in: packages/riviere-query/src/features/querying/domain/event-handler-info.ts:14

Information about an event handler component.

## Riviere-role

value-object

## Properties

### domain

> `readonly` **domain**: `DomainName`

Defined in: packages/riviere-query/src/features/querying/domain/event-handler-info.ts:18

***

### handlerName

> `readonly` **handlerName**: `HandlerName`

Defined in: packages/riviere-query/src/features/querying/domain/event-handler-info.ts:17

***

### id

> `readonly` **id**: `HandlerId`

Defined in: packages/riviere-query/src/features/querying/domain/event-handler-info.ts:16

***

### subscribedEvents

> `readonly` **subscribedEvents**: `EventName`[]

Defined in: packages/riviere-query/src/features/querying/domain/event-handler-info.ts:19

***

### subscribedEventsWithDomain

> `readonly` **subscribedEventsWithDomain**: `SubscribedEventWithDomain`[]

Defined in: packages/riviere-query/src/features/querying/domain/event-handler-info.ts:20

## Methods

### parse()

> `static` **parse**(`input`): `EventHandlerInfo`

Defined in: packages/riviere-query/src/features/querying/domain/event-handler-info.ts:36

#### Parameters

##### input

###### domain

`DomainName`

###### handlerName

`HandlerName`

###### id

`HandlerId`

###### subscribedEvents

`EventName`[]

###### subscribedEventsWithDomain

`SubscribedEventWithDomain`[]

#### Returns

`EventHandlerInfo`
