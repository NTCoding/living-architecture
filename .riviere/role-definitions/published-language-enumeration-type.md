# published-language-enumeration-type

## Purpose

The compile time type derived from a published language runtime enumeration.

## Canonical Example

```typescript
/** @riviere-role published-language-enumeration */
export const COMPONENT_TYPES = ['api', 'ui'] as const

/** @riviere-role published-language-enumeration-type */
export type ComponentType = (typeof COMPONENT_TYPES)[number]
```

## Anti-Patterns

- Do not duplicate the enumeration values in a separate union.
- Do not use this role for an explicit union declaration.
- The referenced enumeration must have `published-language-enumeration` role.
