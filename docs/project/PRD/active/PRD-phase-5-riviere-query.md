# PRD: Phase 5 — Riviere Query Package

**Status:** Planning

**Depends on:** Phase 4 (Monorepo Setup) — Complete

---

## 1. Problem

We need a production-quality query package (`@living-architecture/riviere-query`) that can:
- Query Rivière graphs for analysis and visualization
- Validate graphs against the Rivière schema with ultra-robust error reporting
- Work in both browser and Node.js environments
- Support Éclair migration from POC (requires diff capability)

The POC implementation exists but will be rewritten from scratch using the POC as a specification, not as code to copy.

---

## 2. Design Principles

1. **Ultra-robust validation** — Full JSON Schema validation using ajv. Catch errors early with clear messages.
2. **Complete API parity** — All POC methods, not a subset. No compromises on functionality.
3. **Browser-safe** — Zero Node.js dependencies. Must work in Éclair and other browser apps.
4. **Type-safe** — Full TypeScript with strict mode. No `any`.
5. **100% test coverage** — Production quality from day one.
6. **Diff support** — Required for Éclair migration from POC.
7. **Documentation from code** — TSDoc comments generate API reference via TypeDoc.

---

## 3. What We're Building

### Package: `@living-architecture/riviere-query`

### Complete API Surface

**Construction & Data Access:**
```typescript
constructor(source: QuerySource | RiviereGraph)
static fromFile(contents: string): RiviereQuery
components(): Component[]
links(): Link[]
```

**Search & Lookup:**
```typescript
find(predicate: (c: Component) => boolean): Component | undefined
findAll(predicate: (c: Component) => boolean): Component[]
componentById(id: string): Component | undefined
search(query: string): Component[]  // Case-insensitive, searches name/domain/type
```

**Domain & Component Filtering:**
```typescript
componentsInDomain(domainName: string): Component[]
componentsByType(type: ComponentType): Component[]
domains(): Domain[]
```

**Entity & State Management:**
```typescript
entities(domainName?: string): Entity[]
operationsFor(entity: string): DomainOp[]
statesFor(entity: string): string[]  // Ordered by transitions
transitionsFor(entity: string): EntityTransition[]
businessRulesFor(entity: string): string[]
```

**Event Handling:**
```typescript
publishedEvents(domainName?: string): PublishedEvent[]
eventHandlers(eventName?: string): EventHandlerInfo[]
```

**Graph Traversal & Flow Analysis:**
```typescript
traceFlow(startNodeId: string): FlowResult  // Bidirectional
flows(): Flow[]  // All flows from entry points
searchWithFlow(query: string): SearchWithFlowResult
entryPoints(): Component[]  // UI, API, EventHandler, Custom with no incoming links
```

**Domain Analysis:**
```typescript
crossDomainLinks(domainName: string): CrossDomainLink[]
domainConnections(domainName: string): DomainConnection[]
```

**Analytics:**
```typescript
stats(): GraphStats
nodeDepths(): Map<string, number>
detectOrphans(): string[]
```

**Diff & Comparison:**
```typescript
diff(other: RiviereGraph): GraphDiff
```

**Validation:**
```typescript
validate(): ValidationResult  // JSON Schema + structural checks
```

### Key Types

**Component** (discriminated union by `type`):
- `UI` — Frontend route (`route: string`)
- `API` — Endpoint (`apiType`, `httpMethod`, `httpRoute`, `operationName`)
- `UseCase` — Application service
- `DomainOp` — Domain operation (`operationName`, `entity?`, `stateChanges?`, `businessRules?`)
- `Event` — Published event (`eventName`, `eventSchema?`)
- `EventHandler` — Event subscriber (`subscribedEvents: string[]`)
- `Custom` — Extensible type

**Link:**
```typescript
interface Link {
  id?: string
  source: string
  target: string
  type?: 'sync' | 'async'
  sourceLocation?: SourceLocation
}
```

