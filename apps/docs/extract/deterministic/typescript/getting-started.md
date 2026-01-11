# Getting Started with TypeScript Extraction

Extract architecture from TypeScript code in 10 minutes using decorators and config-driven detection.

## Prerequisites

**Requirements:**
- Node.js 24+
- TypeScript 5.0+ (for decorator support)

**Install the CLI and conventions package:**

```bash
npm install --save-dev @living-architecture/riviere-cli @living-architecture/riviere-extract-conventions
```

## Step 1: Annotate Your Code

Add decorators to mark architectural components.

**Container decorator** — all public methods become components:

```typescript
import { APIContainer } from '@living-architecture/riviere-extract-conventions'

@APIContainer
class OrderController {
  async createOrder(req: Request): Promise<Order> {
    // Extracted as: api "createOrder"
  }

  async getOrder(id: string): Promise<Order> {
    // Extracted as: api "getOrder"
  }
}
```

**Class decorator** — the class itself is the component:

```typescript
import { UseCase } from '@living-architecture/riviere-extract-conventions'

@UseCase
class PlaceOrderUseCase {
  // Extracted as: useCase "PlaceOrderUseCase"
  execute(command: PlaceOrderCommand): Order {
    // ...
  }
}
```

[See all decorators →](/extract/deterministic/typescript/decorators)

## Step 2: Run Extraction

The conventions package includes a ready-to-use extraction config that detects all decorator types. No config file needed — reference it directly:

```bash
npx riviere extract \
  --config node_modules/@living-architecture/riviere-extract-conventions/src/default-extraction.config.json
```

**Output (draft components JSON):**

```json
{
  "success": true,
  "data": [
    {
      "type": "api",
      "name": "createOrder",
      "location": {
        "file": "src/api/OrderController.ts",
        "line": 5
      },
      "domain": "default"
    },
    {
      "type": "api",
      "name": "getOrder",
      "location": {
        "file": "src/api/OrderController.ts",
        "line": 10
      },
      "domain": "default"
    },
    {
      "type": "useCase",
      "name": "PlaceOrderUseCase",
      "location": {
        "file": "src/usecases/PlaceOrderUseCase.ts",
        "line": 3
      },
      "domain": "default"
    }
  ],
  "warnings": []
}
```

The `domain` field comes from the module `name` in your config. The default config uses "default" as the module name — customize it to use domain-specific names like "orders" or "shipping" (see [Customize Your Config](#customize-your-config) below).

## Step 3: Verify Results

Use `--dry-run` for a quick summary:

```bash
npx riviere extract \
  --config node_modules/@living-architecture/riviere-extract-conventions/src/default-extraction.config.json \
  --dry-run
```

**Output:**

```text
default: api(2), useCase(1), domainOp(0), event(0), eventHandler(0), ui(0)
Total: 3 components
```

## Next Steps

### Customize Your Config

The default config works for single-module projects using Rivière decorators. **Customization is only required** for:
- Multi-module projects with separate domains (orders, shipping, etc.)
- Projects using framework decorators (NestJS, custom patterns)
- Projects with non-standard component detection rules

#### Using `extends` for Multi-Module Projects

The simplest way to add multiple modules is with `extends`. Inherit all detection rules from the conventions package and just specify module names and paths:

```yaml
modules:
  - name: "orders"
    path: "src/orders/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"

  - name: "shipping"
    path: "src/shipping/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"

  - name: "inventory"
    path: "src/inventory/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"
```

Override specific rules when needed:

```yaml
modules:
  - name: "orders"
    path: "src/orders/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"
    event: { notUsed: true }  # Override: no events in this module
```

#### Full Custom Config

For complete control, define all component rules explicitly. Configs can be **JSON or YAML** — the CLI accepts both.

```yaml
modules:
  - name: "orders"
    path: "src/orders/**/*.ts"
    api:
      find: "methods"
      where:
        inClassWith:
          hasDecorator:
            name: "APIContainer"
            from: "@living-architecture/riviere-extract-conventions"
    useCase:
      find: "classes"
      where:
        hasDecorator:
          name: "UseCase"
          from: "@living-architecture/riviere-extract-conventions"
    domainOp: { notUsed: true }
    event: { notUsed: true }
    eventHandler: { notUsed: true }
    ui: { notUsed: true }
```

[See Examples →](/extract/deterministic/typescript/examples)

### Enable Enforcement

Add ESLint enforcement to ensure all classes have decorators:

[Enforcement Guide →](/extract/deterministic/typescript/enforcement)

### Build the Full Graph

Draft components are a starting point. Use CLI commands to build the complete Rivière graph with connections:

[CLI Reference →](/reference/cli/cli-reference)

## Demo Application

See a complete example in the ecommerce demo app:

[View ecommerce-demo-app →](https://github.com/NTCoding/ecommerce-demo-app/tree/main/.riviere)

## See Also

- [Decorators Reference](/extract/deterministic/typescript/decorators) — All 11 decorators
- [Config Reference](/reference/extraction-config/schema) — Complete DSL specification
- [Examples](/extract/deterministic/typescript/examples) — Real-world configs
