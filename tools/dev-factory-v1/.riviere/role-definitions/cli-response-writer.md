# cli-response-writer

## Purpose

A function that writes fully formatted `cli-output` to a CLI output boundary consistently.

## Behavioural Contract

1. Accept `cli-output` that is ready to write.
2. Perform output mechanics such as serialisation, stream selection, file writing, or process exit.
3. Apply those mechanics consistently for every response it supports.
4. Make no entrypoint-specific presentation decisions.
5. Handle no regular domain or application control flow.

## Example

The fields below are an application choice, not a role rule.

```typescript
/** @riviere-role cli-response-writer */
export function writeResponse(output: TextOutput): void {
  if (output.stream === 'stdout') process.stdout.write(output.message)
  else process.stderr.write(output.message)
}
```

## Anti-Patterns

- Accepting a command result, query model, primitive, `unknown`, `object`, or broad generic input.
- Switching on a command-specific result shape.
- Formatting command-specific messages.
- Loading data or calling a use case.
- Using a type assertion to make unrelated data look like `cli-output`.

## Decision Guidance

- Does it decide what one command should say? → `cli-output-formatter`.
- Does it create a reusable response envelope? → `cli-response-formatter`.
- Does it only emit fully formatted output? → `cli-response-writer`.

## Transitional Enforcement

The executable rule temporarily permits existing writers to accept command results and query models. GitHub issue #523 tracks their migration and removal of that allowance. New and changed writers must accept only `cli-output`.
