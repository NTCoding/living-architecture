# PRD: Phase 11 — Metadata Extraction

**Status:** Draft

**Depends on:** Phase 10 (TypeScript Component Extraction)

---

## 1. Problem

Phase 10 extracts component identity (type, name, location). Draft components lack the metadata required by the Riviere schema:

| Component | Missing Required Fields |
|-----------|------------------------|
| API | `apiType`, `httpMethod`, `path` |
| Event | `eventName` |
| EventHandler | `subscribedEvents` |
| DomainOp | `operationName` |
| UI | `route` |

Without metadata, draft components cannot become valid Riviere graph components. Teams cannot generate accurate architecture visualizations.

Additionally, teams need to understand the architectural impact of pull requests — what components were added, modified, or removed — without extracting the entire codebase.

---

## 2. Design Principles

### Core Extraction Principles

1. **Source of truth extraction** — Extract metadata from where runtime actually uses it. Never duplicate data into annotations that can drift from reality. If runtime reads `Controller.route`, we extract `Controller.route`.

2. **Output matches Riviere schema** — Extracted components align directly with Riviere schema shape. No nested `metadata` object, no translation layer. An extracted API component looks exactly like an `APIComponent` in the schema.

3. **Config must declare all required fields** — If you're extracting APIs, your config must specify how to extract `apiType` (required). If a required field has no extraction rule, config validation fails immediately. No silent gaps.

4. **Fail fast, fail early** — Default behavior is strictest. Missing required fields = extraction failure. Users fix root cause at the source, not downstream. Problems surface at extraction time, not graph assembly time.

5. **Missing fields are data** — When lenient mode is used, missing fields are tracked in a `_missing` array on the component. This is structured data for automation, not just log warnings.

6. **User controls strictness** — Default is strict (fail on missing required). Users can opt into `--allow-incomplete` for incremental adoption or AI-assisted completion workflows.

### Enforcement Principles

1. **Enforcement is mandatory** — Every extraction rule must have a corresponding enforcement mechanism. If we extract `route` from a static property, ESLint enforces that property exists. Convention without enforcement is unreliable.

1. **Compiler over linter** — Prefer TypeScript compiler enforcement (interfaces, abstract classes) over ESLint where possible. Compiler errors are harder to ignore.

1. **One class = one endpoint** — For our recommended conventions, each API/UI component is a single class with static properties. Simplest to extract, simplest to enforce.

### Flexibility Principles

1. **Flexible DSL for diverse codebases** — The extraction config DSL must support multiple metadata sources (properties, decorators, types, file paths) for teams with existing conventions.

1. **Progressive enhancement** — Start with required fields. Optional fields extracted when: (1) extraction rule defined in config, AND (2) source code contains the extractable element.

---

## 2.5 Extraction Pipeline Architecture

### Phase Integration

Phase 10 produces `DraftComponent` objects containing identity only:
- `type` (API, Event, EventHandler, DomainOp, UI, UseCase)
- `name` (component name)
- `sourceLocation` (repository, file path, line number)
- `domain` and `module` (from config)

Phase 11 enriches these with metadata fields required by the Riviere schema.

### Supported Workflows

**1. Single-pass extraction (default)**

```bash
riviere extract --config ./config.yaml
```

Produces fully enriched components in one run. Component detection and metadata extraction happen together.

**2. Two-pass with enrichment**

```bash
# Step 1: Extract components only (draft)
riviere extract --config ./config.yaml --components-only -o draft.json

# Step 2: Enrich with metadata
riviere extract --config ./config.yaml --enrich draft.json -o enriched.json
```

The `--enrich` flag reads draft components from file and applies metadata extraction rules.

**Use cases for two-pass:**
- Incremental adoption — extract components first, add metadata rules gradually
- AI-assisted completion — LLM fills `_missing` fields between passes
- Debugging — isolate component detection from metadata extraction

### Package Locations

| Package | Path | Responsibility |
|---------|------|----------------|
| riviere-schema | `packages/riviere-schema/` | Component type definitions, required fields |
| riviere-extract-config | `packages/riviere-extract-config/` | Config DSL schema, validation |
| riviere-extract-ts | `packages/riviere-extract-ts/` | Extraction implementation |
| riviere-extract-conventions | `packages/riviere-extract-conventions/` | Interfaces, decorators, ESLint rules |
| riviere-cli | `packages/riviere-cli/` | CLI commands (uses Commander.js) |
| ecommerce-demo-app | `github.com/NTCoding/ecommerce-demo-app` | External demo repository |

### Required Fields Source of Truth

Required fields per component type are defined in `packages/riviere-schema/riviere.schema.json`. The JSON Schema's `required` arrays are authoritative.