**Flow & Traversal:**
```typescript
interface FlowResult {
  nodeIds: string[]
  linkIds: string[]
}

interface Flow {
  entryPoint: Component
  steps: FlowStep[]
}

interface FlowStep {
  component: Component
  linkType: 'sync' | 'async' | undefined
  depth: number
}
```

**Analytics & Diff:**
```typescript
interface GraphStats {
  componentCount: number
  linkCount: number
  domainCount: number
  apiCount: number
  entityCount: number
  eventCount: number
}

interface GraphDiff {
  components: {
    added: Component[]
    removed: Component[]
    modified: ComponentModification[]
  }
  links: {
    added: Link[]
    removed: Link[]
  }
  stats: DiffStats
}
```

**Domain & Events:**
```typescript
interface Domain {
  name: string
  description: string
  systemType: 'domain' | 'bff' | 'ui' | 'other'
  componentCounts: Record<ComponentType, number> & { total: number }
}

interface PublishedEvent {
  id: string
  eventName: string
  domain: string
  handlers: EventSubscriber[]
}

interface EventHandlerInfo {
  id: string
  handlerName: string
  domain: string
  subscribedEvents: string[]
  subscribedEventsWithDomain: { eventName: string; sourceDomain?: string }[]
}
```

**Validation:**
```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

interface ValidationError {
  path: string
  message: string
  code: string
}
```

---

## 4. What We're NOT Building

- Éclair migration (Phase 6)
- Builder functionality (Phase 7)
- CLI (Phase 8)
- Graph merging (future)

---

## 5. Success Criteria

- [ ] All 30+ POC methods implemented
- [ ] Schema validation catches invalid graphs with clear error messages
- [ ] diff() correctly identifies changes between graphs
- [ ] Works in browser (verified with HTML test page)
- [ ] Works in Node.js
- [ ] 100% test coverage
- [ ] TypeScript strict mode, no `any`
- [ ] Validates example graphs correctly
- [ ] API documentation generated via TypeDoc
- [ ] Passes lint with strict ESLint config

---

## 6. Reference

**POC Implementation (specification, not to copy):**
- `~/code/riviere/riviere/poc/client/src/query.ts` — RiviereQuery class
- `~/code/riviere/riviere/poc/client/src/types.ts` — Type definitions

**Schema:**
- `./schema/riviere.schema.json` — The contract (in this repo)

**Example Graphs:**
- `./schema/examples/ecommerce-complete.json`

---

## 7. Milestones

### M1: Graphs can be validated
Load a graph, get clear pass/fail with error details.

**Deliverables:**
- **D1.1:** `validate()` returns pass/fail with error details
  - Acceptance: Invalid graphs return specific error paths and messages
  - Verification: Tests with valid and invalid graphs
- **D1.2:** `detectOrphans()` finds disconnected components
  - Acceptance: Returns list of component IDs with no links
  - Verification: Test with graph containing orphans

---

### M2: Components can be found and explored
Search by name, filter by domain/type, lookup by ID.

**Deliverables:**
- **D2.1:** `find()` and `findAll()` with predicate
  - Acceptance: Returns matching components
  - Verification: Tests with various predicates
- **D2.2:** `componentById()` lookup
  - Acceptance: Returns component or undefined
  - Verification: Test with valid and invalid IDs
- **D2.3:** `search()` full-text search
  - Acceptance: Case-insensitive search across name, domain, type
  - Verification: Test with partial matches
- **D2.4:** `componentsInDomain()` and `componentsByType()`
  - Acceptance: Returns filtered lists
  - Verification: Tests with example graph

---

### M3: Domain model can be understood
See all entities, their operations, states, transitions, business rules.

**Deliverables:**
- **D3.1:** `domains()` returns all domains with metadata
  - Acceptance: Includes component counts per type
  - Verification: Test with multi-domain graph
- **D3.2:** `entities()` returns all entities with operations
  - Acceptance: Grouped by domain:entity
  - Verification: Test with entities across domains
- **D3.3:** `operationsFor()` returns DomainOps for entity
  - Acceptance: All operations targeting entity
  - Verification: Test with entity having multiple operations
