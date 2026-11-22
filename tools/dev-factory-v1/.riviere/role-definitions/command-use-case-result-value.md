# command-use-case-result-value

## Purpose

An exported data type used as part of a `command-use-case-result` contract.

## Rules

- Lives beside the command result that contains it.
- Contains result data or a closed set of result values.
- Contains no command execution, domain behaviour, persistence or presentation logic.
- Is exported only when another file needs to name the type; otherwise it stays inline in the result.

## Canonical Example

```typescript
/** @riviere-role command-use-case-result-value */
export type AddComponentErrorCode =
  | 'VALIDATION_ERROR'
  | 'GRAPH_NOT_FOUND'
  | 'DUPLICATE_COMPONENT'
```

## Anti-Patterns

- Creating a separate exported type when the shape is used only once and can remain inline.
- Putting methods or orchestration behaviour in a result value.
- Using the role for command inputs or the complete command result.
