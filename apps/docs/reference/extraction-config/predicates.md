---
pageClass: reference
---

# Predicate Reference

> This file is auto-generated from JSON Schema definitions.
> Do not edit manually. Run `nx generate-docs riviere-extract-config` to regenerate.

## Overview

| Predicate | Description |
|-----------|-------------|
| `hasDecorator` | Matches if the target has a specified decorator |
| `hasJSDoc` | Matches if the target has a specified JSDoc tag |
| `extendsClass` | Matches if the class extends a specified base class |
| `implementsInterface` | Matches if the class implements a specified interface |
| `nameEndsWith` | Matches if the target name ends with a specified suffix |
| `nameMatches` | Matches if the target name matches a regex pattern |
| `inClassWith` | Matches if the method is in a class matching the predicate |
| `and` | Matches if all predicates match |
| `or` | Matches if any predicate matches |

---

### `hasDecorator`

Matches if the target has a specified decorator

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` \| `string[]` | **Yes** | Decorator name(s) to match |
| `from` | `string` | No | Package the decorator is imported from |

---

### `hasJSDoc`

Matches if the target has a specified JSDoc tag

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tag` | `string` | **Yes** | JSDoc tag to match (without @) |

---

### `extendsClass`

Matches if the class extends a specified base class

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Base class name to match |

---

### `implementsInterface`

Matches if the class implements a specified interface

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Interface name to match |

---

### `nameEndsWith`

Matches if the target name ends with a specified suffix

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `suffix` | `string` | **Yes** | Suffix to match |

---

### `nameMatches`

Matches if the target name matches a regex pattern

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pattern` | `string` | **Yes** | Regex pattern to match against the name |

---

### `inClassWith`

Matches if the method is in a class matching the predicate

---

### `and`

Matches if all predicates match

---

### `or`

Matches if any predicate matches

---

## See Also

- [Config Schema Reference](/reference/extraction-config/schema)
- [TypeScript Getting Started](/extract/deterministic/typescript/getting-started)
