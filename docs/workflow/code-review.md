# Automatic code review

Ensure modified code complies with our project conventions. Be ultra critical.

First read lint rules to ensure feedback doesn't contradict them @/eslint.config.mjs Don't force the user to change code when there is no other solution that will satisfy the lint rules. Example: never suggest using the 'as' or 'let' keywords which are banned.

## Architecture, modularity check

Check all production code files (not test files) against the following conventions:

Read @/docs/architecture/overview.md
Read @/docs/conventions/codebase-structure.md

Ensure that all code is in the correct place and aligns with boundaries and layering requirements. Look at each line of code and ask "What is the purpose of this code? Is it related to other code? Is it highly cohesive? Should it really be here or would it fit better somewhere else?"

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

### Skipping test coverage

Check for `/* v8 ignore next -- @preserve */` which skips test coverage for specific lines of code.

There may be exceptional cases where this is necessary because code is unreachable but is needed to satisfy the compiler. However, in most cases the problem can be solved by extracting code or writing tests to mock behaviour (or a combination of both.). Provide suggestions.

## No Dangerous Fallback Values

Pay extra special attention to dangerous fallback values that hide bugs. Claude Code loves setting default fallbacks.

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

You must provide detailed feedback explaining why you believe the default value is dangerous in the current context and propose a better solution.

## Anti-Patterns

Check production code against @/docs/conventions/anti-patterns.md

```plaintext
Anti-Pattern Violation: [title]
Pattern: [reference from anti-patterns.md]
Code: [show code and line number]
Fix: [what to do instead]
Has Exception Comment?: [Yes/No]
```

Hard failure unless documented exception exists.

## Duplicated code

Claude Code has a very bad habit of duplicating code. If near-identical code is duplicated more than twice then it must be addressed even if it requires touching files not part of the current change set (Claude Code will look for excuses to weasel out - be strict)

Don't spend too long looking across the whole codebase for duplicated code but do look in related files that might contain the same code and do use search patterns that can identify duplication quickly.

## Suggest updates

How can we update our coding conventions, documents and processes to prevent the type of errors you've identified? Provide suggestions if they seem relevant and useful.

## Workflow Reminder

After addressing any issues above, complete the task by following `docs/workflow/task-workflow.md` → Completing Tasks.
