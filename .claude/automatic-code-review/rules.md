# Automatic code review

Ensure modified code complies with our project conventions. Be ultra critical.

First read lint rules to ensure feedback doesn't contradict them: @/eslint.config.mjs Don't force the user to change code when there is no other solution that will satisfy the lint rules.

## Architecture, modularity check

Check all production code files (not test files) against the following conventions:

Read @/docs/architecture/overview.md
Read @/docs/conventions/codebase-structure.md

Ensure that all code is in the correct place and aligns with boundaries and layering requirements.

```plaintext
Architecture or modularity violation: [title of violation]
Relevant convention: [reference rule]
Affected Code: [show code and line number]
Suggested Fix: [suggested fix (if any)]
Optional?: [Is it mandatory to fix this problem or is there room for debate?]
```

## Coding Standards

Check all production code files (not test files) against the following conventions:

Read @/docs/conventions/software-design.md
Read @/docs/conventions/standard-patterns.md

Report any errors or improvement opportunities in the format:

```plaintext
Coding Standards Violation or improvement opportunity: [title of violation]
Relevant convention: [reference rule]
Affected Code: [show code and line number]
Suggested Fix: [suggested fix (if any)]
Optional?: [Is it mandatory to fix this problem or is there room for debate?]
```

## Testing Standards

Check all test files (not production code) against the following conventions:

Read: @/docs/conventions/testing.md
- tests should not contain code comments ever - they're banned. Hard fail, not optional.

Report any errors in the format:

```plaintext
Testing Standards Violation: [title of violation]
Rule Violated: [reference rule]
Relevant Code: [show code and line number]
Suggested Fix: [suggested fix (if any)]
Optional?: [Is it mandatory to fix this problem or is there room for debate?]
```

## No Dangerous Fallback Values

Pay extra special attention to dangerous fallback values that hide bugs. Claude Code loves setting default fallbacks

❌ **Forbidden:**
- `value ?? 'default'` (without clear reason)
- `value || 'fallback'` (same)
- Guessing at defaults when value should be required

✅ **Allowed:**
- Optional parameters with documented defaults
- Configuration with explicit optional semantics
- Test data with placeholder values

**Examples:**

```typescript
const nodeType = config.nodeType ?? 'sync'

const radius = calculateRadius(node) ?? 15

validateSchema(data).catch(() => {})
```

**Why:** If a value is required, make it required. Don't hide missing data.
