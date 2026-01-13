# Step 3: Extract Components

Find all architectural components using deterministic TypeScript extraction.

::: info Deterministic Extraction
This step uses config-driven detection instead of AI. Components are found by scanning your codebase for patterns defined in your extraction config—decorators, JSDoc tags, naming conventions, or custom patterns.
:::

## Prerequisites

- Node.js 20+
- TypeScript 5.0+
- `.riviere/config/metadata.md` from Step 1
- `.riviere/config/component-definitions.md` from Step 2

**Install the CLI and conventions package:**

```bash
npm install --save-dev @living-architecture/riviere-cli @living-architecture/riviere-extract-conventions
```

## 3.1 Choose Detection Strategy

Select a detection strategy based on your codebase:

| Strategy | Best For | Example Pattern |
|----------|----------|-----------------|
| **Decorators** | New projects, full control | `@UseCase`, `@APIContainer` |
| **JSDoc** | Avoiding runtime decorators | `/** @useCase */` |
| **Naming** | Legacy code, no annotations | `*UseCase`, `*Controller` |
| **Custom** | Framework integration | NestJS, custom patterns |

You can mix strategies across different modules.

## 3.2 Apply Conventions

### Option A: Use Built-in Decorators

Install the conventions package and annotate your code:

```bash
npm install @living-architecture/riviere-extract-conventions
```

**Container decorator** — all public methods become components:

```typescript
import { APIContainer } from '@living-architecture/riviere-extract-conventions'

@APIContainer
class OrderController {
  async createOrder(req: Request): Promise<Order> {
    // Extracted as: api "createOrder"
  }
}
```

**Class decorator** — the class itself is the component:

```typescript
import { UseCase } from '@living-architecture/riviere-extract-conventions'

@UseCase
class PlaceOrderUseCase {
  // Extracted as: useCase "PlaceOrderUseCase"
}
```

[See all decorators →](/reference/extraction-config/decorators)

### Option B: Use JSDoc Tags

No package needed—add JSDoc comments:

```typescript
/**
 * @useCase
 */
function placeOrder(command: PlaceOrderCommand): Order {
  // Extracted as: useCase "placeOrder"
}
```

### Option C: Use Naming Conventions

No annotations needed—detection based on names:

```typescript
class PlaceOrderUseCase {
  // Extracted via nameEndsWith: "UseCase"
}
```

## 3.3 Create Extraction Config

Create `extraction.config.yaml` (or `.json`) in your project root.

### Simple Config (using extends)

Inherit detection rules from the conventions package:

```yaml
modules:
  - name: "orders"
    path: "src/orders/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"

  - name: "shipping"
    path: "src/shipping/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"
```

### Custom Config

Define detection rules explicitly:

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

### Mixed Strategies

Different modules can use different detection:

```yaml
modules:
  # Decorators
  - name: "orders"
    path: "src/orders/**/*.ts"
    extends: "@living-architecture/riviere-extract-conventions"

  # JSDoc
  - name: "shipping"
    path: "src/shipping/**/*.ts"
    useCase:
      find: "functions"
      where:
        hasJSDoc:
          tag: "useCase"

  # Naming conventions
  - name: "inventory"
    path: "src/inventory/**/*.ts"
    useCase:
      find: "classes"
      where:
        nameEndsWith:
          suffix: "UseCase"
```

[See more examples →](/reference/extraction-config/examples)

## 3.4 Run Extraction

Extract components to JSON:

```bash
npx riviere extract --config extraction.config.yaml
```

**Output:**

```json
{
  "success": true,
  "data": [
    {
      "type": "api",
      "name": "createOrder",
      "location": {
        "file": "src/orders/OrderController.ts",
        "line": 8
      },
      "domain": "orders"
    },
    {
      "type": "useCase",
      "name": "PlaceOrderUseCase",
      "location": {
        "file": "src/orders/PlaceOrderUseCase.ts",
        "line": 5
      },
      "domain": "orders"
    }
  ],
  "warnings": []
}
```

## 3.5 Verify Results

Use `--dry-run` for a quick summary without JSON output:

```bash
npx riviere extract --config extraction.config.yaml --dry-run
```

**Output:**

```text
orders: api(3), useCase(2), domainOp(0), event(1), eventHandler(1), ui(0)
shipping: api(2), useCase(1), domainOp(0), event(0), eventHandler(0), ui(0)
Total: 10 components
```

Check for:
- Domains with zero components (missing patterns?)
- Component types with zero instances (correct exclusions?)
- Unexpected counts (too many or too few?)

## 3.6 Add Components to Graph

After verifying extraction, add components to the Rivière graph:

```bash
# Initialize graph with domains
npx riviere builder init \
  --source "https://github.com/your-org/your-repo" \
  --domain '{"name":"orders","description":"Order management","systemType":"domain"}'

# Add extracted components
npx riviere builder add-component \
  --type "API" \
  --domain "orders" \
  --name "createOrder" \
  --repository "https://github.com/your-org/your-repo" \
  --file-path "src/orders/OrderController.ts" \
  --line-number "8"
```

Or use AI to process the extraction output and add components via CLI.

## Troubleshooting

### No components found

**Check patterns match your code:**

```bash
# Test a single pattern
npx riviere extract --config extraction.config.yaml --dry-run
```

If counts are zero, verify:
- `path` glob matches your files
- Decorator/JSDoc/naming patterns match your code
- TypeScript version supports decorators (5.0+)

### Wrong components extracted

Adjust predicates in your config:
- Add `and:` to combine multiple conditions
- Use `not:` to exclude patterns
- Add `inClassWith:` for method-level filtering

[See all predicates →](/reference/extraction-config/predicates)

### Config validation errors

Validate your config against the schema:

```bash
npx riviere extract --config extraction.config.yaml --validate-only
```

## Output

Extraction produces draft components JSON. The graph file (`.riviere/graph.json`) is built in subsequent steps.

## Next Step

After extracting components, proceed to:

**[Step 4: Link →](/extract/deterministic/typescript/workflow/step-4-link)**
