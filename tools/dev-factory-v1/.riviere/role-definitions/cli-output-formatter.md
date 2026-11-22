# cli-output-formatter

## Purpose

A function that decides how an entrypoint-specific command or query result should be presented.

## Behavioural Contract

1. Accept a typed command or query result, or entrypoint-specific presentation input.
2. Decide what the result should look like for that CLI entrypoint.
3. Produce `cli-output`, either directly or through a generic `cli-response-formatter`.
4. Leave stdout, stderr, file output, and process exit to `cli-response-writer`.
5. Perform no output side effects.
6. Handle expected typed results, not uncaught exceptions.

## Example

```typescript
/** @riviere-role cli-output-formatter */
export function formatPreparedBranch(result: PrepareBranchResult): TextOutput {
  return formatSuccessfulResponse(`Prepared ${result.branch}.\n`)
}
```

`TextOutput` is merely the application's chosen `cli-output` shape. The role does not require that shape.

## Anti-Patterns

- Calling `console`, writing to process streams, writing output files, or terminating the process.
- Returning the original command result and relying on the writer to format it.
- Loading more data to enrich the response.
- Making business decisions about what the result means.
- Handling unknown thrown errors.

## Decision Guidance

- Does it decide how one command or query result appears? → `cli-output-formatter`.
- Does it only create a reusable response envelope? → `cli-response-formatter`.
- Does it perform the output side effect? → `cli-response-writer`.

## Transitional Enforcement

Some existing formatters still perform output side effects. GitHub issue #523 tracks their migration. New and changed code must not copy that legacy pattern.
