# riviere-extract-config

JSON Schema definition and validation for extraction config DSL.

## Purpose

Defines the structure for extraction configs that specify how to detect architectural components in source code. The schema validates:
- Module-based organization with path patterns
- Six required component types per module (api, useCase, domainOp, event, eventHandler, ui)
- Detection rules with find targets and predicate logic
- Eight predicate types with and/or composition

## Principles

1. **Schema is the source of truth** - TypeScript types mirror the schema; the schema defines what's valid
2. **Fail fast on invalid config** - All validation happens at config load time, not during extraction
3. **Clear error messages** - Validation errors include paths and descriptive messages
4. **All component types required** - Modules must declare all six types (use `notUsed: true` for unused ones)
