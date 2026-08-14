# published-language-field-name

## Purpose

The exact name of a field defined by a published language, exported so producers and consumers use the same spelling.

## Canonical Example

```typescript
/** @riviere-role published-language-field-name */
export const EVENT_NAME_FIELD = 'eventName' as const
```

## Anti-Patterns

- A mutable variable is not a published field name.
- A computed value is not a published field name.
- An application setting or implementation constant is not part of a published language.
