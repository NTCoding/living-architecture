# published-language-data-structure

## Purpose

A method-free data structure used inside a published language schema.

## Canonical Example

```typescript
/** @riviere-role published-language-data-structure */
export interface Link {
  source: string
  target: string
}
```

## Anti-Patterns

- It cannot contain methods or function-valued fields.
- It is not the complete published schema.
- It is not an application or domain service.
