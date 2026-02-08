# Review Feedback Checks

Patterns learned from external review feedback (e.g., CodeRabbit). Any PR feedback requiring code changes represents a process failure that should be caught locally in future PRs.

## How to Use This File

**Bug-scanner** reads this file and applies each check to changed code.

**Post-merge completion** updates this file when PR feedback reveals a generalizable pattern.

---

## RFC-001: Documentation-to-Code Consistency

**Source:** PR #115 (CodeRabbit)

**Pattern:** Documentation claims a script/function handles multiple types but implementation only handles one.

**Example (BAD):**
```markdown
Use `create-tech-improvement-task.sh` to create non-milestone tasks (applies appropriate label)
```
But script only creates tech improvements with hardcoded label.

**Example (GOOD):**
```markdown
Use `create-non-milestone-task.sh --type <idea|bug|tech>` to create non-milestone tasks
```
Script accepts type parameter and applies corresponding label.

**Detection:** When docs reference a script/command, verify the described behavior matches actual implementation.

---

## RFC-002: User-Friendly Display Names

**Source:** PR #115 (CodeRabbit)

**Pattern:** Raw internal values (enums, labels, keys) displayed to users instead of formatted names.

**Example (BAD):**
```bash
echo "Non-milestone tasks: $NON_MILESTONE_LABEL"
# Outputs: "Non-milestone tasks: idea"
```

**Example (GOOD):**
```bash
case "$NON_MILESTONE_LABEL" in
    idea) LABEL_DISPLAY="Ideas" ;;
    bug) LABEL_DISPLAY="Bugs" ;;
    "tech improvement") LABEL_DISPLAY="Tech Improvements" ;;
esac
echo "Non-milestone tasks: $LABEL_DISPLAY"
# Outputs: "Non-milestone tasks: Ideas"
```

**Detection:** User-facing echo/print statements should not output raw enum/label values.

---

## RFC-003: Query Filtering Completeness

**Source:** PR #115 (CodeRabbit)

**Pattern:** Query for a category but doesn't explicitly exclude what shouldn't match.

**Example (BAD):**
```bash
# Query for non-milestone tasks but might return issues WITH milestones
gh issue list --label "idea" --state open
```

**Example (GOOD):**
```bash
# Explicitly exclude milestone issues
gh issue list --label "idea" --milestone "" --state open
```

**Detection:** When querying for a subset (e.g., "non-milestone"), verify exclusion filters are explicit.

---

## RFC-004: Non-Deterministic String Sorting

**Source:** PR #123 (CodeRabbit)

**Pattern:** Using `localeCompare()` for sorting produces environment-dependent results. Different locales sort strings differently, making output non-deterministic across machines.

**Example (BAD):**
```typescript
const sorted = domains.sort((a, b) => a.localeCompare(b))
// Output varies by environment locale settings
```

**Example (GOOD):**
```typescript
function compareByCodePoint(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

const sorted = domains.sort(compareByCodePoint)
// Output is deterministic across all environments
```

**Detection:** Any use of `.localeCompare()` in sorting or comparison logic. Only acceptable when locale-specific sorting is explicitly required (e.g., user-facing alphabetical lists where locale matters).

---

## RFC-005: Type Redefinition Instead of Import

**Source:** PR #123 (CodeRabbit)

**Pattern:** Locally defining a type that's already exported from another package, creating maintenance burden and potential drift.

**When it's bad (this case):**
```typescript
// In test file
interface DraftComponent {
  type: string
  name: string
  domain: string
  location: { file: string; line: number }
}
```
The type is identical to what's exported from `@living-architecture/riviere-extract-ts`. This creates:
- Maintenance burden: changes in source require manual sync
- Potential drift: types can diverge silently
- Wasted code: duplication with no benefit

**When local definition is acceptable:**
- The type is a subset (only needs some fields)
- The type has different semantics (same shape, different meaning)
- Importing would create circular dependencies
- Test-specific extension that adds test helpers

**Example (BAD):**
```typescript
// Exact copy of exported type - just import it
interface DraftComponent {
  type: string
  name: string
  domain: string
  location: { file: string; line: number }
}
```

**Example (GOOD):**
```typescript
import { type DraftComponent } from '@living-architecture/riviere-extract-ts'
```

**Detection:** Local interface/type definitions that match exported types from project packages. Check if the local definition could be replaced with an import.

---

## RFC-006: Incorrect Workflow Instructions

**Source:** PR #123 (User feedback during post-merge-completion)

**Pattern:** Workflow documentation instructs direct commits/pushes to main, which is blocked by project rules.

**Example (BAD):**
```markdown
**If implementing improvements:**
- Make the changes
- Commit to main (or create a new task if significant)
```

