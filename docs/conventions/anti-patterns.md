# Anti-Patterns

Banned patterns. Exceptions require documented justification.

---

## String-Based Error Detection

🚨 **Never parse error message strings to determine error types.**

### ❌ Bad

```typescript
if (error.message.startsWith("Custom type '") && error.message.includes('not defined')) {
  // Handle missing custom type
}
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

## Exceptions

When unavoidable (e.g., third-party library limitations):

```typescript
// ANTI-PATTERN EXCEPTION: String-Based Error Detection
// Justification: Library X doesn't expose typed errors
// Tracking: Issue #123 / requested upstream fix
if (error.message.includes('...')) { ... }
```
