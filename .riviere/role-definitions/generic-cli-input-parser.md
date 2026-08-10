# generic-cli-input-parser

## Purpose

Provides generic CLI parsing mechanics without entrypoint, use-case, or domain knowledge.

## Behavioural Contract

1. Belongs to the generic infrastructure layer.
2. Parses technical primitive CLI values.
3. Does not import entrypoint, use-case, or domain code.
4. Does not coordinate options belonging to a specific entrypoint.

## Canonical Example

```typescript
/** @riviere-role generic-cli-input-parser */
export function parseInteger(raw: string): number | undefined {
  // generic primitive conversion
}
```

## Common Misclassifications

- Parsing options for a particular command is an `entrypoint-cli-input-parser`.
- Reusable domain validation belongs to the domain that owns the rule.

## Anti-Patterns

- Importing entrypoint, use-case, or domain types.
- Encoding the accepted values of an application concept.
