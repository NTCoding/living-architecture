# PRD: Phase 10 — TypeScript Extraction

**Status:** Draft

**Depends on:** Phase 9 (Launch)

---

## 1. Problem

Currently, architecture extraction requires AI-assisted manual work using the CLI. We need automated extraction that can:

- Parse TypeScript codebases to identify architectural components
- Automatically detect APIs, use cases, domain operations, events, and handlers
- Generate Rivière graphs with 100% accuracy (no missed components)
- Reduce extraction time from hours to minutes

The project vision states "Extract software architecture from code as living documentation" — this phase delivers on that promise.

---

## 2. Design Principles

1. **Decorator-first for reliability** — Explicit decorators on classes/methods guarantee accurate extraction. Convention-based detection is fallback, not default.

2. **Enforcement over detection** — ESLint rules ensure every component is annotated. If it compiles and lints, the graph is complete.

3. **Standard library with customization** — Provide default decorators, allow teams to map their own conventions.

4. **Match Rivière schema exactly** — All 7 component types: UI, API, UseCase, DomainOp, Event, EventHandler, Custom.

5. **Simple but effective** — Start with decorators that work. Add sophistication later.

---

## 3. What We're Building

### Package Structure

| Package | Purpose | Contains |
|---------|---------|----------|
| `@living-architecture/riviere-conventions` | Define and enforce architectural conventions | Decorators, JSDoc patterns, ESLint plugin |
| `@living-architecture/riviere-extract` | Extract architecture from annotated code | CLI, programmatic API |

**Why two packages?**
- **Conventions** = what teams adopt (decorators + enforcement go together)
- **Extract** = what produces the graph (depends on conventions being followed)
- A team wouldn't use decorators without ESLint enforcement, so bundling makes sense
- Naming reflects the goal (conventions, extract) not the syntax (decorators, ESLint)

### Decorators Library

Single type-safe decorator for all component types:

```typescript
type ComponentType = 'UI' | 'API' | 'UseCase' | 'DomainOp' | 'Event' | 'EventHandler' | 'Custom';

// Class-level decorator with type-safe first argument
@ArchitectureComponent('UI', { route: '/checkout' })
class CheckoutPage { ... }

@ArchitectureComponent('API', { method: 'POST', path: '/orders' })
class OrderController { ... }

@ArchitectureComponent('UseCase')
class PlaceOrderUseCase { ... }

@ArchitectureComponent('DomainOp')  // entity/operation inferred from class/method
class Order {
  place() { ... }
}

@ArchitectureComponent('Event', { name: 'OrderPlaced' })
class OrderPlacedEvent { ... }

@ArchitectureComponent('EventHandler', { subscribes: ['OrderPlaced'] })
class ShippingHandler { ... }

@ArchitectureComponent('Custom', { customType: 'MessageQueue' })
class OrderQueue { ... }
```

**Design rationale:** Single decorator is simpler to learn and matches the `@Role('Repository')` pattern from the enforcement articles. Type safety prevents invalid component types at compile time.

**Metadata handling:**
- Component type is explicit (first argument)
- Other metadata inferred from code where possible (class name, method names, type parameters)
- Decorator second argument overrides/supplements inferred values

### JSDoc Alternative (for functional codebases)

For teams using functional patterns without classes:

```typescript
/** @riviere UseCase */
export function placeOrder(data: OrderData) { ... }

/** @riviere API { method: 'POST', path: '/orders' } */
export function createOrderHandler(req: Request) { ... }

/** @riviere Event { name: 'OrderPlaced' } */
export const OrderPlaced = createEvent<OrderData>();
```

ESLint rules enforce JSDoc annotations on exported functions.

Decorators are lightweight — they add metadata, don't change runtime behavior.

### Extraction Tool

**CLI Usage:**
```bash
# Extract from current directory
npx @living-architecture/riviere-extract

# With config file
npx @living-architecture/riviere-extract --config riviere.extract.ts

# Output to specific location
npx @living-architecture/riviere-extract --output .riviere/graph.json
```