---

## 3. What We're Building

### 3.1 Extraction Config DSL Extensions

Extend the config schema with an `extract` block per component type. Config validation ensures all required fields have extraction rules.

#### Config Hierarchy: Class vs Method Extraction

**Class-level extraction** (`find: classes`) — Each class becomes one component:

```yaml
api:
  find: classes
  where:
    implementsInterface: APIControllerDef
  extract:
    # Required fields - config validation fails if missing
    apiType:
      literal: REST
    httpMethod:
      fromProperty: { name: method, kind: static }
    path:
      fromProperty: { name: route, kind: static }
    # Optional fields - extracted when available
    operationName:
      fromClassName: { transform: { stripSuffix: Controller } }
```

**Method-level extraction** (`find: methods`) — Each method becomes one component:

```yaml
api:
  find: methods
  where:
    hasDecorator: { name: [Get, Post, Put, Delete] }
  extract:
    apiType:
      literal: REST
    httpMethod:
      fromDecoratorName: { mapping: { Get: GET, Post: POST, Put: PUT, Delete: DELETE } }
    path:
      fromDecoratorArg: { position: 0 }
    operationName:
      fromMethodName: true
```

When `find: methods`, extraction rules access the method's context:
- `fromMethodName` → the method name
- `fromClassName` → the containing class name
- `fromDecoratorArg` → decorators on the method (not the class)

#### `notUsed` Flag

Use `notUsed: true` to suppress config validation for a component type when a module doesn't use that type:

```yaml
modules:
  - name: utilities
    path: src/utils/**
    api:
      notUsed: true  # No APIs in utilities module
    event:
      find: classes
      where: { hasDecorator: Event }
      extract:
        eventName: { fromProperty: { name: type, kind: instance } }
```

#### Config Validation Example

```text
$ riviere extract --config ./config.yaml

Error: [CONFIG_VALIDATION] MISSING_EXTRACTION_RULES
  Module 'orders' defines API detection but missing extraction rules.

  Missing required fields:
    - apiType
    - httpMethod

  Suggestion: Add extraction rules to the 'extract' block:
    api:
      extract:
        apiType: { literal: REST }
        httpMethod: { fromProperty: { name: method, kind: static } }

  Or use 'notUsed: true' if this module has no APIs.
```

### 3.2 Output Format — Matches Riviere Schema

#### Full Output Structure

```json
{
  "version": "1.0.0",
  "extractedAt": "2024-01-15T10:30:00Z",
  "config": "riviere-extract.config.yaml",
  "components": [
    {
      "type": "API",
      "name": "PlaceOrderController",
      "domain": "orders",
      "module": "orders",
      "sourceLocation": {
        "repository": "ecommerce-demo-app",
        "filePath": "orders-domain/src/api/place-order/endpoint.ts",
        "lineNumber": 15
      },
      "apiType": "REST",
      "httpMethod": "POST",
      "path": "/orders"
    }
  ],
  "warnings": []
}
```

Each component matches the Riviere schema directly. No nested `metadata` object, no translation layer.

#### With Missing Fields (Lenient Mode)

When using `--allow-incomplete`, components include a `_missing` array:

```json
{
  "version": "1.0.0",
  "extractedAt": "2024-01-15T10:30:00Z",
  "config": "riviere-extract.config.yaml",
  "components": [
    {
      "type": "API",
      "name": "PlaceOrderController",
      "domain": "orders",
      "module": "orders",
      "sourceLocation": { "..." : "..." },
      "apiType": "REST",
      "_missing": ["httpMethod", "path"]
    }
  ],
  "warnings": [
    "PlaceOrderController: missing required fields httpMethod, path"
  ]
}
```

The `_missing` array is structured data for downstream tooling (AI completion, CI reporting, manual review). It only appears in lenient mode — strict mode fails before producing output.

### 3.3 CLI Behavior

#### Core Flags

```bash
# Default: strict - fail if any required field cannot be extracted
riviere extract --config ./config.yaml

# Lenient: warn and continue, output includes _missing arrays
riviere extract --config ./config.yaml --allow-incomplete

# Components only: skip field extraction (Phase 10 behavior)
riviere extract --config ./config.yaml --components-only

# Enrich: read draft components from file, apply metadata extraction
riviere extract --config ./config.yaml --enrich draft.json -o enriched.json

# Dry run: validate config, report what would be extracted, no output file
riviere extract --config ./config.yaml --dry-run

# Output file (default: stdout)
riviere extract --config ./config.yaml -o components.json
```

#### Exit Codes

