# domain-event

## Purpose

A data-only record of something that happened in the domain.

## Rules

- Must be a type alias.
- Must be a data structure containing fields only.
- Must not contain methods, callable properties, call signatures or constructor signatures.

## Canonical Example

```typescript
/** @riviere-role domain-event */
export type WorkflowEvent =
  | { type: 'session-started'; at: string }
  | { type: 'transitioned'; at: string; from: string; to: string }
```

## Anti-Patterns

- A command requesting that something should happen.
- A mutable object with behaviour.
- A generic message envelope with no domain meaning.
