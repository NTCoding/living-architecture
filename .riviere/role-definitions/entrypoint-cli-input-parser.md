# entrypoint-cli-input-parser

## Purpose

Parses or validates raw CLI input using the meaning of a specific entrypoint.

## Behavioural Contract

1. Belongs to the entrypoint layer.
2. May coordinate multiple CLI options.
3. May produce entrypoint or application input types.
4. Does not own reusable domain validation rules.

## Canonical Example

```typescript
/** @riviere-role entrypoint-cli-input-parser */
export function parseLinkSourceLocation(options: LinkOptions): LinkSourceLocationResult {
  // entrypoint-specific parsing
}
```

## Common Misclassifications

- Primitive conversion without entrypoint meaning is a `generic-cli-input-parser`.
- Reusable domain validation belongs to the domain that owns the rule.

## Anti-Patterns

- Placing this role in an infrastructure layer.
- Labelling entrypoint-specific parsing as `generic-cli-input-parser`.
