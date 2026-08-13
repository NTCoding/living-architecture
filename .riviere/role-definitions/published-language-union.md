# published-language-union

## Purpose

A closed set of alternatives defined by a published language.

## Canonical Example

```typescript
/** @riviere-role published-language-union */
export type LinkType = 'sync' | 'async'
```

## Anti-Patterns

- A type alias that is not a union is not a published-language union.
- It must not contain application-specific alternatives.