**Programmatic API:**
```typescript
import { extract } from '@living-architecture/riviere-extract';

const graph = await extract({
  rootDir: './src',
  config: {
    // Custom decorator mappings (optional)
    decorators: {
      API: ['OpenapiRouteHandler', 'Controller'],
      UseCase: ['UseCase', 'ApplicationService'],
    }
  }
});
```

**Config File (riviere.extract.ts):**
```typescript
import { defineConfig } from '@living-architecture/riviere-extract';

export default defineConfig({
  // Directories to scan
  include: ['src/**/*.ts'],
  exclude: ['**/*.spec.ts', '**/*.test.ts'],

  // Domain inference from directory structure
  domainFromPath: 'src/{domain}/**',

  // Decorator mappings (extend or override defaults)
  decorators: {
    API: {
      names: ['OpenapiRouteHandler', 'Controller', 'Get', 'Post'],
      fields: {
        method: 'method',
        path: 'path',
      }
    },
    DomainOp: {
      names: ['Aggregate', 'DomainService'],
      fields: {
        entity: 'entity',
        operation: fromMethodName(),
      }
    }
  },

  // For teams that can't add decorators (fallback)
  conventions: {
    Repository: { suffix: 'Repository' },
    UseCase: { directory: '**/use-cases/**' },
  }
});
```

### ESLint Rules (included in riviere-conventions)

**Rules:**

| Rule | Description |
|------|-------------|
| `riviere-conventions/require-component-annotation` | Every class must have `@ArchitectureComponent` decorator |
| `riviere-conventions/require-function-annotation` | Exported functions must have `@riviere` JSDoc tag |
| `riviere-conventions/valid-component-type` | Component type must be valid (UI, API, UseCase, etc.) |
| `riviere-conventions/require-event-subscription` | EventHandler must specify subscribed events |
| `riviere-conventions/require-api-metadata` | API components must include method and path |

**ESLint Config:**
```javascript
// eslint.config.js
import riviereConventions from '@living-architecture/riviere-conventions/eslint';

export default [
  riviereConventions.configs.recommended,
  {
    rules: {
      'riviere-conventions/require-component-annotation': 'error',
      'riviere-conventions/require-function-annotation': 'error',
    }
  }
];
```

**IDE Feedback (classes):**
```
error: Class "OrderRepository" must have an @ArchitectureComponent decorator.
       Valid types: UI, API, UseCase, DomainOp, Event, EventHandler, Custom
```

**IDE Feedback (functions):**
```
error: Exported function "createOrder" must have a @riviere JSDoc annotation.
       Example: /** @riviere UseCase */
```

### How Detection Works

**Phase 1: Decorator Scan**
1. Parse all TypeScript files with ts-morph
2. Find all classes/methods with Rivière decorators
3. Extract metadata from decorator arguments
4. Build component nodes

**Phase 2: Flow Linking**
1. For each component, analyze method bodies
2. Find calls to other decorated components
3. Create edges (source → target)

**Phase 3: Semantic Linking**
1. Match Events to EventHandlers by event name
2. Resolve cross-file references

**Phase 4: Graph Assembly**
1. Infer domains from file paths or decorator metadata
2. Generate component IDs
3. Produce Rivière-compatible JSON

### Output

Standard Rivière graph JSON, compatible with:
- `@living-architecture/riviere-query` for analysis
- Éclair for visualization
- `riviere builder resume` for manual enrichment

---

## 4. What We're NOT Building

- **Other language support** — TypeScript only. Java, Python, Go are future phases.
- **Real-time extraction** — On-demand CLI, not file watcher.
- **IDE plugins** — ESLint provides IDE feedback. No custom VS Code extension.
- **Automatic enrichment** — Extraction finds components and links. Business rules and state changes still require manual enrichment via builder.

---

## 5. Success Criteria

**Accuracy:**
- [ ] With ESLint enforcement enabled, extraction is 100% complete
- [ ] No false positives (every node is a real component)
- [ ] No false negatives (every decorated component appears in graph)

