---
pageClass: reference
---

# Class: GraphInspection

Defined in: packages/riviere-builder/src/domain/inspection/graph-inspection.ts:15

## Constructors

### Constructor

> **new GraphInspection**(`graph`): `GraphInspection`

Defined in: packages/riviere-builder/src/domain/inspection/graph-inspection.ts:18

#### Parameters

##### graph

`BuilderGraph`

#### Returns

`GraphInspection`

## Methods

### orphans()

> **orphans**(): `string`[]

Defined in: packages/riviere-builder/src/domain/inspection/graph-inspection.ts:30

#### Returns

`string`[]

***

### query()

> **query**(): `RiviereQuery`

Defined in: packages/riviere-builder/src/domain/inspection/graph-inspection.ts:38

#### Returns

`RiviereQuery`

***

### stats()

> **stats**(): [`BuilderStats`](../interfaces/BuilderStats.md)

Defined in: packages/riviere-builder/src/domain/inspection/graph-inspection.ts:26

#### Returns

[`BuilderStats`](../interfaces/BuilderStats.md)

***

### validate()

> **validate**(): `ValidationResult`

Defined in: packages/riviere-builder/src/domain/inspection/graph-inspection.ts:34

#### Returns

`ValidationResult`

***

### warnings()

> **warnings**(): [`BuilderWarning`](../interfaces/BuilderWarning.md)[]

Defined in: packages/riviere-builder/src/domain/inspection/graph-inspection.ts:22

#### Returns

[`BuilderWarning`](../interfaces/BuilderWarning.md)[]
