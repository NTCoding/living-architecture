# query-model-value

## Purpose

An exported data type used as part of a `query-model` contract.

## Rules

- Lives beside the query model that contains it.
- Contains query result data or a closed set of query values.
- Contains no query execution, domain behaviour, persistence or presentation logic.
- Is exported only when another file needs to name the type; otherwise it stays inline in the result.

## Canonical Example

```typescript
/** @riviere-role query-model-value */
export type ComponentErrorCode =
  | 'GRAPH_NOT_FOUND'
  | 'GRAPH_CORRUPTED'
```

## Anti-Patterns

- Creating a separate exported type when the shape is used only once and can remain inline.
- Putting methods or orchestration behaviour in a query value.
- Using the role for query models or the complete query result.