**Example (GOOD):**
```markdown
**If implementing improvements:**
- Create a GitHub issue using `./scripts/create-non-milestone-task.sh --type tech`
- Proceed to cleanup
- After cleanup, start the new task via normal workflow
```

**Detection:** Any workflow/command documentation that suggests committing or pushing directly to main. All changes must go through PRs.

---

## RFC-007: String-Based Error Detection

**Source:** PR #129 (Code review miss - anti-pattern not caught)

**Pattern:** Making decisions based on error message content. This is brittle because error messages can change without notice, are not part of any contract, and vary by locale/environment.

**Critical:** Even checking `error instanceof Error && error.message.includes('...')` is still string-based detection. The `instanceof Error` only confirms it's an error - you're still making decisions based on message content.

**Example (BAD):**
```typescript
// String matching on error message - HARD FAIL
if (error instanceof Error && error.message.includes('does not contain')) {
  throw error
}

// Also bad - any form of message inspection for control flow
if (error.message.startsWith('Custom type')) { ... }
const match = error.message.match(/Did you mean: (.+)\?/)
```

**Example (GOOD):**
```typescript
// Custom error class with typed identification
class PackageConfigNotFoundError extends Error {
  readonly name = 'PackageConfigNotFoundError'
  constructor(public readonly packageName: string) {
    super(`Package '${packageName}' does not contain config`)
  }
}

// Use instanceof for type checking
if (error instanceof PackageConfigNotFoundError) {
  throw error
}
```

**Detection patterns (HARD FAIL):**
- `.message.includes(`
- `.message.startsWith(`
- `.message.match(`
- `.message.endsWith(`
- `error.message ===`
- `error.message !==`
- Any regex on `error.message`

**Exception:** Only acceptable when handling third-party library errors that don't expose typed errors. Must include justification comment:
```typescript
// ANTI-PATTERN EXCEPTION: String-Based Error Detection
// Justification: Library X doesn't expose typed errors
// Tracking: Issue #NNN / requested upstream fix
if (error.message.includes('...')) { ... }
```

---

## RFC-008: Literal Type Validation Must Match Interface Constraints

**Source:** PR #172 (CodeRabbit)

**Pattern:** Using a generic literal check (e.g., `hasLiteralValue()`) when the interface constrains a property to a specific type like `string`. A generic check accepts any literal — `42`, `true`, `'hello'` — even when only string literals are valid.

**Example (BAD):**
```typescript
// Interface requires `route: string`, but hasLiteralValue accepts number/boolean literals too
const routeProperty = findInstanceProperty(node, 'route')
if (!hasLiteralValue(routeProperty)) {
  context.report({ message: 'route must be a literal value' })
}
// Passes for: route = 42 (wrong type!)
```

**Example (GOOD):**
```typescript
// Use the type-specific predicate that matches the interface constraint
const routeProperty = findInstanceProperty(node, 'route')
if (!hasStringLiteralValue(routeProperty)) {
  context.report({ message: 'route must be a string literal value' })
}
// Correctly rejects: route = 42
```

**Detection:** When validating that a property has a literal value, check whether the interface constrains the property to a specific type (`string`, `number`, `boolean`). If so, use the type-specific validation (e.g., `hasStringLiteralValue`) rather than the generic `hasLiteralValue`. This applies to any validation logic, not just ESLint rules.

---

## RFC-009: Hardcoded Unix Paths in Process Execution

**Source:** PR #233 (CodeRabbit)

**Pattern:** Using hardcoded Unix-specific paths (`/usr/bin/which`, `/bin/sh`, `/usr/local/bin/node`) as the command in `execFileSync`, `execSync`, `spawn`, or `child_process` calls. These paths don't exist on Windows, causing the command to fail even when the tool is installed.

**Example (BAD):**
```typescript
// Hardcoded Unix path — fails on Windows
const gitPath = execFileSync('/usr/bin/which', ['git'], { encoding: 'utf-8' }).trim()
```

**Example (GOOD):**
```typescript
// Let the OS resolve via PATH
const gitPath = execFileSync('which', ['git'], { encoding: 'utf-8' }).trim()

// Or use a cross-platform package
import which from 'which'
const gitPath = await which('git')
```

**Detection:** Flag `/usr/bin/`, `/bin/`, `/usr/local/bin/` appearing as command arguments in `execFileSync`, `execSync`, `spawn`, `spawnSync`, `exec`, `fork`, or `child_process` method calls.

---

## RFC-010: Symbol-Based AST Name Resolution

**Source:** PR #246 (CodeRabbit)

