# Function: findNearMatches()

> **findNearMatches**(`components`, `query`, `options?`): [`NearMatchResult`](../interfaces/NearMatchResult.md)[]

Defined in: [packages/riviere-builder/src/component-suggestion.ts:40](https://github.com/ntcoding/living-architecture/blob/d4967a3da183df8420cf94f4ddcea233b1bd1221/packages/riviere-builder/src/component-suggestion.ts#L40)

Finds components similar to a query using fuzzy matching.

Used for error recovery to suggest alternatives when exact matches fail.

## Parameters

### components

`Component`[]

Array of components to search

### query

[`NearMatchQuery`](../interfaces/NearMatchQuery.md)

Search criteria with name and optional type/domain filters

### options?

[`NearMatchOptions`](../interfaces/NearMatchOptions.md)

Optional threshold and limit settings

## Returns

[`NearMatchResult`](../interfaces/NearMatchResult.md)[]

Array of matching components with similarity scores

## Example

```typescript
const matches = findNearMatches(components, { name: 'Create Ordr' })
// [{ component: {...}, score: 0.9, mismatch: undefined }]
```
