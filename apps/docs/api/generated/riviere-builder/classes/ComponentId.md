# Class: ComponentId

Defined in: riviere-schema/dist/component-id.d.ts:26

Represents a structured component identifier.

Component IDs follow the format `{domain}:{module}:{type}:{name}` in kebab-case.

## Example

```typescript
const id = ComponentId.create({
  domain: 'orders',
  module: 'checkout',
  type: 'api',
  name: 'Create Order'
})
id.toString() // 'orders:checkout:api:create-order'
```

## Methods

### name()

> **name**(): `string`

Defined in: riviere-schema/dist/component-id.d.ts:72

Returns the name segment of the component ID.

#### Returns

`string`

The kebab-case name portion

***

### toString()

> **toString**(): `string`

Defined in: riviere-schema/dist/component-id.d.ts:66

Returns the full component ID string.

#### Returns

`string`

Full ID in format `domain:module:type:name`

***

### create()

> `static` **create**(`parts`): `ComponentId`

Defined in: riviere-schema/dist/component-id.d.ts:46

Creates a ComponentId from individual parts.

#### Parameters

##### parts

[`ComponentIdParts`](../interfaces/ComponentIdParts.md)

Domain, module, type, and name segments

#### Returns

`ComponentId`

A new ComponentId instance

#### Example

```typescript
const id = ComponentId.create({
  domain: 'orders',
  module: 'checkout',
  type: 'api',
  name: 'Create Order'
})
```

***

### parse()

> `static` **parse**(`id`): `ComponentId`

Defined in: riviere-schema/dist/component-id.d.ts:60

Parses a string ID into a ComponentId instance.

#### Parameters

##### id

`string`

String in format `domain:module:type:name`

#### Returns

`ComponentId`

A ComponentId instance

#### Throws

If the format is invalid

#### Example

```typescript
const id = ComponentId.parse('orders:checkout:api:create-order')
id.name() // 'create-order'
```