- **D3.4:** `statesFor()` returns ordered states
  - Acceptance: States ordered by transition flow
  - Verification: Test with state machine
- **D3.5:** `transitionsFor()` returns state transitions
  - Acceptance: All from→to transitions
  - Verification: Test with complex state machine
- **D3.6:** `businessRulesFor()` returns rules
  - Acceptance: All rules for entity operations
  - Verification: Test with operations containing rules

---

### M4: Event flows can be traced
See what events are published, who handles them.

**Deliverables:**
- **D4.1:** `publishedEvents()` returns events with subscribers
  - Acceptance: Each event lists its handlers
  - Verification: Test with events and handlers
- **D4.2:** `eventHandlers()` returns handlers with subscriptions
  - Acceptance: Each handler lists subscribed events with source domain
  - Verification: Test with cross-domain event handling

---

### M5: Execution flows can be traced end-to-end
Trace from entry point through entire flow, see cross-domain connections.

**Deliverables:**
- **D5.1:** `entryPoints()` identifies flow starting points
  - Acceptance: Returns UI, API, EventHandler, Custom with no incoming links
  - Verification: Test with various entry point types
- **D5.2:** `traceFlow()` bidirectional trace
  - Acceptance: Returns all connected nodes and links
  - Verification: Test with branching flows
- **D5.3:** `flows()` returns all flows from entry points
  - Acceptance: Each flow has steps with depth
  - Verification: Test with multiple entry points
- **D5.4:** `searchWithFlow()` returns matches + connected flow
  - Acceptance: Search results include flow context
  - Verification: Test search returning flow nodes
- **D5.5:** `crossDomainLinks()` returns domain boundary crossings
  - Acceptance: Unique outgoing links to other domains
  - Verification: Test with multi-domain graph
- **D5.6:** `domainConnections()` returns connection summary
  - Acceptance: Incoming/outgoing counts by API vs event
  - Verification: Test with cross-domain API and event links

---

### M6: Graphs can be compared
Diff two versions, see what changed. Analytics for graph health.

**Deliverables:**
- **D6.1:** `diff()` compares two graphs
  - Acceptance: Returns added/removed/modified components and links
  - Verification: Test with before/after graphs
- **D6.2:** `stats()` returns graph statistics
  - Acceptance: Component, link, domain, API, entity, event counts
  - Verification: Test with example graph
- **D6.3:** `nodeDepths()` calculates depth from entry
  - Acceptance: Returns Map of node ID to depth
  - Verification: Test with multi-level graph

---

### M7: Works in browser
Verified in browser environment, no Node.js dependencies leak.

**Deliverables:**
- **D7.1:** Browser test page loads and runs queries
  - Acceptance: HTML page successfully imports and uses package
  - Verification: Manual test in browser
- **D7.2:** No Node.js imports in bundle
  - Acceptance: Build output contains no `fs`, `path`, `process` references
  - Verification: Bundle analysis

---

### M8: API documentation generated from code
TSDoc comments on all public methods, TypeDoc generates reference.

**Deliverables:**
- **D8.1:** All public methods have TSDoc comments
  - Acceptance: Every exported function/method documented
  - Verification: TypeDoc generates without warnings
- **D8.2:** TypeDoc generates API reference
  - Acceptance: Generated docs replace static files
  - Verification: Build produces docs
- **D8.3:** Static docs replaced
  - Remove: `apps/docs/api/riviere-query.md`
  - Remove: `apps/docs/api/types.md`
  - Replace with: TypeDoc output

---

## 8. Open Questions

1. ~~**Validation library**~~ — Resolved: Use ajv
2. ~~**Bundle size**~~ — Resolved: Robustness over size. Accept larger bundle.
3. **Tree-shaking** — Ensure unused methods can be tree-shaken for smaller bundles in apps that don't use full API

---

## 9. Dependencies

**Blocks:**
- Phase 6 (Éclair migration) — Éclair needs Query package to replace POC imports
- Phase 7 (Builder) — Builder depends on Query
- Phase 8 (CLI) — CLI depends on Builder
