---
pageClass: reference
---

# Class: EntityTransition

Defined in: packages/riviere-query/src/features/querying/domain/entity-transition.ts:8

A state transition in an entity's state machine.

## Riviere-role

value-object

## Properties

### from

> `readonly` **from**: [`State`](State.md)

Defined in: packages/riviere-query/src/features/querying/domain/entity-transition.ts:10

***

### to

> `readonly` **to**: [`State`](State.md)

Defined in: packages/riviere-query/src/features/querying/domain/entity-transition.ts:11

***

### triggeredBy

> `readonly` **triggeredBy**: `OperationName`

Defined in: packages/riviere-query/src/features/querying/domain/entity-transition.ts:12

## Methods

### parse()

> `static` **parse**(`input`): `EntityTransition`

Defined in: packages/riviere-query/src/features/querying/domain/entity-transition.ts:24

#### Parameters

##### input

###### from

[`State`](State.md)

###### to

[`State`](State.md)

###### triggeredBy

`OperationName`

#### Returns

`EntityTransition`
