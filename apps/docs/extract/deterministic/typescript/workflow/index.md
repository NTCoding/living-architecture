# TypeScript Extraction Workflow

Extract architecture from TypeScript codebases into a Rivière graph.

::: info Evolving Workflow
This workflow combines AI-assisted and deterministic extraction. Step 3 (Extract) uses deterministic TypeScript tooling. Other steps currently use AI and will be progressively replaced with deterministic tooling in coming releases.
:::

## Workflow Principles

Use deterministic extraction for faster, repeatable, CI-ready results. The TypeScript extractor parses your code via AST—same code always produces the same graph.

Standardizing how architecture components are implemented (decorators, JSDoc tags, naming conventions) simplifies extraction and improves reliability.

## The 6 Steps Overview

| Step | Purpose |
|------|---------|
| **1. Understand** | Identify the domains, systems, and architectural conventions in your codebase |
| **2. Define** | Define the specific rules for identifying architectural components |
| **3. Extract** | Run the TypeScript extractor to find components matching your config |
| **4. Link** | Trace the connections between your components |
| **5. Enrich** | Add business rules and state changes to DomainOp components |
| **6. Validate** | Validate the graph and check for orphan components |

## Prerequisites

Open a terminal in your project directory and install the CLI and conventions package:

```bash
npm install --save-dev @living-architecture/riviere-cli @living-architecture/riviere-extract-conventions
```

Then use `npx riviere ...`

## The 6 Steps

### Step 1: Understand

Follow the AI-assisted workflow for this step. Deterministic tooling is planned for a future release.

**[Step 1: Understand →](/extract/deterministic/typescript/workflow/step-1-understand)**

### Step 2: Define

Follow the AI-assisted workflow for this step. Deterministic tooling is planned for a future release.

**[Step 2: Define →](/extract/deterministic/typescript/workflow/step-2-define)**

### Step 3: Extract (Deterministic)

This step uses the TypeScript extractor instead of AI.

1. **Choose a detection strategy** based on your codebase:

   | Strategy | When to Use |
   |----------|-------------|
   | Decorators | New projects, full control over annotations |
   | JSDoc | Avoid runtime decorators, use comments |
   | Naming | Legacy code, no code changes needed |

2. **Annotate your code** (if using decorators):
   ```typescript
   import { UseCase, APIContainer } from '@living-architecture/riviere-extract-conventions'

   @APIContainer
   class OrderController {
     async createOrder(req: Request): Promise<Order> { }
   }

   @UseCase
   class PlaceOrderUseCase {
     execute(command: PlaceOrderCommand): Order { }
   }
   ```

3. **Create extraction config** (`extraction.config.yaml`):
   ```yaml
   modules:
     - name: "orders"
       path: "src/orders/**/*.ts"
       extends: "@living-architecture/riviere-extract-conventions"

     - name: "shipping"
       path: "src/shipping/**/*.ts"
       extends: "@living-architecture/riviere-extract-conventions"
   ```

4. **Run extraction**:
   ```bash
   npx riviere extract --config extraction.config.yaml
   ```

5. **Verify results**:
   ```bash
   npx riviere extract --config extraction.config.yaml --dry-run
   ```
   Output:
   ```text
   orders: api(3), useCase(2), domainOp(0), event(1), eventHandler(1), ui(0)
   shipping: api(2), useCase(1), domainOp(0), event(0), eventHandler(0), ui(0)
   Total: 10 components
   ```

6. Review the counts. If components are missing, check your config patterns.

[Full Step 3 Reference →](/extract/deterministic/typescript/workflow/step-3-extract)

### Step 4: Link

Follow the AI-assisted workflow for this step. Deterministic tooling is planned for a future release.

**[Step 4: Link →](/extract/deterministic/typescript/workflow/step-4-link)**

### Step 5: Enrich

Follow the AI-assisted workflow for this step. Deterministic tooling is planned for a future release.

**[Step 5: Enrich →](/extract/deterministic/typescript/workflow/step-5-enrich)**

### Step 6: Validate

Follow the AI-assisted workflow for this step. Deterministic tooling is planned for a future release.

**[Step 6: Validate →](/extract/deterministic/typescript/workflow/step-6-validate)**

## Output

After completing all steps, your project will have:

```text
.riviere/
├── config/
│   ├── metadata.md              # Domains and conventions
│   ├── component-definitions.md # Extraction rules
│   └── linking-rules.md         # Cross-domain patterns
└── graph.json                   # The Rivière graph
```

## Catching errors and improving the workflow

If extraction misses components:

1. Check your config patterns match your code
2. Use `--dry-run` to see what's being found
3. Update your extraction config and re-run

**To improve future extractions:**

- **Add enforcement** — Use ESLint to ensure all classes have decorators
  [Enforcement Guide →](/extract/deterministic/typescript/enforcement)
- **Standardize conventions** — Consistent patterns make extraction reliable
- **Integrate into CI** — Run extraction on every commit

## Demo Application

See a complete example with multiple extraction strategies:

[View ecommerce-demo-app →](https://github.com/NTCoding/ecommerce-demo-app)