**Pattern:** Using string-based name matching (`getText()`, `getName()`) for AST type identity comparisons instead of symbol-based resolution. String matching breaks when types are aliased via imports (`import { Foo as Bar }`), re-exported under different names, or referenced through qualified names.

**Example (BAD):**
```typescript
// String-based — breaks with aliased imports
const typeName = typeNode.getText()
if (typeName === 'MyInterface') {
  // Won't match: import { MyInterface as Alias }
}
```

**Example (GOOD):**
```typescript
// Symbol-based — resolves through aliases
const symbol = typeNode.getType().getSymbol()
const resolvedName = symbol?.getName() ?? typeNode.getText()
if (resolvedName === 'MyInterface') {
  // Matches regardless of import alias
}
```

**Detection:** In ts-morph code, flag `.getText()` or `.getName()` used directly on AST nodes for type identity comparison without first resolving through `.getType().getSymbol()`. Especially suspicious when similar code in the same feature already uses symbol-based resolution.

---

## RFC-011: Numeric Input Edge Case Testing

**Source:** PR #251 (CodeRabbit)

**Pattern:** Functions accepting numeric input are tested for valid cases but miss critical edge cases: NaN, Infinity, -Infinity, negative, zero, fractional, and boundary values.

**Example (BAD):**
```typescript
describe('line number validation', () => {
  it('accepts valid line number', () => {
    expect(validate({ lineNumber: 42 })).toBe(true)
  })
  // No tests for: NaN, Infinity, negative, zero, fractional
})
```

**Example (GOOD):**
```typescript
describe('line number validation', () => {
  it('accepts valid line number', () => {
    expect(validate({ lineNumber: 42 })).toBe(true)
  })

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['negative Infinity', -Infinity],
    ['negative', -1],
    ['zero', 0],
    ['fractional', 3.14],
  ])('rejects %s', (_label, value) => {
    expect(validate({ lineNumber: value })).toBe(false)
  })

  it('accepts MAX_SAFE_INTEGER', () => {
    expect(validate({ lineNumber: Number.MAX_SAFE_INTEGER })).toBe(true)
  })
})
```

**Detection:** For functions accepting numeric inputs (especially integers, counts, indices, line numbers), verify tests cover: NaN, Infinity, -Infinity, 0, negative values, fractional values, and boundary values (MAX_SAFE_INTEGER if relevant).

---

## RFC-012: Whitespace-Only String Validation

**Source:** PR #251 (CodeRabbit)

**Pattern:** Required string fields check for presence (`if (!value)`) but don't reject whitespace-only values (`"   "`). This creates invalid data that passes validation.

**Example (BAD):**
```typescript
function validateRoute(route: string | undefined): boolean {
  if (!route) return false  // Passes for "   "
  return true
}
```

**Example (GOOD):**
```typescript
function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0
}

function validateRoute(route: string | undefined): boolean {
  if (isBlank(route)) return false  // Rejects "   "
  return true
}
```

**Detection:** For required string inputs, verify:
1. Validation rejects whitespace-only values (not just empty/undefined)
2. Tests cover the whitespace-only case explicitly
3. Values are trimmed before use

---

## RFC-013: Success-Path Tests for Mapper Functions

**Source:** PR #251 (CodeRabbit)

**Pattern:** Mapper/transformer functions achieve 100% coverage via error-path tests but lack assertions on actual output values for success cases.

**Example (BAD):**
```typescript
describe('buildDomainInput', () => {
  it('throws for missing route', () => {
    expect(() => buildDomainInput({ type: 'UI' })).toThrow()
  })
  it('throws for invalid type', () => {
    expect(() => buildDomainInput({ type: 'INVALID' })).toThrow()
  })
  // 100% coverage but no test verifies output shape!
})
```

**Example (GOOD):**
```typescript
describe('buildDomainInput', () => {
  it('maps valid UI input with trimmed route', () => {
    const result = buildDomainInput({ type: 'UI', route: '  /home  ' })
    expect(result.type).toBe('UI')
    expect(result.input).toMatchObject({ route: '/home' })  // Verifies trimming
  })

  it('throws for missing route', () => {
    expect(() => buildDomainInput({ type: 'UI' })).toThrow()
  })
})
```

**Detection:** For mapper/transformer functions, verify at least one test asserts on the output shape and values for a success case, not just error cases.

---

## RFC-014: Systematic TS-008 Edge Case Verification

**Source:** PR #251 (Post-merge reflection)

**Pattern:** Tests exist but don't systematically cover TS-008 edge cases for each parameter type. Code review misses these gaps because coverage appears adequate.

