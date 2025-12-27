# PRD: Phase 7 — Riviere Builder Package

**Status:** Approved

**Depends on:** Phase 5 (Riviere Query), Phase 6 (Éclair Migration)

## 1. Problem

We need a production-quality builder package (`@living-architecture/riviere-builder`) that can:
- Programmatically construct Rivière graphs
- Validate graphs during construction (fail fast)
- Export valid JSON conforming to the Rivière schema

The POC implementation exists but will be rewritten from scratch using the POC as a specification.

## 2. Design Principles

1. **Fail early, fail loudly** — Invalid operations error immediately with actionable messages.
2. **Guide users toward schema capabilities** — Make the right thing easy, wrong thing hard.
3. **Type-safe** — Full TypeScript with strict mode. Compile-time checks where possible.
4. **100% test coverage** — Production quality from day one.
5. **5-phase extraction algorithm** — Support the documented workflow pattern.

## 3. What We're Building

### Package: `@living-architecture/riviere-builder`

**Core API (from POC spec):**

```typescript
class RiviereBuilder {
  // Construction
  static new(options: BuilderOptions): RiviereBuilder
  static resume(graph: RiviereGraph): RiviereBuilder

  // Metadata
  addSource(source: SourceInput): void
  addDomain(domain: DomainInput): void
  defineCustomType(type: CustomTypeDefinition): void

  // Components
  addUI(input: UIInput): Component
  addApi(input: APIInput): Component
  addUseCase(input: UseCaseInput): Component
  addDomainOp(input: DomainOpInput): Component
  addEvent(input: EventInput): Component
  addEventHandler(input: EventHandlerInput): Component
  addCustom(input: CustomInput): Component

  // Finding (delegates to query())
  nearMatches(criteria: FindCriteria): Component[]  // Fuzzy matching for error recovery

  // Linking
  link(options: LinkOptions): void
  linkExternal(options: ExternalLinkOptions): void

  // Enrichment
  enrichComponent(id: string, enrichment: Enrichment): void

  // Query integration
  query(): RiviereQuery

  // Export
  validate(): ValidationResult
  serialize(): string  // JSON without validation
  build(): RiviereGraph  // Validates and returns graph
  save(path: string): void  // Validates and writes to file

  // Inspection
  stats(): BuilderStats
  warnings(): Warning[]
  orphans(): Component[]
}
```

**5-Phase Extraction Algorithm Support:**

```typescript
// 1. defineMetadata()
builder.addSource({ ... });
builder.addDomain({ ... });

// 2. defineComponents()
builder.addApi({ ... });
builder.addUseCase({ ... });

// 3. linkComponents()
for (const component of builder.getComponents()) {
  const target = builder.findComponent({ ... });
  builder.link({ from: component, to: target, type: 'sync' });
}

// 4. enrichComponents()
builder.enrichComponent(id, { stateChanges: [...], businessRules: [...] });

// 5. validateAndBuild()
const graph = builder.build();
```

**ID Generation:**
- Automatic, deterministic IDs: `{domain}:{type}:{name}` (kebab-case)
- Users don't provide IDs, builder generates them

**Validation:**
- Immediate validation for type/schema errors
- Deferred validation for structural concerns (orphans, etc.)
- `build()` runs full validation before export

**Custom Type Validation (HARD REQUIREMENT):**

The builder MUST validate custom types at construction time. JSON Schema cannot cross-reference between `components[].customTypeName` and `metadata.customTypes` keys, so this validation MUST happen in the builder.

```typescript
builder.defineCustomType({
  name: 'MessageQueue',
  description: 'Async message queue',
  requiredProperties: {
    queueName: { type: 'string', description: 'Queue identifier' },
    messageType: { type: 'string', description: 'Message schema type' }
  }
});

builder.addCustom({
  customTypeName: 'MessageQueue',  // MUST exist in defined custom types
  name: 'Order Queue',
  domain: 'orders',
  module: 'checkout',
  metadata: {
    queueName: 'orders-queue',     // MUST include all requiredProperties
    messageType: 'OrderCreated'
  }
});

// This MUST throw immediately:
builder.addCustom({
  customTypeName: 'UndefinedType',  // ERROR: Custom type 'UndefinedType' not defined
  ...
});

// This MUST throw immediately:
builder.addCustom({
  customTypeName: 'MessageQueue',
  metadata: {}  // ERROR: Missing required properties for 'MessageQueue': queueName, messageType
});
```

