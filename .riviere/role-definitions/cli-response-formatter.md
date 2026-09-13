# cli-response-formatter

## Purpose

A function that creates a reusable CLI response envelope after entrypoint-specific presentation has been decided.

## Behavioural Contract

1. Accept already-decided response content such as data, warnings, an error code, or a message.
2. Return `cli-output` in the application's chosen response shape.
3. Know nothing about one specific command or query result shape.
4. Perform no output side effects.
5. Leave stdout, stderr, file output, and process exit to `cli-response-writer`.
6. Handle no thrown errors.

## Example

The response shape below is an application choice, not a role rule.

```typescript
/** @riviere-role cli-response-formatter */
export function formatSuccess<T>(data: T): JsonOutput<T> {
  return { success: true, data }
}
```

## Anti-Patterns

- Switching on a particular command result.
- Calling `console`, writing to process streams or files, or terminating the process.
- Returning an unclassified response object.
- Passing the original command result through unchanged.

## Decision Guidance

- Does it decide how one command result appears? → `cli-output-formatter`.
- Does it create a reusable response envelope? → `cli-response-formatter`.
- Does it perform the output side effect? → `cli-response-writer`.
