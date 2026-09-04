# cli-response

## Purpose

A generic CLI response envelope ready to be written to an output boundary.

## Behavioral Contract

1. Is a data structure containing already formatted output.
2. Uses a generic response shape shared by more than one command.
3. May distinguish success from failure as structured data for serialisation.
4. May identify the output stream and exit code when it represents an output instruction.
5. Contains no command specific domain or application result.
6. Performs no formatting or output side effects.

## Examples

```typescript
/** @riviere-role cli-response */
export interface SuccessOutput<T> {
  readonly success: true
  readonly data: T
  readonly warnings: readonly string[]
}

/** @riviere-role cli-response */
export type CliResponse =
  | { readonly message: string; readonly stream: 'stdout' }
  | { readonly exitCode: number; readonly message: string; readonly stream: 'stderr' }
```

## Anti-Patterns

- Using a command result or query model as a generic response envelope.
- Adding stream or exit metadata to structured output which is only ready for serialisation.
- Omitting required stream or exit metadata from an output instruction.
- Writing to stdout or stderr from the response data structure.