| Code | Name | Description |
|------|------|-------------|
| `0` | SUCCESS | All required fields extracted (or dry-run passed) |
| `1` | EXTRACTION_FAILURE | Missing required fields in strict mode |
| `2` | CONFIG_VALIDATION | Config invalid (missing extraction rules, malformed YAML) |
| `3` | RUNTIME_ERROR | File not found, permission denied, invalid regex, git not installed |

#### Error Message Format

All errors follow a standardized format:

```text
Error: [CATEGORY] CODE
  Description of what went wrong.

  Location: file/path:line (if applicable)

  Suggestion: How to fix the issue.
```

Categories: `CONFIG_VALIDATION`, `EXTRACTION_FAILURE`, `GIT_ERROR`, `RUNTIME_ERROR`

### 3.4 Extraction Rules (Closed List)

#### Literal Values Definition

Only these value types can be extracted:
- String literals: `'POST'`, `'/orders'`
- Number literals: `42`, `3.14`
- Boolean literals: `true`, `false`

**NOT extractable:**
- Enum members: `HttpMethod.GET`
- Template literals: `` `/api/${version}` ``
- Function calls: `getRoute()`
- Imported constants: `import { ROUTE } from './constants'`
- Computed values: `route = baseUrl + '/orders'`

When a non-literal is encountered, extraction fails (strict) or adds to `_missing` (lenient) with warning: `"Non-literal value detected at FILE:LINE. Only inline literals supported."`

#### Return Types

| Rule | Returns |
|------|---------|
| `fromClassName` | `string` |
| `fromMethodName` | `string` |
| `fromFilePath` | `string` |
| `fromProperty` | `string` (value of property) |
| `fromDecoratorArg` | `string` |
| `fromDecoratorName` | `string` |
| `fromParameterType` | `string` |
| `literal` | `string` |
| `fromGenericArg` | `string[]` (array, even for single type) |
| `fromMethodSignature` | `{ parameters: Array<{name: string, type: string}>, returnType: string }` |
| `fromConstructorParams` | `Array<{name: string, type: string}>` |

**`fromGenericArg` with union types:**
```typescript
class Handler implements IEventHandler<OrderPlaced | OrderCancelled>
```
Returns: `["OrderPlaced", "OrderCancelled"]`

Single type still returns array: `["OrderPlaced"]`

#### Transform Execution Order

Transforms execute **top-to-bottom** in YAML order:

```yaml
operationName:
  fromClassName: true
  transform:
    stripSuffix: Controller  # First: PlaceOrderController → PlaceOrder
    toLowerCase: true         # Second: PlaceOrder → placeorder
```

Result: `"placeorder"`

Transforms only apply when extraction succeeds. Missing values are not transformed.

#### Rule Reference

**From code structure:**
- `fromClassName: true` — class name
- `fromClassName: { transform: { stripSuffix: 'Controller' } }` — with transform
- `fromMethodName: true` — method name
- `fromFilePath: { pattern: 'regex', capture: 1 }` — JavaScript regex, capture group index

**From properties:**
- `fromProperty: { name: 'route', kind: 'static' }` — static property
- `fromProperty: { name: 'type', kind: 'instance' }` — instance property

Properties are resolved through inheritance chains. If `OrderController extends BaseController` and `route` is defined in `BaseController`, extraction finds it.

**From decorators:**
- `fromDecoratorArg: { position: 0 }` — first argument (zero-indexed)
- `fromDecoratorArg: { name: 'path' }` — named property in object argument
- `fromDecoratorName: true` — decorator name itself
- `fromDecoratorName: { mapping: { Get: 'GET', Post: 'POST' } }` — with value mapping

When multiple decorators match, the first decorator (top-to-bottom in source) wins.

**From TypeScript types:**
- `fromMethodSignature: true` — extracts parameters and return type
- `fromConstructorParams: true` — extracts constructor parameter names and types
- `fromParameterType: { position: 0 }` — type name of parameter at position
- `fromGenericArg: { interface: 'IEventHandler', position: 0 }` — generic type argument

**Literals:**
- `literal: 'REST'` — hardcoded value in config

**Transforms:**
- `stripSuffix: 'Controller'` — removes suffix if present
- `stripPrefix: 'I'` — removes prefix if present
- `toLowerCase: true` — lowercase entire string
- `toUpperCase: true` — uppercase entire string
- `kebabToPascal: true` — `order-placed` → `OrderPlaced`
- `pascalToKebab: true` — `OrderPlaced` → `order-placed`

#### Edge Case Behaviors

