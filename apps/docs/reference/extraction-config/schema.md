---
pageClass: reference
---

# Extraction Config

Configuration for extracting architectural components from source code

**Format:** JSON or YAML

---

## Root Properties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | `string` | No | JSON Schema reference |
| `modules` | `(module \| moduleRef)[]` | **Yes** | Module definitions for component extraction |
| `connections` | `connectionsConfig` | No | Global connection detection patterns inherited by all modules |

---

### `moduleRef`

Reference to an external module definition file

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$ref` | `string` | **Yes** | File path to a module definition (relative to this config file) |

---

### `module`

A module defines extraction rules for a path pattern

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Module name, used as the domain for extracted components |
| `path` | `string` | **Yes** | Glob pattern for files in this module |
| `extends` | `string` | No | Package name or file path to inherit component rules from |
| `api` | `componentRule` | No | Detection rule for API components |
| `useCase` | `componentRule` | No | Detection rule for UseCase components |
| `domainOp` | `componentRule` | No | Detection rule for DomainOp components |
| `event` | `componentRule` | No | Detection rule for Event components |
| `eventHandler` | `componentRule` | No | Detection rule for EventHandler components |
| `eventPublisher` | `componentRule` | No | Detection rule for EventPublisher components |
| `ui` | `componentRule` | No | Detection rule for UI components |
| `customTypes` | `Record<string, detectionRule>` | No | User-defined component types with their detection rules |
| `connections` | `connectionsConfig` | No | Module-level connection detection patterns additive to global |

---

### `componentRule`

**One of:**

- `notUsed` — Marks this component type as not used in the module
- `detectionRule` — Rule for detecting components of this type

---

### `notUsed`

Marks this component type as not used in the module

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notUsed` | `boolean` | **Yes** |  |

---

### `detectionRule`

Rule for detecting components of this type

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `find` | `findTarget` | **Yes** |  |
| `where` | `predicate` | **Yes** |  |
| `extract` | `extractBlock` | No | Extraction rules for metadata fields |

---

### `extractBlock`

Extraction rules mapping field names to extraction rules

---

### `extractionRule`

**One of:**

- `literalExtractionRule` — Extracts a hardcoded literal value
- `fromClassNameExtractionRule` — Extracts value from the class name
- `fromMethodNameExtractionRule` — Extracts value from the method name
- `fromFilePathExtractionRule` — Extracts value from the file path using regex capture
- `fromPropertyExtractionRule` — Extracts value from a class property
- `fromDecoratorArgExtractionRule` — Extracts value from decorator argument
- `fromDecoratorNameExtractionRule` — Extracts value from the decorator name itself
- `fromGenericArgExtractionRule` — Extracts value from generic type argument
- `fromMethodSignatureExtractionRule` — Extracts method parameters and return type
- `fromConstructorParamsExtractionRule` — Extracts constructor parameter names and types
- `fromParameterTypeExtractionRule` — Extracts type name of parameter at position

---

### `fromMethodNameExtractionRule`

Extracts value from the method name

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromMethodName` | `boolean` \| `object` | **Yes** |  |

---

### `fromFilePathExtractionRule`

Extracts value from the file path using regex capture

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromFilePath` | `object` | **Yes** |  |

---

### `fromPropertyExtractionRule`

Extracts value from a class property

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromProperty` | `object` | **Yes** |  |

---

### `fromDecoratorArgExtractionRule`

Extracts value from decorator argument

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDecoratorArg` | `object` | **Yes** |  |

---

### `fromDecoratorNameExtractionRule`

Extracts value from the decorator name itself

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDecoratorName` | `boolean` \| `object` | **Yes** |  |

---

### `fromGenericArgExtractionRule`

Extracts value from generic type argument

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromGenericArg` | `object` | **Yes** |  |

---

### `fromMethodSignatureExtractionRule`

Extracts method parameters and return type

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromMethodSignature` | `boolean` | **Yes** |  |

---

### `fromConstructorParamsExtractionRule`

Extracts constructor parameter names and types

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromConstructorParams` | `boolean` | **Yes** |  |

---

### `fromParameterTypeExtractionRule`

Extracts type name of parameter at position

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromParameterType` | `object` | **Yes** |  |

---

### `fromClassNameExtractionRule`

Extracts value from the class name

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromClassName` | `boolean` \| `object` | **Yes** | Extract from class name, optionally with transform |

---

### `transform`

Transform operations to apply to extracted value

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stripSuffix` | `string` | No |  |
| `stripPrefix` | `string` | No |  |
| `toLowerCase` | `boolean` | No |  |
| `toUpperCase` | `boolean` | No |  |
| `kebabToPascal` | `boolean` | No |  |
| `pascalToKebab` | `boolean` | No |  |

---

### `literalExtractionRule`

Extracts a hardcoded literal value

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `literal` | `string` \| `boolean` \| `number` | **Yes** | Literal value to use for this field |

---

### `findTarget`

The code construct to search for

**Values:**

- `"classes"`
- `"methods"`
- `"functions"`

---

### `connectionsConfig`

Connection detection configuration with pattern definitions

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patterns` | `connectionPattern[]` | **Yes** | Connection detection patterns |

---

### `connectionPattern`

A pattern for detecting connections between components

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Pattern identifier |
| `find` | `connectionFinder` | **Yes** |  |
| `where` | `connectionWhereClause` | **Yes** |  |
| `extract` | `connectionExtractBlock` | No | Extraction rules for connection metadata |
| `linkType` | `"sync"` \| `"async"` | **Yes** | Type of connection: sync or async |

---

### `connectionFinder`

The connection detection strategy

**Values:**

- `"methodCalls"`

---

### `connectionWhereClause`

Filters for matching method calls

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `methodName` | `string` | No | Method name to match |
| `receiverType` | `string` | No | Type of the object being called |
| `callerHasDecorator` | `string[]` | No | Decorators the calling class must have |
| `calleeType` | `object` | No | Constraints on the callee type |

**`calleeType` properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hasDecorator` | `string` | **Yes** | Decorator name the callee type must have |

---

### `connectionExtractBlock`

Extraction rules for connection metadata fields

---

### `connectionExtractRule`

**One of:**

- `fromArgumentExtractionRule` — Extracts static type of argument at position
- `fromReceiverTypeExtractionRule` — Extracts the static type name of the receiver
- `fromCallerTypeExtractionRule` — Extracts the static type name of the caller

---

### `fromArgumentExtractionRule`

Extracts static type of argument at position

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromArgument` | `integer` | **Yes** | Argument position (zero-based) |

---

### `fromReceiverTypeExtractionRule`

Extracts the static type name of the receiver

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromReceiverType` | `boolean` | **Yes** |  |

---

### `fromCallerTypeExtractionRule`

Extracts the static type name of the caller

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromCallerType` | `boolean` | **Yes** |  |

---

## See Also

- [Predicate Reference](/reference/extraction-config/predicates)
- [TypeScript Getting Started](/extract/deterministic/typescript/getting-started)
