# generic-cli-input-parser

## Purpose

Provides generic CLI parsing mechanics without entrypoint, use-case, or domain knowledge.

## Behavioural Contract

1. Belongs to the generic infrastructure layer.
2. Parses technical primitive CLI values.
3. Does not import entrypoint, use-case, or domain code.
4. Does not coordinate options belonging to a specific entrypoint.

## Canonical Example

There is currently no exported `generic-cli-input-parser` implementation in this repository. Do not create one merely to move code out of an entrypoint or to satisfy a file-size limit. The following is the permitted primitive-only API shape, not evidence that the abstraction is needed:

```typescript
/** @riviere-role generic-cli-input-parser */
export function parseInteger(raw: string): number | undefined {
  // generic primitive conversion
}
```

## Common Misclassifications

- Parsing options for a particular command is an `entrypoint-cli-input-parser`.
- Reusable domain validation belongs to the domain that owns the rule.
- A parser shared by several entrypoints is still an `entrypoint-cli-input-parser` when it coordinates their options or uses application meaning. Put it in the narrowest common `entrypoint/_platform/cli/input-parsers/` or `option-validators/` scope; reuse alone never makes it generic infra.

## Anti-Patterns

- Importing entrypoint, use-case, or domain types.
- Encoding the accepted values of an application concept.