| Scenario | Strict Mode | Lenient Mode |
|----------|-------------|--------------|
| Property not found | Exit 1 | Add to `_missing` |
| Decorator has no arguments | Exit 1 | Add to `_missing` |
| Decorator argument wrong type (object instead of string) | Exit 1 | Add to `_missing` |
| Generic argument is type parameter (`T` not concrete type) | Exit 1 | Add to `_missing` |
| File path regex has no match | Exit 1 | Add to `_missing` |
| Multiple decorators match rule | First decorator wins | First decorator wins |
| Non-literal value detected | Exit 1 with warning | Add to `_missing` with warning |
| Transform on missing value | N/A (already failed) | Transform skipped |

### 3.5 Extraction Rule Examples

**API with static properties:**
```typescript
export class PlaceOrderController implements APIControllerDef {
  static readonly route = '/orders'
  static readonly method = 'POST'
  handle(req, res) { ... }
}
```
```yaml
api:
  find: classes
  where: { implementsInterface: APIControllerDef }
  extract:
    apiType: { literal: REST }
    httpMethod: { fromProperty: { name: method, kind: static } }
    path: { fromProperty: { name: route, kind: static } }
```

**Event with instance property:**
```typescript
@Event
export class OrderPlaced implements EventDef {
  readonly type = 'OrderPlaced' as const
  constructor(public orderId: string, public amount: number) {}
}
```
```yaml
event:
  find: classes
  where: { hasDecorator: Event }
  extract:
    eventName: { fromProperty: { name: type, kind: instance } }
    eventSchema: { fromConstructorParams: true }
```

**EventHandler with generic type:**
```typescript
export class OrderPlacedHandler implements IEventHandler<OrderPlaced> {
  handle(event: OrderPlaced) { ... }
}
```
```yaml
eventHandler:
  find: classes
  where: { implementsInterface: IEventHandler }
  extract:
    subscribedEvents: { fromGenericArg: { interface: IEventHandler, position: 0 } }
```

**NestJS-style decorator arguments:**
```typescript
@Controller('/orders')
export class OrdersController {
  @Get('/:id')
  getOrder() { ... }
}
```
```yaml
api:
  find: methods
  where: { hasDecorator: { name: [Get, Post, Put, Delete] } }
  extract:
    apiType: { literal: REST }
    httpMethod: { fromDecoratorName: { mapping: { Get: GET, Post: POST, Put: PUT, Delete: DELETE } } }
    path: { fromDecoratorArg: { position: 0 } }
```

> **NestJS-style path concatenation is out of scope.** When using `find: methods` with controller/method decorators, extraction returns the method decorator path only (`/:id`), not the combined path (`/orders/:id`). Teams needing combined paths should use single-class-per-endpoint convention or post-process the output.

**DomainOp from class and method names:**
```typescript
@DomainOpContainer
export class Order {
  begin(customerId: string, items: LineItem[]): void { ... }
}
```
```yaml
domainOp:
  find: methods
  where: { inClassWith: { hasDecorator: DomainOpContainer } }
  extract:
    operationName: { fromMethodName: true }
    entity: { fromClassName: true }
    signature: { fromMethodSignature: true }
```

### 3.6 Conventions Package Update

**Interfaces for component definitions:**

```typescript
// HTTP types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// API Controller - one class = one endpoint
export interface APIControllerDef {
  readonly route: string
  readonly method: HttpMethod
  handle(req: Request, res: Response): void | Promise<void>
}

// Event - readonly type property is source of truth
export interface EventDef {
  readonly type: string
}

// Event Handler - declares which events it handles
export interface EventHandlerDef {
  readonly subscribedEvents: readonly string[]
  handle(event: unknown): void | Promise<void>
}

// UI Page - route is source of truth
export interface UIPageDef {
  readonly route: string
}

// Domain Operation - entity from class, operation from method
export interface DomainOpContainerDef {
  // No required static properties - entity/operation derived from class/method names
}
```

**ESLint enforcement rules:**
- `api-controller-requires-route-and-method` — classes implementing APIControllerDef must have static `route` and `method` properties with literal values
- `event-requires-type-property` — classes implementing EventDef must have readonly `type` property with literal value
- `event-handler-requires-subscribed-events` — classes implementing EventHandlerDef must have static `subscribedEvents` array
- `ui-page-requires-route` — classes implementing UIPageDef must have static `route` property

**Default extraction config** — Config file with extraction rules for all component types that passes validation and produces non-empty output on the demo app.

> **Note:** `Request` and `Response` in the `APIControllerDef` interface are generic placeholders. Implementations may use framework-specific types (Express, Fastify, etc.) or omit the `handle` method signature entirely if not using the interface for compile-time enforcement.

### 3.7 PR Component Extraction

CLI command to extract components from PR-changed files only:

