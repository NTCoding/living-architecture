---
pageClass: reference
---

# Class: GraphConstruction

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:36

## Constructors

### Constructor

> **new GraphConstruction**(`graph`): `GraphConstruction`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:39

#### Parameters

##### graph

`BuilderGraph`

#### Returns

`GraphConstruction`

## Methods

### addApi()

> **addApi**(`input`): `APIComponent`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:75

#### Parameters

##### input

[`APIInput`](../interfaces/APIInput.md)

#### Returns

`APIComponent`

***

### addCustom()

> **addCustom**(`input`): `CustomComponent`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:182

#### Parameters

##### input

[`CustomInput`](../interfaces/CustomInput.md)

#### Returns

`CustomComponent`

***

### addDomain()

> **addDomain**(`input`): `void`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:47

#### Parameters

##### input

[`DomainInput`](../interfaces/DomainInput.md)

#### Returns

`void`

***

### addDomainOp()

> **addDomainOp**(`input`): `DomainOpComponent`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:111

#### Parameters

##### input

[`DomainOpInput`](../interfaces/DomainOpInput.md)

#### Returns

`DomainOpComponent`

***

### addEvent()

> **addEvent**(`input`): `EventComponent`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:133

#### Parameters

##### input

[`EventInput`](../interfaces/EventInput.md)

#### Returns

`EventComponent`

***

### addEventHandler()

> **addEventHandler**(`input`): `EventHandlerComponent`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:151

#### Parameters

##### input

[`EventHandlerInput`](../interfaces/EventHandlerInput.md)

#### Returns

`EventHandlerComponent`

***

### addSource()

> **addSource**(`source`): `void`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:43

#### Parameters

##### source

`SourceInfo`

#### Returns

`void`

***

### addUI()

> **addUI**(`input`): `UIComponent`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:58

#### Parameters

##### input

[`UIInput`](../interfaces/UIInput.md)

#### Returns

`UIComponent`

***

### addUseCase()

> **addUseCase**(`input`): `UseCaseComponent`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:95

#### Parameters

##### input

[`UseCaseInput`](../interfaces/UseCaseInput.md)

#### Returns

`UseCaseComponent`

***

### defineCustomType()

> **defineCustomType**(`input`): `void`

Defined in: packages/riviere-builder/src/domain/construction/graph-construction.ts:168

#### Parameters

##### input

[`CustomTypeInput`](../interfaces/CustomTypeInput.md)

#### Returns

`void`
