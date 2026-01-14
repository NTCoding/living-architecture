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
| `notUsed` | `boolean` | **Yes** |  |

---

### `detectionRule`

Rule for detecting components of this type

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `find` | `findTarget` | **Yes** |  |
| `where` | `predicate` | **Yes** |  |

---

### `findTarget`

The code construct to search for

**Values:**

- `"classes"`
- `"methods"`
- `"functions"`

---

## See Also

- [Predicate Reference](/reference/extraction-config/predicates)
- [TypeScript Getting Started](/extract/deterministic/typescript/getting-started)
