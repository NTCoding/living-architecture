---
pageClass: reference
---

# Extraction Rules

Rules that extract metadata values from matched components. Defined in the `extract` block of a [detection rule](/reference/extraction-config/schema#detectionRule).

## Overview

| Rule | Description |
|------|-------------|
| `literal` | Hardcoded value applied to every matched component |
| `fromClassName` | Extracts the class name |
| `fromMethodName` | Extracts the method name |
| `fromFilePath` | Extracts a value from the file path using regex capture |
| `fromProperty` | Extracts a value from a class property |
| `fromDecoratorArg` | Extracts a value from a decorator argument |
| `fromDecoratorName` | Extracts the decorator name as the value |
| `fromGenericArg` | Extracts a type name from a generic type argument |
| `fromMethodSignature` | Extracts method parameters and return type |
| `fromConstructorParams` | Extracts constructor parameter names and types |
| `fromParameterType` | Extracts the type name of a method parameter |

---

## Required Fields by Component Type

| Component Type | Required Fields |
|---------------|-----------------|
| `api` | `apiType` |
| `event` | `eventName` |
| `eventHandler` | `subscribedEvents` |
| `domainOp` | `operationName` |
| `ui` | `route` |
| `useCase` | *(none)* |

Use `--allow-incomplete` to emit components with missing fields instead of failing.

---

### `literal`

Hardcoded value applied to every matched component

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `literal` | `string` \| `boolean` \| `number` | **Yes** | The value to assign |

---

### `fromClassName`

Extracts the class name, optionally with a [transform](#transforms)

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromClassName` | `true` \| `{ transform?: Transform }` | **Yes** | Use `true` for raw name, or object with transform |

---

### `fromMethodName`

Extracts the method name, optionally with a [transform](#transforms)

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromMethodName` | `true` \| `{ transform?: Transform }` | **Yes** | Use `true` for raw name, or object with transform |

---

### `fromFilePath`

Extracts a value from the file path using a regex capture group

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromFilePath.pattern` | `string` | **Yes** | Regex pattern with capture groups |
| `fromFilePath.capture` | `integer` | **Yes** | Capture group index (0 = full match) |
| `fromFilePath.transform` | `Transform` | No | Transform to apply |

---

### `fromProperty`

Extracts a value from a class property (static or instance)

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromProperty.name` | `string` | **Yes** | Property name |
| `fromProperty.kind` | `"static"` \| `"instance"` | **Yes** | Property kind |
| `fromProperty.transform` | `Transform` | No | Transform to apply |

---

### `fromDecoratorArg`

Extracts a value from a decorator argument by position or name

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDecoratorArg.position` | `integer` | No | Argument index (0-based) |
| `fromDecoratorArg.name` | `string` | No | Named argument key |
| `fromDecoratorArg.transform` | `Transform` | No | Transform to apply |

At least one of `position` or `name` is required.

---

### `fromDecoratorName`

Extracts the decorator name as the value, optionally with a mapping

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDecoratorName` | `true` \| `{ mapping?: Record<string, string>, transform?: Transform }` | **Yes** | Use `true` for raw name, or object with mapping/transform |

---

### `fromGenericArg`

Extracts the type name from a generic type argument on an interface or class

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromGenericArg.interface` | `string` | **Yes** | Interface/class name with the generic parameter |
| `fromGenericArg.position` | `integer` | **Yes** | Type argument index (0-based) |
| `fromGenericArg.transform` | `Transform` | No | Transform to apply |

---

### `fromMethodSignature`

Extracts the method's parameter names/types and return type as structured data

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromMethodSignature` | `true` | **Yes** | Enables signature extraction |

---

### `fromConstructorParams`

Extracts constructor parameter names and types as structured data

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromConstructorParams` | `true` | **Yes** | Enables constructor parameter extraction |

---

### `fromParameterType`

Extracts the type name of a method parameter at a given position

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromParameterType.position` | `integer` | **Yes** | Parameter index (0-based) |
| `fromParameterType.transform` | `Transform` | No | Transform to apply |

---

## Transforms

Transforms modify extracted string values.

::: tip Transform Order
When combining transforms, they execute in a fixed order regardless of YAML key order: `stripSuffix` → `stripPrefix` → `toLowerCase` → `toUpperCase` → `kebabToPascal` → `pascalToKebab`.
:::

| Transform | Description |
|-----------|-------------|
| `stripSuffix` | Remove trailing string |
| `stripPrefix` | Remove leading string |
| `toLowerCase` | Lowercase entire string |
| `toUpperCase` | Uppercase entire string |
| `kebabToPascal` | Convert kebab-case to PascalCase |
| `pascalToKebab` | Convert PascalCase to kebab-case |

---

## See Also

- [Config Schema](/reference/extraction-config/schema) — Full config structure
- [Predicates](/reference/extraction-config/predicates) — Detection rule filters
- [Examples](/reference/extraction-config/examples) — Real-world configs
- [Decorators](/reference/extraction-config/decorators) — Built-in component markers
