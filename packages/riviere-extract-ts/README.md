# @living-architecture/riviere-extract-ts

TypeScript extractor for detecting architectural components from source code.

## Overview

Extracts architectural components from TypeScript code using deterministic, config-driven detection rules. Uses ts-morph for AST parsing to identify components based on decorators, JSDoc tags, inheritance, interfaces, and naming patterns.

**Current Status:** Skeleton implementation. Predicate logic and output generation coming in subsequent tasks (see PRD phase-10-typescript-extraction).

## Installation

```bash
npm install @living-architecture/riviere-extract-ts
```

## Usage

```typescript
import { extractComponents } from '@living-architecture/riviere-extract-ts'
import type { ExtractionConfig } from '@living-architecture/riviere-extract-config'

const config: ExtractionConfig = {
  modules: [
    {
      path: 'src/**/*.ts',
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
pnpm nx test riviere-extract-ts

# Build
pnpm nx build riviere-extract-ts
```

## Related Packages

- **@living-architecture/riviere-extract-config** - Config schema and validation
- **@living-architecture/riviere-extract-conventions** - Decorators for marking components

## License

Apache 2.0