**Usability:**
- [ ] Can extract ecommerce-demo-app automatically
- [ ] Extraction completes in <30 seconds for medium codebase
- [ ] Clear error messages when decorator metadata is invalid

**Integration:**
- [ ] Output is valid Rivière graph (passes schema validation)
- [ ] Graph loads in Éclair
- [ ] Can pipe into `riviere builder resume` for enrichment

**Developer Experience:**
- [ ] ESLint errors appear in IDE immediately
- [ ] `npx @living-architecture/riviere-extract` works with zero config
- [ ] Config file allows full customization

---

## 6. Resolved Questions

1. **Detection approach** — Decorator-first with ESLint enforcement. Conventions as fallback for legacy codebases.
2. **Entry point** — Standalone package (`@living-architecture/riviere-extract`), not built into CLI.
3. **Model elements** — Full Rivière schema parity from day one.
4. **Decorator library** — Provide standard decorators, allow custom mappings.
5. **JSDoc support** — Yes, support both decorators (for classes) and JSDoc annotations (for functional codebases).
6. **Incremental extraction** — Full extraction only for v1. Optimize later if performance becomes an issue.
7. **Monorepo support** — Single unified graph for v1. Per-package approach viable after Phase 11 (Graph Merging).
8. **Decorator API** — Single `@ArchitectureComponent(type, metadata?)` decorator with type-safe first argument. Not separate per-type decorators.
9. **Metadata inference** — Component type is explicit in decorator. Other metadata (entity, operation, etc.) inferred from code where possible, provided in decorator where needed.
10. **CI integration** — Defer to later phase. Focus on core extraction for Phase 10.

---

## 7. Open Questions

None — all questions resolved.

---

## 8. Milestones

### M1: Conventions package exists

Package with decorators, JSDoc patterns, and ESLint enforcement.

#### Deliverables
- **D1.1:** Package `@living-architecture/riviere-conventions` created
  - Single `@ArchitectureComponent(type, metadata?)` decorator
  - Type-safe: first argument constrained to valid component types
  - Acceptance: Decorator compiles and can be applied to classes
  - Verification: Unit tests for decorator metadata extraction

- **D1.2:** JSDoc pattern support
  - `@riviere <type> [metadata]` tag format
  - Works with exported functions and const declarations
  - Acceptance: JSDoc annotations parseable
  - Verification: Unit tests for JSDoc parsing

- **D1.3:** ESLint plugin included
  - `require-component-annotation` rule for classes
  - `require-function-annotation` rule for exported functions
  - `valid-component-type` rule
  - Exportable via `@living-architecture/riviere-conventions/eslint`
  - Acceptance: Unannotated classes and functions produce lint errors
  - Verification: Test with codebase missing annotations

- **D1.4:** IDE feedback works
  - Errors appear in VS Code for both decorators and JSDoc
  - Acceptance: Red squiggles on missing annotations
  - Verification: Manual IDE test

- **D1.5:** Validated on ecommerce-demo-app (multi-strategy)
  - Add `@living-architecture/riviere-conventions` to demo app
  - Each domain uses a different annotation strategy to validate all approaches:

  | Domain | Strategy | Purpose |
  |--------|----------|---------|
  | `orders` | Decorators only | Validates `@ArchitectureComponent()` decorator path |
  | `shipping` | JSDoc only | Validates `@riviere` JSDoc path for functional code |
  | `inventory` | DSL/config (existing decorators) | Validates custom decorator mapping via config |
  | `payments` | Mixed | Validates decorators + JSDoc coexistence |
  | `notifications` | TBD | Additional coverage as needed |

  - Enable ESLint enforcement with per-domain config overrides
  - Acceptance: All domains annotated, lint passes, all strategies work
  - Verification: `nx lint ecommerce-demo-app` succeeds
  - Note: This validates all convention approaches before building extraction

- **D1.6:** Documentation
  - Usage examples for decorator and JSDoc patterns
  - ESLint configuration guide
  - Metadata schema documented for each component type
  - Acceptance: Developer can adopt conventions from docs
  - Verification: Review docs

---

### M2: Basic extraction works

Extract annotated classes and functions into Rivière graph.

