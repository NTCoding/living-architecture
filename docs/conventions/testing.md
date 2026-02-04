# Writing Tests

How to write tests that catch bugs, document behavior, and remain maintainable.

> Based on [BugMagnet](https://github.com/gojko/bugmagnet-ai-assistant) by Gojko Adzic. Adapted with attribution.
>
> **See also:** [Project-specific conventions](#project-specific-conventions) at the end of this document.

## Critical Rules

**TS-001: Test names describe outcomes, not actions.** "returns empty array when input is null" not "test null input". The name IS the specification.

**TS-002: Assertions must match test titles.** If the test claims to verify "different IDs", assert on the actual ID values—not just count or existence.

**TS-003: Assert specific values, not types.** `expect(result).toEqual(['First.', ' Second.'])` not `expect(result).toBeDefined()`. Specific assertions catch specific bugs.

**TS-004: One concept per test.** Each test verifies one behavior. If you need "and" in your test name, split it.

**TS-005: Bugs cluster together.** When you find one bug, test related scenarios. The same misunderstanding often causes multiple failures.

## When This Applies

- Writing new tests
- Reviewing test quality
- During TDD RED phase (writing the failing test)
- Expanding test coverage
- Investigating discovered bugs

## TS-001: Test Naming

**Pattern:** `[outcome] when [condition]`

### Good Names (Describe Outcomes)

```text
returns empty array when input is null
throws ValidationError when email format invalid
calculates tax correctly for tax-exempt items
preserves original order when duplicates removed
```

### Bad Names (Describe Actions)

```text
test null input           // What about null input?
should work               // What does "work" mean?
handles edge cases        // Which edge cases?
email validation test     // What's being validated?
```

### The Specification Test

Your test name should read like a specification. If someone reads ONLY the test names, they should understand the complete behavior of the system.

## Assertion Best Practices (TS-002, TS-003)

### Assert Specific Values

```typescript
// WEAK - passes even if completely wrong data
expect(result).toBeDefined()
expect(result.items).toHaveLength(2)
expect(user).toBeTruthy()

// STRONG - catches actual bugs
expect(result).toEqual({ status: 'success', items: ['a', 'b'] })
expect(user.email).toBe('test@example.com')
```

### Match Assertions to Test Title

```typescript
// TEST SAYS "different IDs" BUT ASSERTS COUNT
it('generates different IDs for each call', () => {
  const id1 = generateId()
  const id2 = generateId()
  expect([id1, id2]).toHaveLength(2)  // WRONG: doesn't check they're different!
})

// ACTUALLY VERIFIES DIFFERENT IDs
it('generates different IDs for each call', () => {
  const id1 = generateId()
  const id2 = generateId()
  expect(id1).not.toBe(id2)  // RIGHT: verifies the claim
})
```

### TS-007: Avoid Implementation Coupling

```typescript
// BRITTLE - tests implementation details
expect(mockDatabase.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = 1')

// FLEXIBLE - tests behavior
expect(result.user.name).toBe('Alice')
```

## Test Structure

### TS-006: Arrange-Act-Assert

```typescript
it('calculates total with tax for non-exempt items', () => {
  // Arrange: Set up test data
  const item = { price: 100, taxExempt: false }
  const taxRate = 0.1

  // Act: Execute the behavior
  const total = calculateTotal(item, taxRate)

  // Assert: Verify the outcome
  expect(total).toBe(110)
})
```

### TS-004: One Concept Per Test

```typescript
// MULTIPLE CONCEPTS - hard to diagnose failures
it('validates and processes order', () => {
  expect(validate(order)).toBe(true)
  expect(process(order).status).toBe('complete')
  expect(sendEmail).toHaveBeenCalled()
})

// SINGLE CONCEPT - clear failures
it('accepts valid orders', () => {
  expect(validate(validOrder)).toBe(true)
})

it('rejects orders with negative quantities', () => {
  expect(validate(negativeQuantityOrder)).toBe(false)
})

it('sends confirmation email after processing', () => {
  process(order)
  expect(sendEmail).toHaveBeenCalledWith(order.customerEmail)
})
```

## TS-008: Edge Case Checklists

When testing a function, systematically consider these edge cases based on input types.

### Numbers

**Critical (always test for numeric validation):**
- [ ] NaN
- [ ] Infinity / -Infinity
- [ ] Zero (0)
- [ ] Negative numbers (-1)
- [ ] Fractional when integer expected (3.14)

**Extended (test when relevant):**
- [ ] Very large numbers (near MAX_SAFE_INTEGER)
- [ ] Very small numbers (near MIN_SAFE_INTEGER)
- [ ] Decimal precision (0.1 + 0.2)
- [ ] Boundary values (off-by-one at limits)

### Strings

- [ ] Empty string `""`
- [ ] Whitespace only `"   "`
- [ ] Very long strings (10K+ characters)
- [ ] Unicode: emojis, RTL text, combining characters
- [ ] Special characters: quotes, backslashes, null bytes
- [ ] SQL/HTML/script injection patterns
- [ ] Leading/trailing whitespace
- [ ] Mixed case sensitivity

### Collections (Arrays, Objects, Maps)

- [ ] Empty collection `[]`, `{}`
- [ ] Single element
- [ ] Duplicates
- [ ] Nested structures
- [ ] Circular references
- [ ] Very large collections (performance)
- [ ] Sparse arrays
- [ ] Mixed types in arrays

### Dates and Times

- [ ] Leap years (Feb 29)
- [ ] Daylight saving transitions
- [ ] Timezone boundaries
- [ ] Midnight (00:00:00)
- [ ] End of day (23:59:59)
- [ ] Year boundaries (Dec 31 -> Jan 1)
- [ ] Invalid dates (Feb 30, Month 13)
- [ ] Unix epoch edge cases
- [ ] Far future/past dates

### Null and Undefined

- [ ] `null` input
- [ ] `undefined` input
- [ ] Missing optional properties
- [ ] Explicit `undefined` vs missing key

### Domain-Specific

- [ ] Email: valid formats, edge cases (plus signs, subdomains)
- [ ] URLs: protocols, ports, special characters, relative paths
- [ ] Phone numbers: international formats, extensions
- [ ] Addresses: Unicode, multi-line, missing components
- [ ] Currency: rounding, different currencies, zero amounts
- [ ] Percentages: 0%, 100%, over 100%

### Violated Domain Constraints

These test implicit assumptions in your domain:

- [ ] Uniqueness violations (duplicate IDs, emails)
- [ ] Missing required relationships (orphaned records)
- [ ] Ordering violations (events out of sequence)
- [ ] Range breaches (age -1, quantity 1000000)
- [ ] State inconsistencies (shipped but not paid)
- [ ] Format mismatches (expected JSON, got XML)
- [ ] Temporal ordering (end before start)

## TS-005: Bug Clustering

When you discover a bug, don't stop—explore related scenarios:

1. **Same function, similar inputs** - If null fails, test undefined, empty string
2. **Same pattern, different locations** - If one endpoint mishandles auth, check others
3. **Same developer assumption** - If off-by-one here, check other boundaries
4. **Same data type** - If dates fail at DST, check other time edge cases

## When Tempted to Cut Corners

- If your test name says "test" or "should work": STOP. What outcome are you actually verifying? Name it specifically.

- If you're asserting `toBeDefined()` or `toBeTruthy()`: STOP. What value do you actually expect? Assert that instead.

- If your assertion doesn't match your test title: STOP. Either fix the assertion or rename the test. They must agree.

- If you're testing multiple concepts in one test: STOP. Split it. Future you debugging a failure will thank you.

- If you found a bug and wrote one test: STOP. Bugs cluster. What related scenarios might have the same problem?

- If you're skipping edge cases because "that won't happen": STOP. It will happen. In production. At 3 AM.

---

## TS-013: Assertion-to-Title Alignment

Verify that test assertions actually exercise the behavior claimed by the test name. This is a stricter enforcement of TS-002.

**Detection:** Read the test title, then check that assertions directly verify the claim.

**Example (BAD):**
```typescript
it('generates different IDs for each call', () => {
  const ids = [generateId(), generateId()]
  expect(ids).toHaveLength(2)  // Only checks count, not uniqueness
})
```

**Example (GOOD):**
```typescript
it('generates different IDs for each call', () => {
  const id1 = generateId()
  const id2 = generateId()
  expect(id1).not.toBe(id2)  // Actually verifies "different"
})
```

Misleading test names hide missing coverage. Hard failure.

---

## TS-014: Edge Case Checklist Enforcement

Verify that test files consider edge cases from TS-008 relevant to the function's input types.

**Detection:** For each tested function, identify its input types (strings, numbers, collections, dates, etc.), then check whether the test suite covers obvious edge case categories from the TS-008 checklists.

Not every checklist item is required — use judgment. Flag when an entire category is missing for a relevant input type.

**Example (BAD):**
```typescript
// Function accepts a string, but tests only cover happy path
describe('parseRoute', () => {
  it('parses a valid route', () => { ... })
  it('parses a route with params', () => { ... })
  // No tests for: empty string, whitespace, special characters, very long strings
})
```

**Example (GOOD):**
```typescript
describe('parseRoute', () => {
  it('parses a valid route', () => { ... })
  it('parses a route with params', () => { ... })
  it('returns error for empty string', () => { ... })
  it('trims whitespace from route', () => { ... })
  it('handles special characters in route segments', () => { ... })
})
```

Missing edge cases lead to production bugs. Hard failure.

---

## Project-Specific Conventions

The following conventions are specific to this project, not from BugMagnet.

### TS-009: Test Fixtures

Use fixture files to reduce duplication and improve test clarity.

**When to use fixtures:**

- Multiple tests share similar setup data
- Tests differ only in specific values being tested

**Pattern:** Create `<module>-fixtures.ts` alongside `<module>.spec.ts`

```typescript
// command-fixtures.ts
const DEFAULTS = {
  type: 'UI',
  name: 'Test Component',
  domain: 'orders',
} as const;

export function buildArgs(options = {}) {
  return { ...DEFAULTS, ...options };
}

// command.spec.ts
it('handles custom value', async () => {
  await run(buildArgs({ customField: 'test-value' }));
  expect(...);
});
```

**Benefits:**

- Tests show only what's relevant to the test case
- Defaults defined once, not repeated
- Changes to common structure happen in one place

### jsdom Limitations

When testing browser code with jsdom:

- **Cannot spy on `window.location.assign`** - Use `Object.defineProperty` to mock `window.location` with a setter that captures values, and restore in `afterEach`
- **Cannot spy on native MouseEvent methods** - Use `vi.spyOn(event, 'preventDefault')` after creating the event with `new MouseEvent()`

### TS-010: Testing Cleanup Functions (Resource Management)

**General rule:** Test behavior, not implementation ([Testing Library philosophy](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)).

**Exception for resource cleanup:** When testing cleanup of resources (timers, event listeners, subscriptions), verify the cleanup mechanism was called using spies.

**Why:** Memory leaks and resource leaks have no observable behavior in tests. The cleanup mechanism IS the important behavior to verify ([React cleanup guidance](https://moldstud.com/articles/p-expert-tips-for-handling-component-cleanup-in-react-lifecycle)).

**How:** Use [test spies](https://martinfowler.com/bliki/TestDouble.html) to verify cleanup functions were called:

```typescript
it('calls clearTimeout when component unmounts with pending timeout', () => {
  const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

  const { unmount } = render(<Component />)
  // ... trigger timeout creation ...

  const callCountBefore = clearTimeoutSpy.mock.calls.length
  unmount()

  expect(clearTimeoutSpy).toHaveBeenCalledTimes(callCountBefore + 1)
  clearTimeoutSpy.mockRestore()
})
```

**Always restore spies** in the same test or in `afterEach` to prevent leaks between tests.

### TS-011: Testing Errors

Test both error type and identifying properties (message, kind, code) in a single test—they represent one error condition.

```typescript
it('throws ConfigurationError when config file is missing', () => {
  expect(() => loadConfig('nonexistent.json')).toThrow(ConfigurationError)
  expect(() => loadConfig('nonexistent.json')).toThrow('Config file not found')
})
```

### TS-012: Mock Global Objects with vi.spyOn

When mocking globals (`console.error`, `console.log`, `window.fetch`, etc.), use `vi.spyOn` instead of direct property reassignment. Direct reassignment leaks the mock if the test throws before the restore line is reached.

**Example (BAD):**
```typescript
const original = console.error
console.error = (msg: string) => captured.push(msg)
// ... test logic ...
console.error = original  // never reached if test throws above
```

**Example (GOOD):**
```typescript
const spy = vi.spyOn(console, 'error').mockImplementation((msg: string) => captured.push(String(msg)))
// ... test logic ...
spy.mockRestore()  // or rely on vi.restoreAllMocks() in afterEach
```
