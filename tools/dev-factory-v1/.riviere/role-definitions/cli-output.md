# cli-output

## Purpose

Data that has been fully formatted for a CLI output boundary.

This role describes a reusable place in the presentation flow. It does not prescribe an application's output fields, serialisation format, streams, exit codes, or destinations.

## Behavioural Contract

1. Is a data structure containing output that is ready for a `cli-response-writer`.
2. Is produced by a `cli-output-formatter` or a generic `cli-response-formatter`.
3. Is consumed by a `cli-response-writer`.
4. Contains presentation data, not an unformatted command result or query model.
5. Contains no formatting behaviour and performs no output side effects.
6. Does not also claim a command result, query model, or other architectural data role.

## Example

The shape below is only an example. Applications may use a different shape.

```typescript
/** @riviere-role cli-output */
export type TextOutput =
  | { readonly message: string; readonly stream: 'stdout' }
  | { readonly exitCode: number; readonly message: string; readonly stream: 'stderr' }
```

## Allowed Pattern

```text
command/query result
  -> cli-output-formatter
  -> cli-output
  -> cli-response-writer
  -> output boundary
```

A generic response envelope may add one formatting step:

```text
command/query result
  -> cli-output-formatter
  -> cli-response-formatter
  -> cli-output
  -> cli-response-writer
```

## Anti-Patterns

- Annotating a command result or query model as `cli-output` so a writer will accept it.
- Passing a primitive, `unknown`, `object`, or unrelated value to a writer.
- Using a type assertion to disguise unrelated data as `cli-output`.
- Storing formatting functions or output side effects in the data structure.
- Treating the example shape as a required global CLI format.

## Transitional Enforcement

New and changed code must follow this lifecycle. Existing response writers may still accept command results or query models while the repository migration in GitHub issue #523 is completed. Do not copy that legacy pattern into new code.