#### Deliverables
- **D2.1:** Package `@living-architecture/riviere-extract` created
  - CLI entry point: `npx @living-architecture/riviere-extract`
  - Scans for decorated classes and JSDoc-annotated functions
  - Outputs graph.json
  - Acceptance: Extracts components from ecommerce-demo-app
  - Verification: Compare with manually-extracted graph

- **D2.2:** Annotation metadata extraction
  - Extract all fields from decorator arguments and JSDoc metadata
  - Acceptance: API method/path, Event name, etc. all captured
  - Verification: Verify graph content matches annotations

- **D2.3:** Domain inference
  - Infer domain from file path
  - Acceptance: Components grouped by domain
  - Verification: Check domain assignment

---

### M3: Flow linking works

Detect which components call which other components.

#### Deliverables
- **D3.1:** Syntactic linking
  - Analyze method bodies for calls to other annotated components
  - Acceptance: API → UseCase → DomainOp chains detected
  - Verification: Verify edges in graph

- **D3.2:** Semantic linking
  - Match Event → EventHandler by event name
  - Acceptance: Cross-domain event flows detected
  - Verification: Verify event handler edges

- **D3.3:** Cross-file resolution
  - Resolve imports to find target components
  - Acceptance: Links work across file boundaries
  - Verification: Test with multi-file codebase

---

### M4: Config file supports customization

Teams can map their own decorators and conventions.

#### Deliverables
- **D4.1:** Config file format defined
  - `riviere.extract.ts` with type-safe config
  - Acceptance: Config file loads and applies
  - Verification: Test with custom config

- **D4.2:** Custom decorator mappings
  - Map existing decorators to Rivière types
  - Acceptance: Legacy codebases work without changing decorators
  - Verification: Test with non-standard decorator names

- **D4.3:** Convention-based fallback
  - Detect by suffix, directory, inheritance
  - Acceptance: Works for teams that can't add annotations
  - Verification: Test convention detection

---

### M5: Integration with existing tools

Extracted graphs work with query, builder, and Éclair.

#### Deliverables
- **D5.1:** Schema validation
  - Output passes Rivière schema validation
  - Acceptance: `RiviereQuery` can load extracted graph
  - Verification: Query tests pass

- **D5.2:** Éclair visualization
  - Extracted graph renders correctly
  - Acceptance: All components and flows visible
  - Verification: Load in Éclair, visual review

- **D5.3:** Builder resume
  - Can enrich extracted graph with business rules
  - Acceptance: `builder.resume(extractedGraph)` works
  - Verification: Add enrichment, verify persists

---

### M6: Documentation

Guides for adopting conventions and extraction.

#### Deliverables
- **D6.1:** Getting started guide
  - Install conventions package, add annotations, run extraction
  - Acceptance: New user can extract first graph
  - Verification: Follow guide on fresh codebase

- **D6.2:** Migration guide
  - How to add annotations to existing codebase
  - AI-assisted annotation suggestions
  - Acceptance: Clear steps for legacy codebases
  - Verification: Review content

- **D6.3:** API reference
  - All decorators, JSDoc patterns, ESLint rules, config options, CLI flags
  - Acceptance: Complete reference
  - Verification: TypeDoc generates

---

## 9. Reference

### Inspiration

- **sequence-mapper** (`/Users/nicktune/code/employee-management/tools/sequence-mapper`) — DSL-based extraction with ts-morph, detection strategies, field extractors
- **Articles:**
  - "Defining a DSL for Extracting Software Architecture as Living Documentation"
  - "Enforcing Software Architecture Living Documentation Conventions"

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AST parser | ts-morph | TypeScript-native, full type information |
| Detection | Decorators + ESLint | Guarantees accuracy over heuristics |
| Config format | TypeScript file | Type-safe, IDE autocomplete |
| Output | Rivière JSON | Consistent with existing tooling |

---

## 10. Dependencies

**Depends on:**
- Phase 9 (Launch) — Need stable packages and schema

**Blocks:**
- Future language extractors (Java, Python, Go)
- CI integration features