**Detection process:**
1. Identify each function parameter and its type
2. Map type to TS-008 checklist (numbers → numeric checklist, strings → string checklist, etc.)
3. Verify tests exist for at least the critical items from each relevant checklist
4. Flag when entire edge case categories are missing

**Critical items per type:**
- **Numbers:** NaN, Infinity, 0, negative, fractional
- **Strings:** empty, whitespace-only, very long
- **Collections:** empty, single item, duplicates
- **Dates:** invalid dates, timezone edge cases

---

## RFC-015: Zod Read-Modify-Write Must Preserve Unknown Properties

**Source:** PR #251 (Post-merge reflection)

**Pattern:** Using Zod schemas to parse existing data for modification can strip unknown properties. When re-writing the data, this silently removes fields that weren't in the schema.

**Example (BAD):**
```typescript
const schema = z.object({ name: z.string(), count: z.number() })

// Read existing data
const data = JSON.parse(fs.readFileSync('config.json', 'utf-8'))
const parsed = schema.parse(data)  // Strips unknown fields!

// Modify
parsed.count += 1

// Write back - unknown fields are lost!
fs.writeFileSync('config.json', JSON.stringify(parsed))
```

**Example (GOOD):**
```typescript
const schema = z.object({ name: z.string(), count: z.number() }).passthrough()

// Or: don't use Zod for the full round-trip
const data = JSON.parse(fs.readFileSync('config.json', 'utf-8'))
const validated = schema.parse(data)  // Validate only
data.count += 1  // Modify original
fs.writeFileSync('config.json', JSON.stringify(data))
```

**Detection:** When Zod is used in a read-modify-write pattern (parse existing data, modify, write back), verify the schema uses `.passthrough()` or that the original data object is modified, not the parsed result.

---

## RFC-016: Mock Cleanup After vi.spyOn

**Source:** PR #252 (CodeRabbit)

**Pattern:** Test files use `vi.spyOn` to mock functions but don't restore mocks in `afterEach`, causing mock state to leak between tests. This leads to flaky tests and false positives/negatives.

**Example (BAD):**
```typescript
describe('connection detection', () => {
  it('logs timing info', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    detectConnections(input)
    expect(console.log).toHaveBeenCalled()
  })

  it('runs without logging', () => {
    // console.log is STILL mocked from previous test!
    detectConnections(input)
  })
})
```

**Example (GOOD):**
```typescript
describe('connection detection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs timing info', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    detectConnections(input)
    expect(console.log).toHaveBeenCalled()
  })

  it('runs without logging', () => {
    // console.log is properly restored
    detectConnections(input)
  })
})
```

**Detection:** Any test file using `vi.spyOn` must have `afterEach(() => { vi.restoreAllMocks() })` in the same `describe` block or a parent `describe` block. Flag files with `vi.spyOn` but no `vi.restoreAllMocks` in an `afterEach`.

---

## RFC-017: Structured Format Parsing Must Handle All Documented Variants

**Source:** PR #259 (CodeRabbit)

**Pattern:** When parsing output from external tools (git, npm, APIs), implementation only handles the common format variants and misses edge cases documented in the tool's specification.

**Example (BAD):**
```typescript
// Git --name-status output: only handles M (modified) and D (deleted)
// Misses R (rename), C (copy) which have TWO tab-separated paths: R100\told.ts\tnew.ts
function parseDiffNameStatus(raw: string): DiffFileEntry[] {
  return raw.split('\n').filter(Boolean).map((line) => {
    const [status, ...pathParts] = line.split('\t')
    const path = pathParts.join('\t')  // BUG: concatenates old\tnew for renames
    return { path, deleted: status === 'D' }
  })
}
```

**Example (GOOD):**
```typescript
// Handles all git status codes: M, A, D, R (rename), C (copy), T, U, X, B
function parseDiffNameStatus(raw: string): DiffFileEntry[] {
  return raw.split('\n').filter(Boolean).map((line) => {
    const [status, ...pathParts] = line.split('\t')
    const path = pathParts.at(-1)  // Last path = destination for R/C, sole path for others
    if (!status || !path) {
      throw new GitError(`Unexpected diff --name-status line: "${line}"`)
    }
    return { path, deleted: status === 'D' }
  })
}
```

**Detection:** When code parses structured output from external tools:
1. Identify the external tool and the specific output format being parsed
2. Check the tool's documentation for all format variants (not just common ones)
3. Verify the parser handles each documented variant
4. For git specifically: always test R (rename) and C (copy) status lines alongside M/A/D

---

## Adding New Checks

When external review feedback reveals a pattern:

1. Create a new section with ID `RFC-NNN`
2. Document: Source PR, Pattern, Bad/Good examples, Detection guidance
3. Bug-scanner will apply the check to future PRs