```bash
# Extract from files changed in current branch vs main
riviere extract --pr

# Extract from files changed vs specific base branch
riviere extract --pr --base develop

# Extract from specific files
riviere extract --files src/api/orders.ts src/events/order-placed.ts

# Output formats
riviere extract --pr --format json
riviere extract --pr --format markdown  # For PR comments
```

#### Git Implementation

**Library:** Shell out to `git` CLI via Node.js `child_process.execSync`. No additional git library dependency.

**Base branch detection:**
1. Read `git symbolic-ref refs/remotes/origin/HEAD` for default remote branch
2. Fall back to `main` if not set
3. Override with `--base <branch>` flag

**Detection order:**
1. Is directory a git repo? (`git rev-parse --git-dir`)
2. Is HEAD detached? (`git symbolic-ref HEAD`)
3. Are there uncommitted changes? (`git status --porcelain`)
4. Get changed TypeScript files (`git diff --name-only`)

**Edge cases handled:**

| Scenario | Behavior |
|----------|----------|
| No git repo | Exit 3: `Error: [GIT_ERROR] NOT_A_REPOSITORY. Run from within a git repository.` |
| Git not installed | Exit 3: `Error: [GIT_ERROR] GIT_NOT_FOUND. Install git to use --pr flag.` |
| Detached HEAD | Use `HEAD~1` as base |
| Uncommitted changes | Include staged files, warn about unstaged |
| No changed TypeScript files | Output empty array, exit 0 |

#### Markdown Output Format

For PR comments (`--format markdown`):

```markdown
## Architecture Changes

### Added Components (2)
- **API** `PlaceOrderController` in `orders` domain
- **Event** `OrderPlaced` in `orders` domain

### Modified Components (1)
- **EventHandler** `OrderPlacedHandler` — added new subscribed event

### Removed Components (0)
None
```

### 3.8 AI Codebase Scanner

Prompt that analyzes a codebase and recommends:
- Which conventions already exist (decorators, JSDoc, naming patterns)
- Recommended extraction config based on existing patterns
- Recommended enforcement rules (ESLint config)
- Architectural tests to add
- Migration path when less than 50% of detected components follow the majority convention pattern

**Output:** Extraction config file + ESLint config snippet + architectural test suggestions.

**Prompt location:** `docs/ai-prompts/codebase-scanner.md`

**Acceptance criteria (measurable):**
- Generated config validates against JSON schema
- Generated config produces non-empty extraction results on target codebase
- Generated ESLint config snippet is syntactically valid

**Test methodology:**
1. Test on ecommerce-demo-app (follows conventions) — should detect patterns correctly
2. Test on a codebase NOT following our conventions — verify detection works on inconsistent code

### 3.9 ecommerce-demo-app Refactoring

Refactor ecommerce-demo-app to demonstrate recommended conventions:
- All components use interfaces (APIControllerDef, EventDef, etc.)
- Static properties for metadata (route, method, type, subscribedEvents)
- 100% field extraction — zero `_missing` arrays in output
- 100% enforcement via ESLint — zero lint errors

---

## 4. What We're NOT Building

| Exclusion | What Happens When Encountered |
|-----------|------------------------------|
| **Complex DomainOp fields** (`behavior`, `stateChanges`, `businessRules`) | Fields not extracted. See Research task for local LLM exploration. |
| **Real-time extraction** | Not available. Use CLI on-demand. No file watcher. |
| **PR diff visualization UI** | CLI outputs JSON/Markdown only. UI is future work. |
| **Multi-language extractors** | Non-TypeScript files silently skipped. |
| **Automatic enforcement generation** | Teams configure ESLint rules manually based on their conventions. |
| **Cross-file value resolution** | Warning: `"Non-literal value detected at FILE:LINE. Only inline literals supported."` Extraction fails (strict) or adds to `_missing` (lenient). |
| **Runtime/tracing extraction** | Not available. Static analysis only. |
| **Incremental extraction caching** | Each run is fresh. No caching between runs. |
| **Computed property extraction** | Same behavior as cross-file resolution: warning + fail/missing. |
| **NestJS path concatenation** | Method decorator path only (not combined with class decorator). |

---

