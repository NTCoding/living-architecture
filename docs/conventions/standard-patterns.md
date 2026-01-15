# Design patterns

## Zod for Branded Types

When creating branded types, use Zod.

Why: standard library, battle tested, clean API, codebase consistency, avoid building ad-hoc solution

## Discriminated Unions for Mixed Return Types

When a function needs to return different primitive types (e.g., `string | number | boolean`), wrap them in a discriminated union.

Why: The `sonarjs/function-return-type` rule (S3800) requires functions to return the same type at all return points. A simple union violates this because each `return` statement returns a different concrete type.

```typescript
// ❌ Violates sonarjs/function-return-type
function extractValue(): string | number | boolean {
  if (isString) return 'hello'  // returns string
  if (isNumber) return 42       // returns number
  return true                   // returns boolean
}

// ✅ Satisfies the rule - all return points return LiteralResult
type LiteralResult =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }

function extractValue(): LiteralResult {
  if (isString) return { kind: 'string', value: 'hello' }
  if (isNumber) return { kind: 'number', value: 42 }
  return { kind: 'boolean', value: true }
}
```

Benefits:
- Each return point returns the same structural type (`{ kind, value }`)
- Type-safe access via discriminator: `if (result.kind === 'string') result.value` is typed as `string`
- Explicit about what was extracted
