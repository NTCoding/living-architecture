# published-language-schema

## Purpose

The complete data structure exchanged through a published language.

## Canonical Example

```typescript
/** @riviere-role published-language-schema */
export interface RiviereGraph {
  version: string
  components: Component[]
  links: Link[]
}
```

## Anti-Patterns

- It cannot contain methods or function-valued fields.
- A structure nested inside the complete schema is a `published-language-data-structure`.
- It is not an application or domain model.
