# @living-architecture/riviere-extract-ts-domain-model

TypeScript extractor for detecting architectural components from source code.

The `description` in [package.json](package.json) is the source of truth for this
subdomain's purpose. See the generated
[domain guide](../../../docs/architecture/ddd/domain-guide.md) for its current
aggregates and supported operations.

## Overview

Extracts architectural components from TypeScript code using deterministic, config-driven detection rules. Uses ts-morph for AST parsing to identify components based on decorators, JSDoc tags, inheritance, interfaces, and naming patterns.

**Current Status:** Skeleton implementation. Predicate logic and output generation coming in subsequent tasks (see PRD phase-10-typescript-extraction).

## Installation

```bash
npm install @living-architecture/riviere-extract-ts-domain-model
```

## Usage

```typescript
import { extractComponents } from '@living-architecture/riviere-extract-ts-domain-model'
import type { ExtractionConfig } from '@living-architecture/riviere-extract-config-published-language'

const config: ExtractionConfig = {
  modules: [
    {
      name: 'users',
      path: '.',
      glob: 'src/**/*.ts',
      api: {
        find: 'methods',
        where: { hasDecorator: { name: 'Get' } },
      },
      useCase: { notUsed: true },
      domainOp: { notUsed: true },
      event: { notUsed: true },
      eventHandler: { notUsed: true },
      ui: { notUsed: true },
    },
  ],
}

const sourceFiles = ['src/api/users.controller.ts']
const components = extractComponents(sourceFiles, config)

console.log(components)
```

## Output Format

Draft components (before connection detection):

```json
{
  "type": "api",
  "name": "getUserById",
  "location": {
    "file": "src/api/users.controller.ts",
    "line": 42
  },
  "domain": "users"
}
```

## Development

```bash
# Tests (coverage enabled by default)
pnpm nx test riviere-extract-ts-domain-model

# Build
pnpm nx build riviere-extract-ts-domain-model
```

## Related Packages

- **@living-architecture/riviere-extract-config-published-language** - Config schema and validation
- **@living-architecture/riviere-extract-conventions-published-language** - Decorators for marking components

## License

Apache 2.0
