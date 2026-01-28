---
pageClass: reference
---

# Class: FlowQueries

Defined in: packages/riviere-query/src/queries/flow-queries-delegate.ts:18

## Constructors

### Constructor

> **new FlowQueries**(`graph`): `FlowQueries`

Defined in: packages/riviere-query/src/queries/flow-queries-delegate.ts:19

#### Parameters

##### graph

`RiviereGraph`

#### Returns

`FlowQueries`

## Methods

### all()

> **all**(): [`Flow`](../interfaces/Flow.md)[]

Defined in: packages/riviere-query/src/queries/flow-queries-delegate.ts:32

#### Returns

[`Flow`](../interfaces/Flow.md)[]

***

### entryPoints()

> **entryPoints**(): `Component`[]

Defined in: packages/riviere-query/src/queries/flow-queries-delegate.ts:21

#### Returns

`Component`[]

***

### searchWithFlow()

> **searchWithFlow**(`query`, `options`): [`SearchWithFlowResult`](../interfaces/SearchWithFlowResult.md)

Defined in: packages/riviere-query/src/queries/flow-queries-delegate.ts:36

#### Parameters

##### query

`string`

##### options

[`SearchWithFlowOptions`](../interfaces/SearchWithFlowOptions.md)

#### Returns

[`SearchWithFlowResult`](../interfaces/SearchWithFlowResult.md)

***

### trace()

> **trace**(`startComponentId`): `object`

Defined in: packages/riviere-query/src/queries/flow-queries-delegate.ts:25

#### Parameters

##### startComponentId

`string` & `$brand`\<`"ComponentId"`\>

#### Returns

`object`

##### componentIds

> **componentIds**: `string` & `$brand`\<`"ComponentId"`\>[]

##### linkIds

> **linkIds**: `string` & `$brand`\<`"LinkId"`\>[]
