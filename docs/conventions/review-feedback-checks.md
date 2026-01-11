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

## Adding New Checks

When external review feedback reveals a pattern:

1. Create a new section with ID `RFC-NNN`
2. Document: Source PR, Pattern, Bad/Good examples, Detection guidance
3. Bug-scanner will apply the check to future PRs
