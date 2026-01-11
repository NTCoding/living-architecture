---
pageClass: reference
---

# Extraction Config

> This file is auto-generated from JSON Schema definitions.
> Do not edit manually. Run `nx generate-docs riviere-extract-config` to regenerate.

Configuration for extracting architectural components from source code

**Format:** JSON or YAML

---

## Root Properties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | `string` | No | JSON Schema reference |
| `modules` | `module[]` | **Yes** | Module definitions for component extraction |

---

### `module`

A module defines extraction rules for a path pattern

**Properties:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Module name, used as the domain for extracted components |
| `path` | `string` | **Yes** | Glob pattern for files in this module |
| `api` | `componentRule` | **Yes** | Detection rule for API components |
| `useCase` | `componentRule` | **Yes** | Detection rule for UseCase components |
| `domainOp` | `componentRule` | **Yes** | Detection rule for DomainOp components |
| `event` | `componentRule` | **Yes** | Detection rule for Event components |
| `eventHandler` | `componentRule` | **Yes** | Detection rule for EventHandler components |
| `ui` | `componentRule` | **Yes** | Detection rule for UI components |

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
