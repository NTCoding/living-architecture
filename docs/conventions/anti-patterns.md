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

## Sacrificing Readability for File Length Limits

🚨 **Never sacrifice readability to satisfy linting rules or file length limits.**

### ❌ Bad

```typescript
// Cramming object properties onto fewer lines
{ type: 'API', name: 'List Orders', module: 'api', filePath: 'src/api/orders.ts',
  extraArgs: ['--api-type', 'REST'], expectedId: 'orders:api:api:list-orders' }

// Removing whitespace or collapsing structure
const result = items.map(x => ({ id: x.id, name: x.name, value: x.value })).filter(x => x.value > 0);
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
- Look for duplicated code - extract into shared modules (often the real cause of bloat)
- Extract duplicated test fixtures or setup code into shared fixtures
- Use `it.each` or `describe.each` for parameterized tests
- Split the file into multiple focused files

---

## Exceptions

Only when 100% unavoidable (e.g., third-party library limitations):

```typescript
// ANTI-PATTERN EXCEPTION: String-Based Error Detection
// Justification: Library X doesn't expose typed errors
// Tracking: Issue #123 / requested upstream fix
if (error.message.includes('...')) { ... }
```