Validation happens in `addCustom()`, not deferred to `build()`. Fail fast.

**Error Messages:**
- Actionable: Tell user what's wrong AND how to fix it
- Include near-matches when component not found
- AI-friendly: Enable self-correction

### Documentation

API documentation auto-generated from TSDoc comments.

## 4. What We're NOT Building

- CLI (Phase 8)
- Graph merging (future)
- Extraction from source code (future)

## 5. Success Criteria

- [ ] All POC builder functionality implemented
- [ ] 5-phase extraction algorithm works as documented
- [ ] ID generation matches spec (deterministic, kebab-case)
- [ ] Error messages are actionable (tested with example errors)
- [ ] Near-match suggestions work for typos
- [ ] **Custom type validation in `addCustom()` — throws immediately if type undefined or required properties missing**
- [ ] 100% test coverage
- [ ] API documentation generated
- [ ] Can recreate all example graphs programmatically
- [ ] TypeScript strict mode, no `any`
- [ ] Passes lint with strict ESLint config
- [ ] Integrates with `@living-architecture/riviere-query`

## 6. Reference

**POC Implementation (specification, not to copy):**
- `~/code/riviere/riviere/poc/client/src/builder.ts` — RiviereBuilder class
- `~/code/riviere/riviere/poc/client/src/types.ts` — Type definitions

**POC Documentation:**
- `~/code/riviere/riviere/client/docs/api/riviere-builder.md` — API reference
- `~/code/riviere/riviere/client/docs/guide/ai-extraction.md` — 5-phase algorithm

**Design Decisions:**
- `./docs/project/PRD/archived/PRD-phase-3-client-library.md` — 12 resolved decisions

## 7. Resolved Questions

1. **File system dependency** — Builder includes `build(path)` for file writing. This makes the package Node.js-only (not browser-safe), which is acceptable since it's for extraction tools.

2. **Session persistence** — Keep `serialize()`/`resume()`. Essential for CLI workflow where each command is a separate invocation.

---

## 8. Milestones

### M1: Components can be added to a graph
Core construction capability. Create graphs, add metadata, domains, and all 7 built-in component types.

#### Deliverables
- **D1.1:** `RiviereBuilder.new(options)` creates new builder instance
  - Acceptance: Returns builder with graph metadata configured
  - Verification: Tests with various options
- **D1.2:** `addSource(source)` adds source repository info
  - Acceptance: Source added to metadata
  - Verification: Export includes source
- **D1.3:** `addDomain(domain)` adds domain with validation
  - Acceptance: Domain added, rejects duplicates
  - Verification: Tests with valid and invalid inputs
- **D1.4:** `addUI/addApi/addUseCase/addDomainOp/addEvent/addEventHandler` for all 7 types
  - Acceptance: Each returns created component with generated ID
  - Verification: Tests for each type with required/optional fields
- **D1.5:** Automatic ID generation following convention
  - Acceptance: IDs follow `{domain}:{type}:{name}` kebab-case pattern
  - Verification: Test ID format for each component type

---

### M2: Custom types can be defined and validated
Register custom types and validate them at construction time.

#### Deliverables
- **D2.1:** `defineCustomType(definition)` registers custom type
  - Acceptance: Type stored with required/optional property definitions
  - Verification: Test registration with various property types
- **D2.2:** `addCustom(input)` validates against defined type
  - Acceptance: Throws immediately if type undefined
  - Acceptance: Throws immediately if required properties missing
  - Verification: Tests for valid and invalid custom component adds
- **D2.3:** Error messages include defined types and missing properties
  - Acceptance: Actionable messages for each failure mode
  - Verification: Test error message format

---

### M3: Error recovery suggests near-matches
Fuzzy matching for actionable error messages. Finding delegates to `query()`.

#### Deliverables
- **D3.1:** `nearMatches(criteria)` returns fuzzy matches for error recovery
  - Acceptance: Returns similar components when exact match fails
  - Acceptance: Matches on name similarity, type, domain
  - Verification: Test with typos and partial matches
- **D3.2:** Error messages use nearMatches for suggestions
  - Acceptance: When component not found, error includes "Did you mean...?"
  - Verification: Test error output format