## 5. Success Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Config schema extended with metadata extraction rules | `pnpm nx test riviere-extract-config` passes with new schema tests |
| 2 | All 15 extraction rules implemented | Unit tests exist for each rule in `packages/riviere-extract-ts/src/` |
| 3 | riviere-extract-conventions updated | Package exports 5 interfaces and 4 ESLint rules |
| 4 | Default extraction config includes metadata rules | `riviere extract --config ./default-config.yaml --dry-run` passes |
| 5 | `riviere extract --pr` command available | `riviere extract --pr --help` shows command; CLI integration test passes |
| 6 | ecommerce-demo-app refactored | `riviere extract` on demo app produces zero `_missing` arrays |
| 7 | ecommerce-demo-app enforcement | `pnpm lint` in demo app passes with all 4 rules enabled |
| 8 | AI codebase scanner prompt created | File exists at `docs/ai-prompts/codebase-scanner.md` with usage examples |
| 9 | Extraction workflow docs updated | `docs/workflow/` includes metadata extraction step |
| 10 | Config reference docs complete | `docs/reference/extraction-config.md` documents all 15 rules with examples |
| 11 | Research task completed | Report exists at `docs/research/llm-metadata-extraction.md` with 3 benchmark metrics |

---

## 6. Open Questions (Resolved)

1. **Partial metadata handling** — ✅ RESOLVED: Default is strict (fail on missing required fields). Users can opt into `--allow-incomplete` for lenient mode. Missing fields tracked in `_missing` array for automation.

2. **Config validation** — ✅ RESOLVED: Yes, at config load time. If a component type has required fields and no extraction rules, config validation fails immediately with clear error message.

3. **Inheritance chains** — ✅ RESOLVED: Extract inherited properties. ts-morph walks the inheritance chain. If `OrderController extends BaseController` and `route` is defined in `BaseController`, extraction finds it.

4. **`notUsed: true` behavior** — ✅ RESOLVED: Suppresses config validation for that component type entirely. Module won't require extraction rules for the marked component type.

5. **Re-exported interface handling** — ✅ RESOLVED: Interface matching uses the interface name regardless of import path. `implementsInterface: APIControllerDef` matches whether imported directly or re-exported.

6. **Multiple interface implementations with `fromGenericArg`** — ✅ RESOLVED: Uses the interface specified in the rule. If a class implements multiple interfaces, `fromGenericArg: { interface: 'IEventHandler', position: 0 }` only looks at `IEventHandler`.

---

## 7. Milestones

### M1: Config DSL Design + Schema

Design the metadata extraction DSL and extend the JSON schema.

#### Deliverables

- **D1.1:** ADR for metadata extraction DSL design
  - Documents: extraction rule taxonomy, source-of-truth principle, enforcement philosophy
  - Why these rules, why this structure
  - Acceptance: ADR reviewed and approved
  - Verification: File exists at `docs/architecture/adr/`

- **D1.2:** Domain terminology updated
  - Add terms:
    - Metadata Extraction Rule
    - Source of Truth
    - Extraction Config
    - Lenient Mode / Strict Mode
    - Draft Component
  - Acceptance: All 5 terms in glossary
  - Verification: Terms in `definitions.glossary.yml`

- **D1.3:** JSON Schema extended
  - `extract` block added to detection rules
  - All extraction rule types defined (closed list from Section 3.4)
  - Config validation: required fields must have extraction rules
  - Acceptance: Invalid configs rejected with clear errors at load time
  - Verification: Schema validation tests, config validation tests

---

### M2: Core Metadata Extraction

Implement metadata extraction rules in riviere-extract-ts.

#### Deliverables

- **D2.1:** Property extraction rules
  - `fromProperty` (static and instance)
  - `fromClassName`, `fromMethodName`
  - `literal`
  - Acceptance: Each rule extracts correctly
  - Verification: Unit tests, 100% coverage

- **D2.2:** Decorator extraction rules
  - `fromDecoratorArg` (positional and named)
  - `fromDecoratorName` with mapping
  - Acceptance: Each rule extracts correctly
  - Verification: Unit tests, 100% coverage

- **D2.3:** Type extraction rules
  - `fromMethodSignature`
  - `fromConstructorParams`
  - `fromParameterType`
  - `fromGenericArg`
  - Acceptance: Each rule extracts correctly
  - Verification: Unit tests, 100% coverage

- **D2.4:** Transform support
  - `stripSuffix`, `stripPrefix`, `toLowerCase`, `toUpperCase`
  - `kebabToPascal`, `pascalToKebab`
  - Acceptance: Transforms apply correctly
  - Verification: Unit tests

- **D2.5:** Path extraction rules
  - `fromFilePath` with regex capture
  - Acceptance: File path patterns extract correctly
  - Verification: Unit tests

- **D2.6:** CLI flags and modes
  - Default strict mode: fail on missing required fields (exit 1)
  - `--allow-incomplete` flag: warn and continue, output includes `_missing` arrays
  - `--components-only` flag: skip field extraction entirely (Phase 10 behavior)
  - `--enrich <file>` flag: read draft components from file, apply extraction rules
  - `--dry-run` flag: validate config, report what would be extracted, no output
  - `-o <file>` flag: output to file instead of stdout
  - Acceptance: Each flag behaves correctly
  - Verification: CLI integration tests for each flag

