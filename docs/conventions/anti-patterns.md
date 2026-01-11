# Anti-Patterns

Banned patterns. Exceptions require documented justification.

---

## String-Based Error Detection

🚨 **Never parse error message strings to determine error types or extract information.**

### ❌ Bad

```typescript
if (error.message.startsWith("Custom type '") && error.message.includes('not defined')) {
  // Handle missing custom type
}

const match = errorMessage.match(/Did you mean: (.+)\?/);
```

### ✓ Good

```typescript
class CustomTypeNotDefinedError extends Error {
  readonly code = 'CUSTOM_TYPE_NOT_DEFINED' as const;
  constructor(public readonly typeName: string) {
    super(`Custom type '${typeName}' not defined`);
  }
}

if (error instanceof CustomTypeNotDefinedError) {
  // Handle
}
```

**Detection:** `.message.includes(`, `.message.startsWith(`, regex on `error.message`

---

## Sacrificing Quality for File Length Limits

🚨 **Never sacrifice code quality, test coverage, or readability to satisfy linting rules or file length limits.**

This includes:
- Cramming code onto fewer lines
- Removing whitespace or collapsing structure
- **Deleting tests or skipping test coverage**
- Not adding needed tests because "it would exceed the limit"
- Creating helper functions solely to reduce line count (not for reuse)

### ❌ Bad

```typescript
// Cramming object properties onto fewer lines
{ type: 'API', name: 'List Orders', module: 'api', filePath: 'src/api/orders.ts',
  extraArgs: ['--api-type', 'REST'], expectedId: 'orders:api:api:list-orders' }

// Removing whitespace or collapsing structure
const result = items.map(x => ({ id: x.id, name: x.name, value: x.value })).filter(x => x.value > 0);

// Skipping tests because file is "too long"
// "NOT FIXING: max-lines limit (400)" ← NEVER acceptable for test coverage
```

### ✓ Good

```typescript
{
  type: 'API',
  name: 'List Orders',
  module: 'api',
  filePath: 'src/api/orders.ts',
  extraArgs: ['--api-type', 'REST'],
  expectedId: 'orders:api:api:list-orders',
}

const result = items
  .map(x => ({
    id: x.id,
    name: x.name,
    value: x.value,
  }))
  .filter(x => x.value > 0);
```

**Solutions when hitting max-lines:**
- **Split the file** - Create focused files for related functionality (e.g., `foo.spec.ts` and `foo.edge-cases.spec.ts`)
- Look for duplicated code - extract into shared modules (often the real cause of bloat)
- Extract duplicated test fixtures or setup code into shared fixtures
- Use `it.each` or `describe.each` for parameterized tests

**Never:**
- Skip adding tests
- Delete existing tests
- Compress code to fit limits

---

## Parsing strings in exception messages

Only when 100% unavoidable (e.g., third-party library limitations):

```typescript
// ANTI-PATTERN EXCEPTION: String-Based Error Detection
// Justification: Library X doesn't expose typed errors
// Tracking: Issue #123 / requested upstream fix
if (error.message.includes('...')) { ... }
```

---

## Changing test assertions when tests fail

When a new change breaks an existing test it is never acceptable to change the assertion to make the tests pass. You must first understand if the test is failing because a regression was introduced (do not update the assertion) or if the existing test actually represents a desired change in behaviour (ok to update the assertion).

---

## Passing empty strings into parameters of type string

If a method takes a parameter of type string and code is passing an empty string value, it's a red flag. An empty strings represents no value hinting at a implicit concept (how to properly handle a missing value: fail fast? create a proper type instead?)

Warning sign: unit test that verifies that a method that takes a string treats an empty string as a valid and expected scenario.

```typescript
it('should return empty string when empty string provided', () => {
  expect(doThing('')).toEqual('')
})
```

It is probably better to not call the method or to throw an error if a real value is expected. Or look at the design more closely - could the string be represented by a proper type.

---

## Sharing test fixtures across packages

🚨 **Never export test fixtures from a package for use by other packages.**

Test fixtures are hardcoded test data values specific to a package's tests. Sharing them across packages:
- Makes internal test setup part of the public API
- Creates fragile coupling (fixture changes break other packages)
- Forces unnecessary exports

### ❌ Bad

```typescript
// packages/config/src/index.ts
export { createMinimalConfig, createMinimalModule } from './test-fixtures'

// packages/extractor/src/extractor.spec.ts
import { createMinimalConfig } from '@my-org/config'  // Cross-package fixture import
```

### ✓ Good

Each package creates its own test fixtures:

```typescript
// packages/config/src/test-fixtures.ts (NOT exported from index.ts)
export function createMinimalConfig(): Config { ... }

// packages/extractor/src/test-fixtures.ts (separate, local fixtures)
export function createTestConfig(): Config { ... }
```

**Note:** This applies to raw test data fixtures, not shared test utilities or test-data-builders that provide genuine reusable logic.
