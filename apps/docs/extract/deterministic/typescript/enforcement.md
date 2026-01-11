# TypeScript Enforcement with ESLint

Ensure all TypeScript classes have architectural component decorators using ESLint.

## Why Enforcement

Without enforcement, developers might forget decorators on new classes. This causes:

- **False negatives** — Components missing from extraction
- **Incomplete architecture** — Graph doesn't reflect reality
- **Silent failures** — No feedback until extraction runs

ESLint catches missing decorators immediately in the IDE and during CI.

## Installation

Install the conventions package (includes ESLint plugin):

```bash
npm install --save-dev @living-architecture/riviere-extract-conventions
```

## ESLint Configuration

Add the enforcement rule to your ESLint config (flat config format):

```javascript
// eslint.config.mjs
import conventionsPlugin from '@living-architecture/riviere-extract-conventions/eslint-plugin'

export default [
  {
    files: ['src/domain/**/*.ts', 'src/api/**/*.ts'],
    plugins: {
      conventions: conventionsPlugin,
    },
    rules: {
      'conventions/require-component-decorator': 'error',
    },
  },
]
```

## Scoping

Apply enforcement only to architectural code, not tests or utilities:

```javascript
export default [
  // Enforce in domain and API layers
  {
    files: ['src/domain/**/*.ts', 'src/api/**/*.ts'],
    plugins: { conventions: conventionsPlugin },
    rules: { 'conventions/require-component-decorator': 'error' },
  },

  // No enforcement in tests
  {
    files: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    // conventions plugin not loaded
  },
]
```

## Valid Decorators

The rule accepts these decorators as valid:

**Container decorators:**
- `@APIContainer`
- `@DomainOpContainer`
- `@EventHandlerContainer`

**Class-as-component decorators:**
- `@UseCase`
- `@Event`
- `@UI`

**Method-level decorators:**
- `@APIEndpoint`
- `@DomainOp`
- `@EventHandler`

**Other:**
- `@Custom('type')` — Custom component types
- `@Ignore` — Explicitly excluded

## Example Violations

**Before (error):**

```typescript
class OrderController {
  // ❌ ESLint error: Class 'OrderController' must have a component decorator
  async createOrder(req: Request): Promise<Order> {
    // ...
  }
}
```

**After (fixed):**

```typescript
import { APIContainer } from '@living-architecture/riviere-extract-conventions'

@APIContainer
class OrderController {
  // ✓ Valid
  async createOrder(req: Request): Promise<Order> {
    // ...
  }
}
```

## CI Integration

Run ESLint in your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Lint
  run: npm run lint
```

```json
// package.json
{
  "scripts": {
    "lint": "eslint src/"
  }
}
```

## Ignored Elements

The rule ignores:

- **Functions** (top-level functions, not methods)
- **Interfaces**
- **Type aliases**
- **Enums**
- **Anonymous classes**

## Error Messages

```text
Class 'OrderController' must have a component decorator.

Valid decorators:
  - @APIContainer, @DomainOpContainer, @EventHandlerContainer (containers)
  - @UseCase, @Event, @UI (class-as-component)
  - @Custom('type') (custom types)
  - @Ignore (explicit exclusion)

Import from: @living-architecture/riviere-extract-conventions
```

## Enforcement Concept

This is the TypeScript implementation of architectural enforcement. Other languages use different tools:

[Learn about Enforcement Principles →](/extract/deterministic/enforcement)

## See Also

- [Decorators Reference](/extract/deterministic/typescript/decorators) — All 11 decorators
- [Getting Started](/extract/deterministic/typescript/getting-started) — Setup tutorial
- [Enforcement Concept](/extract/deterministic/enforcement) — Language-agnostic principles
