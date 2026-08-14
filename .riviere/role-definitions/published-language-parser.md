# published-language-parser

## Purpose

Parses input into the complete schema of a published language without throwing validation failures.

## Canonical Example

```typescript
/** @riviere-role published-language-parser */
export function parseRiviereGraph(value: unknown):
  | { success: true; graph: RiviereGraph }
  | { success: false; issues: ValidationIssue[] } {
  // parsing omitted
}
```

## Anti-Patterns

- The success branch must contain the published-language schema.
- A parser must return an explicit failure branch rather than throwing validation failures.
- An arbitrary conversion or formatting function is not a published-language parser.
