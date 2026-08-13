---
pageClass: reference
---

# Function: findNearMatches()

> **findNearMatches**(`components`, `query`, `options?`): `Readonly`\<\{ `component`: `Component`; `mismatch?`: `Readonly`\<\{ `actual`: `string`; `expected`: `string`; `field`: `"type"` \| `"domain"`; \}\>; `score`: `number`; \}\>[]

Defined in: packages/riviere-builder/src/domain/error-recovery/component-suggestion.ts:75

Finds components similar to a query using fuzzy matching.

Used for error recovery to suggest alternatives when exact matches fail.

## Parameters

### components

readonly `Component`[]

Array of components to search

### query

`NearMatchQuery`

Search criteria with name and optional type/domain filters

### options?

`Readonly`\<\{ `limit?`: `number`; `threshold?`: `number`; \}\>

Optional threshold and limit settings

## Returns

`Readonly`\<\{ `component`: `Component`; `mismatch?`: `Readonly`\<\{ `actual`: `string`; `expected`: `string`; `field`: `"type"` \| `"domain"`; \}\>; `score`: `number`; \}\>[]

Array of matching components with similarity scores

## Riviere-role

domain-service

## Example

```typescript
const matches = findNearMatches(components, { name: 'Create Ordr' })
// [{ component: {...}, score: 0.9, mismatch: undefined }]
```
