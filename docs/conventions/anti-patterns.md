# Anti-Patterns

Banned patterns. Exceptions require documented justification.

---

## AP-002: Sacrificing Quality for File Length Limits

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

## AP-003: Changing test assertions when tests fail

When a new change breaks an existing test it is never acceptable to change the assertion to make the tests pass. You must first understand if the test is failing because a regression was introduced (do not update the assertion) or if the existing test actually represents a desired change in behaviour (ok to update the assertion).

---

## AP-004: Passing empty strings into parameters of type string

If a method takes a parameter of type string and code is passing an empty string value, it's a red flag. An empty strings represents no value hinting at a implicit concept (how to properly handle a missing value: fail fast? create a proper type instead?)

Warning sign: unit test that verifies that a method that takes a string treats an empty string as a valid and expected scenario.

```typescript
it('should return empty string when empty string provided', () => {
  expect(doThing('')).toEqual('')
})
```

It is probably better to not call the method or to throw an error if a real value is expected. Or look at the design more closely - could the string be represented by a proper type.

---

## AP-005: Sharing test fixtures across packages

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

---

## AP-006: Lazy Coverage Ignore Comments

🚨 **Never add coverage ignore comments (`/* v8 ignore */`, `/* istanbul ignore */`) without full justification.**

Coverage ignore comments are acceptable ONLY when code is genuinely unreachable through any test. Before adding an ignore comment, you MUST:

1. **Attempt to write a test first** - Most "defensive" code CAN be tested
2. **Document WHY it's untestable** - The comment must explain the specific reason
3. **Verify it's truly unreachable** - Not just "hard to test" or "unlikely to happen"

### ❌ Bad - Lazy Justifications

```typescript
/* v8 ignore next -- defensive code */
if (value === undefined) { throw new Error('...') }

/* v8 ignore next -- button is disabled */
if (!canProceed) { throw new Error('...') }

/* v8 ignore next -- should never happen */
if (item === null) { throw new Error('...') }
```

### ✓ Good - Fully Justified

```typescript
/* v8 ignore next -- @preserve defensive: Map.get immediately after Map.set */
// This is structurally unreachable - we just called map.set(key, value)
const entry = map.get(key)
if (entry === undefined) { throw new GraphError('...') }

/* v8 ignore next 3 -- @preserve defensive: D3 callback, coordinates set by simulation */
// D3 simulation always provides coordinates before calling this callback
// Testing would require mocking D3's internal tick mechanism
if (node.x === undefined) { throw new LayoutError('...') }
```

### When to Write Tests Instead

| Scenario | Solution |
|----------|----------|
| "Button is disabled so handler can't be called" | Extract validation to testable function |
| "CSS module class should always exist" | Mock the module import in a separate test file |
| "External API always returns valid data" | Test with mocked invalid responses |
| "Internal function only called with valid input" | Export and test directly, or test via integration |

### Valid Ignore Scenarios

- **Structural impossibility**: Code after `Map.set()` checking if `Map.get()` returns undefined
- **Framework internals**: D3/React callbacks that can't be invoked without framework machinery
- **Platform guards**: Code paths only reachable on specific platforms (e.g., browser vs Node.js)

**Rule**: If you can write a test, you MUST write a test. "Hard to test" is not a valid excuse.

---

## AP-007: Manual JSON Construction in Shell Scripts

🚨 **When building JSON in bash, use `jq` instead of manual string escaping.** Manual escaping typically misses backslashes, newlines, and tabs.

### ❌ Bad

```bash
BODY="${MESSAGE//\"/\\\"}"
gh api ... --field body="$BODY"
```

### ✓ Good

```bash
BODY=$(jq -n --arg msg "$MESSAGE" '{body: $msg}')
gh api ... --input - <<< "$BODY"
```

---

## AP-009: Inconsistent Patterns Between Related Functions

🚨 **Related functions must use consistent formatting, error messages, naming conventions, and response structures.**

Users experience the product as a whole. When two functions that do similar things use different patterns, it signals carelessness and creates confusion. This applies to:

- Error message formatting (e.g., one function uses `Expected X, got Y` while its sibling uses `Invalid value: Y`)
- Response/output structures across related endpoints
- Parameter naming conventions between related functions
- Logging patterns within the same feature

### ❌ Bad

```typescript
// Two parse functions in the same module with different error styles
function parseComponentInput(raw: RawComponentInput): ComponentInput {
  if (!raw.type) throw new Error(`Expected type, got undefined`)
  // ...
}

function parseConnectionInput(raw: RawConnectionInput): ConnectionInput {
  if (!raw.source) throw new Error(`Invalid input: missing source`)
  // ...
}
```

### ✓ Good

```typescript
// Consistent error formatting across related functions
function parseComponentInput(raw: RawComponentInput): ComponentInput {
  if (!raw.type) throw new Error(`Expected type in component input, got undefined`)
  // ...
}

function parseConnectionInput(raw: RawConnectionInput): ConnectionInput {
  if (!raw.source) throw new Error(`Expected source in connection input, got undefined`)
  // ...
}
```

**Detection:** When adding or modifying a function, check sibling functions in the same module/feature for the same kind of operation. Verify patterns are consistent.

---

## AP-008: Unused Variables in Shell Scripts

🚨 **Flag any variables that are extracted or assigned but never used.** Remove the variable or use it.

---

## AP-010: Re-Computing Results Instead of Propagating

🚨 **When a function computes a result and delegates to another function, pass the result — never re-compute it.**

If function A calls `resolve(x)` and then delegates to function B, which also calls `resolve(x)`, the result should be passed from A to B. Re-computing a deterministic result is wasteful and a design smell — it signals that the call chain's data flow is unclear.

This is a form of [connascence of algorithm](https://connascence.io/algorithm.html) — two call sites must independently agree on how to derive the same result from the same dependency. Fowler's **"Replace Query with Parameter"** refactoring addresses this: have the caller pass its already-computed result instead of letting the callee re-derive it.

### ❌ Bad

```typescript
function traceCall(typeName: string, project: Project, index: ComponentIndex): void {
  const resolved = resolveType(typeName, project, index)
  if (resolved.component !== undefined) {
    links.push(resolved.component)
    return
  }
  // Delegates to helper — which calls resolveType again
  traceNonComponent(typeName, project, index)
}

function traceNonComponent(typeName: string, project: Project, index: ComponentIndex): void {
  const resolved = resolveType(typeName, project, index) // redundant — same call
  const traceName = resolved.resolvedTypeName ?? typeName
  // ...
}
```

Both functions independently call `resolveType` with the same arguments. If the resolution logic changes, both call sites must stay in sync.

### ✓ Good

Return a structured outcome and pass it through the call chain:

```typescript
interface ResolutionOutcome {
  component: Component | undefined
  resolvedTypeName: string | undefined
  uncertain: string | undefined
}

function traceCall(typeName: string, project: Project, index: ComponentIndex): void {
  const outcome = resolveType(typeName, project, index)
  if (outcome.component !== undefined) {
    links.push(outcome.component)
    return
  }
  traceNonComponent(typeName, outcome) // passes the outcome
}

function traceNonComponent(typeName: string, outcome: ResolutionOutcome): void {
  const traceName = outcome.resolvedTypeName ?? typeName
  // ...
}
```

**Detection:** When a function delegates to another function after calling a shared dependency, check whether the delegate re-calls the same dependency with the same arguments. If so, have the first caller return a structured outcome and pass it through.
