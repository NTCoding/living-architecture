# Enforcement

Deterministic extraction requires architectural conventions. Enforcement ensures code follows those conventions.

## The Extraction-Enforcement Cycle

<div class="cycle-diagram">
  <img src="/extraction-enforcement-cycle.svg" alt="Extraction-Enforcement Cycle: Architecture Definitions guide Codebase, Codebase parsed by Extraction, Extraction validates Enforcement, Enforcement ensures Definitions">
</div>

Enforcement makes extraction reliable. Extraction validates enforcement is working.

## Demo Application

See enforcement in action in the ecommerce demo app:

[View ecommerce-demo-app →](https://github.com/NTCoding/ecommerce-demo-app/tree/main/.riviere)

The demo shows:
- Decorators marking components
- Extraction config detecting them
- ESLint enforcement ensuring coverage

## Why Enforcement Matters

Without enforcement, extraction becomes unreliable:

- **False negatives** — Components missing conventions won't be detected
- **Extraction drift** — New code doesn't match config rules
- **Silent failures** — Missing components go unnoticed until architecture is incomplete

**Enforcement prevents this.** When all code follows conventions, extraction is reliable and complete.

## Enforcement Approaches

### Static Analysis (Linters)

Use linters to enforce conventions at write-time.

**Advantages:**
- Immediate feedback in IDE
- Catches issues before commit
- Low friction for developers

**Examples:**
- ESLint rules requiring decorators (TypeScript)
- ArchUnit tests for package structure (Java)
- Pylint custom checkers (Python)

[TypeScript ESLint Enforcement →](/extract/deterministic/typescript/enforcement)

### Architecture Tests

Write tests that verify architectural conventions.

**Advantages:**
- Explicit validation
- Runs in CI
- Customizable rules

**Examples:**
```typescript
// Verify all classes in domain/ are decorated
test('all domain classes have component decorators', () => {
  const files = glob.sync('src/domain/**/*.ts')
  const violations = findUndecoratedClasses(files)
  expect(violations).toEqual([])
})
```

### CI Gates

Block merges when extraction fails or components are missing.

**Advantages:**
- Prevents drift
- Enforces at team level
- Visible in PR checks

**Example workflow:**
```yaml
- name: Extract Architecture
  run: riviere extract --config extraction.config.yaml
- name: Validate Component Count
  run: |
    COUNT=$(riviere extract --dry-run | grep 'Total:' | awk '{print $2}')
    if [ $COUNT -lt 50 ]; then
      echo "Expected at least 50 components, found $COUNT"
      exit 1
    fi
```

### Code Review

Include extraction validation in code review checklist.

**Advantages:**
- Human judgment
- Catches edge cases
- Educational for team

**Checklist items:**
- New API methods have `@APIEndpoint` decorator
- Domain logic uses `@DomainOp` decorator
- Events extend `DomainEvent` base class

## Language-Specific Implementation

Different languages require different enforcement mechanisms:

| Language | Static Analysis | Architecture Tests | CI Gates |
|----------|----------------|-------------------|----------|
| TypeScript | ESLint | Vitest + ts-morph | ✓ |
| Java | ArchUnit | JUnit + ArchUnit | ✓ |
| Python | Pylint | pytest + ast | ✓ |
| C# | Roslyn Analyzers | xUnit + Roslyn | ✓ |

## TypeScript Example

For TypeScript, we provide an ESLint plugin that enforces component decorators.

[TypeScript Enforcement Guide →](/extract/deterministic/typescript/enforcement)

## See Also

- [Deterministic Extraction Overview](/extract/deterministic/) — How deterministic extraction works
- [TypeScript Enforcement](/extract/deterministic/typescript/enforcement) — ESLint implementation
