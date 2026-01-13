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

1. Open Claude Code (or other) in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-1-understand.md and follow the instructions
   ```
3. Claude analyzes your codebase and creates `.riviere/config/metadata.md`
4. Review the domains Claude identified. Give corrections if needed.
5. Close this Claude session

### Step 2: Define

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-2-define-components.md and follow the instructions
   ```
3. Claude creates extraction rules in `.riviere/config/component-definitions.md`
4. Review the rules. Give corrections if needed.
5. Close this Claude session

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

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-4-link.md and follow the instructions
   ```
3. Claude traces flows between components and creates links
4. Review the links
5. Close this Claude session

### Step 5: Enrich

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-5-enrich.md and follow the instructions
   ```
3. Claude adds state changes and business rules to DomainOp components
4. Review the enrichments
5. Close this Claude session

### Step 6: Validate

1. Open a new Claude Code (or other) session in your project directory
2. Type:
   ```text
   Fetch https://raw.githubusercontent.com/NTCoding/living-architecture/main/packages/riviere-cli/docs/workflow/step-6-validate.md and follow the instructions
   ```
3. Claude checks for orphans and validates the graph
4. Fix any issues
5. Your graph is complete at `.riviere/graph.json`

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