- **D2.7:** Config validation for required fields
  - At config load time, validate extraction rules cover required fields
  - Clear error messages listing missing rules
  - Exit code 2 for config validation failure
  - Acceptance: Missing extraction rules detected before extraction starts
  - Verification: Config validation tests

---

### M3: Conventions Package Update

Update riviere-extract-conventions with interfaces, enforcement, and default config.

#### Deliverables

- **D3.1:** Component interfaces
  - `APIControllerDef`, `EventDef`, `EventHandlerDef`, `UIPageDef`, `DomainOpContainerDef`
  - `HttpMethod` type exported
  - Clear TypeScript types for required properties
  - Acceptance: Interfaces enforce required fields at compile time
  - Verification: TypeScript compilation tests

- **D3.2:** ESLint enforcement rules (4 rules)
  - `api-controller-requires-route-and-method`
  - `event-requires-type-property`
  - `event-handler-requires-subscribed-events`
  - `ui-page-requires-route`
  - Clear error messages guiding developer
  - Test fixtures showing passing and failing cases for each rule
  - Acceptance: Missing properties produce lint errors
  - Verification: ESLint rule tests for each rule with fixture files

- **D3.3:** Default extraction config with extraction rules
  - Uses interfaces for detection (`implementsInterface`)
  - Extraction rules for all required fields
  - Acceptance: Config passes validation, extracts all required fields
  - Verification: Integration tests

- **D3.4:** Package CLAUDE.md updated
  - Documents interfaces and enforcement approach
  - Acceptance: Developer understands usage
  - Verification: Review doc content

---

### M4: ecommerce-demo-app Validation

Refactor demo app and validate 100% extraction + enforcement.

#### Deliverables

- **D4.1:** ecommerce-demo-app refactored
  - All API controllers implement `APIControllerDef` with static `route` and `method`
  - All events implement `EventDef` with readonly `type` property
  - All event handlers implement `EventHandlerDef` with static `subscribedEvents`
  - All UI pages implement `UIPageDef` with static `route`
  - Acceptance: All components follow conventions
  - Verification: TypeScript compiles with no errors

- **D4.2:** Extraction config for demo app
  - Single config file using recommended conventions
  - Extraction rules for all required fields
  - Acceptance: Config validation passes (exit 0)
  - Verification: `riviere extract --config ./config.yaml --dry-run` succeeds

- **D4.3:** 100% field extraction validated
  - Run extraction in strict mode (default)
  - Zero `_missing` arrays in output
  - All required fields populated for all components
  - Acceptance: Extraction succeeds (exit 0)
  - Verification: `riviere extract --config ./config.yaml` completes without errors

- **D4.4:** 100% enforcement validated
  - ESLint rules enabled for demo app
  - All 4 enforcement rules passing
  - Acceptance: Zero lint errors
  - Verification: `pnpm lint` passes

---

### M5: PR Component Extraction

CLI command for PR-scoped extraction.

#### Deliverables

- **D5.1:** `riviere extract --pr` command
  - Detects changed files vs base branch
  - Extracts components from changed files only
  - Acceptance: Command executes successfully
  - Verification: CLI tests

- **D5.2:** `riviere extract --files` command
  - Accepts explicit file list
  - Extracts components from specified files
  - Acceptance: Command executes successfully
  - Verification: CLI tests

- **D5.3:** Output formats
  - JSON output (default)
  - Markdown output for PR comments
  - Acceptance: Both formats work correctly
  - Verification: Output format tests

- **D5.4:** CLI docs updated
  - PR extraction commands documented
  - Examples for CI integration
  - Acceptance: Developer can follow docs
  - Verification: Docs exist

---

### M6: Documentation + AI Scanner

Complete documentation and AI-assisted onboarding.

#### Deliverables

- **D6.1:** Extraction workflow docs updated
  - Metadata extraction added as step in workflow
  - Before/after examples
  - Acceptance: Developer understands metadata extraction
  - Verification: Review docs

- **D6.2:** Config reference docs
  - All metadata extraction rules documented
  - Examples for each rule type
  - Acceptance: Developer can configure any rule
  - Verification: Review docs

- **D6.3:** AI codebase scanner prompt
  - Analyzes codebase for existing conventions
  - Outputs recommended extraction config
  - Outputs recommended ESLint config snippet
  - Suggests architectural tests
  - Location: `docs/ai-prompts/codebase-scanner.md`
  - Acceptance (measurable):
    - Generated config validates against JSON schema
    - Generated config produces non-empty extraction results
    - Generated ESLint config snippet is syntactically valid
  - Verification:
    - Test on ecommerce-demo-app (follows conventions) — verify pattern detection
    - Test on a non-convention-following codebase — verify detection on inconsistent code

