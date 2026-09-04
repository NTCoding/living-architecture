# cli-response

## Purpose

A generic CLI response envelope ready to be written to an output boundary.

## Behavioral Contract

1. Is a data structure containing already-formatted output.
2. Distinguishes successful standard output from failed standard error output.
3. Contains an exit code only for failed output.
4. Contains no command-specific domain or application result.
5. Performs no formatting or output side effects.

## Example

```typescript
/** @riviere-role cli-response */
export type CliResponse =
  | { readonly message: string; readonly stream: 'stdout' }
  | { readonly exitCode: number; readonly message: string; readonly stream: 'stderr' }
```

## Anti-Patterns

- Using a command result or query model as a generic response envelope.
- Making the exit code optional for successful and failed responses.
- Writing to stdout or stderr from the response data structure.
