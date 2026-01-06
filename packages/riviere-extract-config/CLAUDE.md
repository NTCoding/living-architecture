# riviere-extract-config

JSON Schema definition and validation for extraction config DSL.

## Purpose

Defines the structure for extraction configs that specify how to detect architectural components in source code. The schema validates:
- Module-based organization with path patterns
- Six required component types per module (api, useCase, domainOp, event, eventHandler, ui)
- Detection rules with find targets and predicate logic
- Eight predicate types with and/or composition

## Config Semantics: User Intent vs Implementation

**CRITICAL:** The config DSL describes **what you want to extract**, not **how to find it**.

### The `find` Field Describes Your Goal

- `find: "methods"` means "I want methods as my architectural components"
- `find: "classes"` means "I want classes as my architectural components"

The `find` field is **user intent** — it tells the extractor what you consider to be a component.

### The `where` Field Describes The Filter

The `where` predicate describes which methods/classes qualify:
- `hasDecorator` — directly decorated
- `inClassWith` — methods in a class that matches a condition

### Example: Container Pattern

```json
{
  "api": {
    "find": "methods",
    "where": {
      "inClassWith": {
        "hasDecorator": { "name": "APIContainer" }
      }
    }
  }
}
```

This means: **"I want methods as my API components, specifically methods from classes decorated with @APIContainer"**

This does NOT mean "find classes then extract methods" — that's an implementation detail the extractor handles.

### Why This Matters

**Wrong interpretation:** "Decorators are on classes, so config should say `find: 'classes'`"
**Correct interpretation:** "User wants methods as components, so config says `find: 'methods'`"

The extractor will find the decorated classes (implementation detail), but the config describes what the user wants extracted (methods).

## Principles

1. **Schema is the source of truth** - TypeScript types mirror the schema; the schema defines what's valid
2. **Fail fast on invalid config** - All validation happens at config load time, not during extraction
3. **Clear error messages** - Validation errors include paths and descriptive messages
4. **All component types required** - Modules must declare all six types (use `notUsed: true` for unused ones)
5. **Config describes intent, not implementation** - `find` is what you want, not how the extractor finds it