- **D6.4:** Architecture overview updated
  - Metadata extraction documented
  - PR extraction documented
  - Acceptance: Overview reflects current capabilities
  - Verification: Review docs

---

### Research: Local LLM for Complex Metadata

Parallel research task to explore local LLM options for extracting complex DomainOp fields (`behavior`, `stateChanges`, `businessRules`).

**Runs in parallel with M1-M6. Completion not required for Phase 11 success.**

#### Deliverables

- **R1:** Research report
  - Create ground truth dataset: 10 sample DomainOp classes with human-labeled `behavior` field
  - Evaluate local LLM options (Ollama, llama.cpp, MLX, etc.)
  - Benchmark: extract `behavior` field from 10 sample classes
  - Measure: latency per class, accuracy vs ground truth
  - Assess hardware requirements (RAM, GPU, M-series Mac support)
  - Assess CLI integration feasibility
  - Success thresholds for recommendation:
    - Latency: < 5 seconds per DomainOp class
    - Accuracy: > 80% match with ground truth
    - Hardware: runs on 16GB RAM laptop without GPU
  - Outcome: Recommend integration approach OR defer to future PRD
  - Location: `docs/research/llm-metadata-extraction.md`
  - Acceptance: Report includes ground truth dataset, benchmarks, clear recommendation
  - Verification: Report reviewed, benchmarks reproducible

---

## 8. Dependencies

**Depends on:**
- Phase 10 (TypeScript Component Extraction) — Component identification

**Blocks:**
- Phase 12 (Connection Detection) — Metadata needed for semantic linking

**Package Paths:**

| Package | Path | This Phase Modifies |
|---------|------|---------------------|
| riviere-schema | `packages/riviere-schema/` | Read only (required fields source of truth) |
| riviere-extract-config | `packages/riviere-extract-config/` | Yes — add `extract` block to schema |
| riviere-extract-ts | `packages/riviere-extract-ts/` | Yes — implement extraction rules |
| riviere-extract-conventions | `packages/riviere-extract-conventions/` | Yes — add interfaces, ESLint rules |
| riviere-cli | `packages/riviere-cli/` | Yes — add CLI flags |
| ecommerce-demo-app | `github.com/NTCoding/ecommerce-demo-app` | Yes — refactor to conventions (external repo) |

---

## 9. Reference

### Terminology Mapping

> **Code vs Schema:** Convention interfaces use `route` (property name), Riviere schema uses `path` (field name). Extraction maps `route` → `path`.

### Metadata by Component Type

| Component | Required | Optional |
|-----------|----------|----------|
| API | `apiType`, `httpMethod`, `path` | `operationName` |
| Event | `eventName` | `eventSchema` |
| EventHandler | `subscribedEvents` | — |
| DomainOp | `operationName` | `entity`, `signature` |
| UI | `route` | — |
| UseCase | — | — |

### Deferred Fields (Complex, need LLM)

- DomainOp: `behavior`, `stateChanges`, `businessRules`
- Event: `eventSchema` (complex type extraction)

---

## 10. Parallelization

### Independent Work Streams

Different people can work on these tracks simultaneously:

```text
TRACK A (Extraction):     M1 ──► M2 (all rules) ──► D3.3 (default config) ──► M5 (PR extraction)

TRACK B (Conventions):    D3.1 (interfaces) ──► D3.2 (ESLint rules) ──► D4.1 (demo app refactor)
                               │                                              │
                               └──────────────────────────────────────────────┴──► M4.3/M4.4 (validation)

TRACK C (Research):       R1 (LLM research) ─────────────────────────────────────────────────────►

TRACK D (Docs skeleton):  Create file structure, write outlines ────────────► M6 (fill in details)
```

### Why These Are Independent

| Track | Why Independent |
|-------|-----------------|
| **Track B (D3.1 Interfaces)** | TypeScript interfaces define what components SHOULD look like. No dependency on extraction implementation. |
| **Track B (D3.2 ESLint rules)** | Enforces conventions at dev time. Only needs interfaces (D3.1), not extraction. |
| **Track B (D4.1 Demo app refactor)** | Refactor code to implement interfaces. Compiles without extraction working. |
| **Track C (Research)** | Completely separate concern (LLM evaluation). Different tools. |
| **Track D (Docs)** | File structure and outlines can be created before implementation completes. |

### Convergence Points

- D3.3 (default config) needs M2 complete
- M4.3/M4.4 (validation) needs both Track A and Track B complete
- M5 needs M2 complete
- M6 content needs everything complete
