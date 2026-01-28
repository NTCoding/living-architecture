---
pageClass: reference
---

# Class: DomainQueries

Defined in: packages/riviere-query/src/queries/domain-queries-delegate.ts:18

## Constructors

### Constructor

> **new DomainQueries**(`graph`): `DomainQueries`

Defined in: packages/riviere-query/src/queries/domain-queries-delegate.ts:19

#### Parameters

##### graph

`RiviereGraph`

#### Returns

`DomainQueries`

## Methods

### all()

> **all**(): [`Domain`](../interfaces/Domain.md)[]

Defined in: packages/riviere-query/src/queries/domain-queries-delegate.ts:21

#### Returns

[`Domain`](../interfaces/Domain.md)[]

***

### businessRulesFor()

> **businessRulesFor**(`entityName`): `string`[]

Defined in: packages/riviere-query/src/queries/domain-queries-delegate.ts:33

#### Parameters

##### entityName

`string`

#### Returns

`string`[]

***

### entities()

> **entities**(`domainName?`): [`Entity`](../interfaces/Entity.md)[]

Defined in: packages/riviere-query/src/queries/domain-queries-delegate.ts:29

#### Parameters

##### domainName?

`string`

#### Returns

[`Entity`](../interfaces/Entity.md)[]

***

### operationsFor()

> **operationsFor**(`entityName`): `DomainOpComponent`[]

Defined in: packages/riviere-query/src/queries/domain-queries-delegate.ts:25

#### Parameters

##### entityName

`string`

#### Returns

`DomainOpComponent`[]

***

### statesFor()

> **statesFor**(`entityName`): `string` & `$brand`\<`"State"`\>[]

Defined in: packages/riviere-query/src/queries/domain-queries-delegate.ts:41

#### Parameters

##### entityName

`string`

#### Returns

`string` & `$brand`\<`"State"`\>[]

***

### transitionsFor()

> **transitionsFor**(`entityName`): [`EntityTransition`](../interfaces/EntityTransition.md)[]

Defined in: packages/riviere-query/src/queries/domain-queries-delegate.ts:37

#### Parameters

##### entityName

`string`

#### Returns

[`EntityTransition`](../interfaces/EntityTransition.md)[]