---

### M4: Components can be connected
Linking components to form the graph structure.

#### Deliverables
- **D4.1:** `link(options)` connects internal components
  - Acceptance: Creates edge with source, target, type (sync/async)
  - Acceptance: Validates source exists immediately
  - Acceptance: Target validation deferred to build()
  - Verification: Tests for valid links, invalid source
- **D4.2:** `linkExternal(options)` links to external systems
  - Acceptance: Creates external link with name, optional domain/url
  - Verification: Test external link creation and export
- **D4.3:** Link error messages include near-matches (via M3)
  - Acceptance: When source/target not found, suggests similar components
  - Verification: Test error messages with typos

---

### M5: Components can be enriched
Add domain details like state changes and business rules.

#### Deliverables
- **D5.1:** `enrichComponent(id, enrichment)` adds domain details
  - Acceptance: Adds stateChanges, businessRules to DomainOp
  - Acceptance: Validates component exists and is correct type
  - Verification: Test enrichment of DomainOp
- **D5.2:** State change validation
  - Acceptance: stateChanges follow {entity, from, to} format
  - Verification: Test valid and invalid state changes
- **D5.3:** Business rules as string array
  - Acceptance: businessRules stored correctly
  - Verification: Test enrichment with rules

---

### M6: Draft graphs can be saved and restored
Session persistence for CLI workflow.

#### Deliverables
- **D6.1:** `serialize()` exports builder state as string
  - Acceptance: Returns JSON string of current draft state
  - Verification: Test serialization at various build stages
- **D6.2:** `RiviereBuilder.resume(graph)` restores from serialized state
  - Acceptance: Returns builder with full state restored
  - Verification: Round-trip: serialize → resume → serialize matches
- **D6.3:** Serialized format includes all builder state
  - Acceptance: Components, links, enrichments, custom types all preserved
  - Verification: Test state completeness after resume

---

### M7: Graphs can be validated and exported
Final validation and output.

#### Deliverables
- **D7.1:** `validate()` runs full validation
  - Acceptance: Returns ValidationResult with errors array
  - Acceptance: Checks: dangling references, orphans, schema compliance
  - Verification: Tests with valid and various invalid graphs
- **D7.2:** `build()` validates and returns graph object
  - Acceptance: Returns RiviereGraph if valid, throws if invalid
  - Verification: Test build success and failure paths
- **D7.3:** `save(path)` validates and writes to file
  - Acceptance: Writes valid JSON to specified path, throws without writing if invalid
  - Verification: Test file output and error handling
- **D7.4:** `stats()` returns builder statistics
  - Acceptance: Component counts by type, link count, domain count
  - Verification: Test stats at various build stages
- **D7.5:** `warnings()` returns non-fatal issues
  - Acceptance: Orphans, unused domains, etc.
  - Verification: Test warning detection
- **D7.6:** `orphans()` returns disconnected components
  - Acceptance: Components with no incoming or outgoing links
  - Verification: Test with graph containing orphans

---

### M8: Built graphs can be queried
Integration with riviere-query package.

#### Deliverables
- **D8.1:** `query()` returns RiviereQuery instance
  - Acceptance: Returns working query object for current graph state
  - Verification: Test query operations on built graph
- **D8.2:** Query reflects current builder state
  - Acceptance: Can query mid-construction (validation deferred)
  - Verification: Test query after partial construction

---

### M9: API documentation generated from code
TSDoc comments on all public methods, TypeDoc generates reference.

#### Deliverables
- **D9.1:** All public methods have TSDoc comments
  - Acceptance: Every exported function/method documented with @param, @returns, @example
  - Verification: TypeDoc generates without warnings
- **D9.2:** TypeDoc generates API reference
  - Acceptance: Generated docs in apps/docs/api/riviere-builder/
  - Verification: Build produces docs
- **D9.3:** Static docs replaced with generated
  - Remove: `apps/docs/api/riviere-builder.md`
  - Replace with: TypeDoc output
  - Verification: No duplicate/stale documentation

---

## 9. Dependencies

**Depends on:**
- Phase 5 (Query) — Builder imports and uses RiviereQuery

**Blocks:**
- Phase 8 (CLI) — CLI wraps Builder
- Future: Graph merging — Merging uses Builder
