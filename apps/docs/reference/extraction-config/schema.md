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
| `connections` | `connectionsConfig` | No | Connection detection configuration |

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
| `name` | `string` | **Yes** | Extraction config module identifier |
| `domain` | `string` | **Yes** | Riviere graph domain this module belongs to |
| `path` | `string` | **Yes** | Module root directory relative to config file |
| `modules` | `string` | No | Path pattern with {module} placeholder for resolving module names from file paths |
| `glob` | `string` | **Yes** | Glob pattern for source files within the module directory |
| `extends` | `string` | No | Package name or file path to inherit component rules from |
| `api` | `componentRule` | No | Detection rule for API components |
| `useCase` | `componentRule` | No | Detection rule for UseCase components |
| `domainOp` | `componentRule` | No | Detection rule for DomainOp components |
| `event` | `componentRule` | No | Detection rule for Event components |
| `eventHandler` | `componentRule` | No | Detection rule for EventHandler components |
| `ui` | `componentRule` | No | Detection rule for UI components |
| `customTypes` | `Record<string, detectionRule>` | No | User-defined component types with their detection rules |

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
| `notUsed` | `boolean` | **Yes** | (no description) |

---

### `detectionRule`

Rule for detecting components of this type

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `find` | `findTarget` | **Yes** | (no description) |
| `where` | `predicate` | **Yes** | (no description) |
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
- `fromClassDecoratorArgExtractionRule` — Extracts value from decorator argument on the containing class
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
| `fromMethodName` | `boolean` \| `object` | **Yes** | (no description) |

---

### `fromFilePathExtractionRule`

Extracts value from the file path using regex capture

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromFilePath` | `object` | **Yes** | (no description) |

---

### `fromPropertyExtractionRule`

Extracts value from a class property

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromProperty` | `object` | **Yes** | (no description) |

---

### `fromDecoratorArgExtractionRule`

Extracts value from decorator argument

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDecoratorArg` | `object` | **Yes** | (no description) |

---

### `fromClassDecoratorArgExtractionRule`

Extracts value from decorator argument on the containing class

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromClassDecoratorArg` | `any` \| `any` | **Yes** | (no description) |

---

### `fromDecoratorNameExtractionRule`

Extracts value from the decorator name itself

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDecoratorName` | `boolean` \| `object` | **Yes** | (no description) |

---

### `fromGenericArgExtractionRule`

Extracts value from generic type argument

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromGenericArg` | `object` | **Yes** | (no description) |

---

### `fromMethodSignatureExtractionRule`

Extracts method parameters and return type

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromMethodSignature` | `boolean` | **Yes** | (no description) |

---

### `fromConstructorParamsExtractionRule`

Extracts constructor parameter names and types

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromConstructorParams` | `boolean` | **Yes** | (no description) |

---

### `fromParameterTypeExtractionRule`

Extracts type name of parameter at position

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromParameterType` | `object` | **Yes** | (no description) |

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
| `stripSuffix` | `string` | No | (no description) |
| `stripPrefix` | `string` | No | (no description) |
| `toLowerCase` | `boolean` | No | (no description) |
| `toUpperCase` | `boolean` | No | (no description) |
| `kebabToPascal` | `boolean` | No | (no description) |
| `pascalToKebab` | `boolean` | No | (no description) |

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

Connection detection configuration

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventPublishers` | `eventPublisherConfig[]` | No | Declares which custom component types publish events and how to detect the connections |
| `httpLinks` | `httpLinkConfig[]` | No | Declares how to resolve HTTP client calls into cross-domain Links |

---

### `httpLinkConfig`

Declares how to resolve HTTP client calls into cross-domain Links

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromCustomType` | `string` | **Yes** | Custom component type name for HTTP clients — must be defined in customTypes in at least one module |
| `matchDomainBy` | `string` | **Yes** | Metadata key whose value identifies the target domain |
| `matchApiBy` | `string[]` | **Yes** | Metadata keys used to match the target API component |

---

### `eventPublisherConfig`

Declares a custom component type as an event publisher

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromType` | `string` | **Yes** | The custom component type name — must be defined in customTypes in at least one module |
| `metadataKey` | `string` | **Yes** | The metadata key on this component type that holds the published event type name |

---

## See Also

- [Predicate Reference](/reference/extraction-config/predicates)
- [TypeScript Getting Started](/extract/deterministic/typescript/getting-started)
