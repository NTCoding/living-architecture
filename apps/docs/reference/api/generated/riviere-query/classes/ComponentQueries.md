---
pageClass: reference
---

# Class: ComponentQueries

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:16

## Constructors

### Constructor

> **new ComponentQueries**(`graph`): `ComponentQueries`

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:17

#### Parameters

##### graph

`RiviereGraph`

#### Returns

`ComponentQueries`

## Methods

### all()

> **all**(): `Component`[]

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:19

#### Returns

`Component`[]

***

### byId()

> **byId**(`id`): `Component` \| `undefined`

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:35

#### Parameters

##### id

`string` & `$brand`\<`"ComponentId"`\>

#### Returns

`Component` \| `undefined`

***

### byType()

> **byType**(`type`): `Component`[]

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:47

#### Parameters

##### type

`ComponentType`

#### Returns

`Component`[]

***

### find()

> **find**(`predicate`): `Component` \| `undefined`

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:27

#### Parameters

##### predicate

(`component`) => `boolean`

#### Returns

`Component` \| `undefined`

***

### findAll()

> **findAll**(`predicate`): `Component`[]

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:31

#### Parameters

##### predicate

(`component`) => `boolean`

#### Returns

`Component`[]

***

### inDomain()

> **inDomain**(`domainName`): `Component`[]

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:43

#### Parameters

##### domainName

`string`

#### Returns

`Component`[]

***

### links()

> **links**(): `Link`[]

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:23

#### Returns

`Link`[]

***

### search()

> **search**(`query`): `Component`[]

Defined in: packages/riviere-query/src/queries/component-queries-delegate.ts:39

#### Parameters

##### query

`string`

#### Returns

`Component`[]
