# PRD: Phase 5 — Riviere Query Package

**Status:** Draft

**Depends on:** Phase 4 (Monorepo Setup)

## 1. Problem

We need a production-quality query package (`@living-architecture/riviere-query`) that can:
- Query Rivière graphs for analysis and visualization
- Validate graphs against the Rivière schema
- Work in both browser and Node.js environments

The POC implementation exists but will be rewritten from scratch using the POC as a specification, not as code to copy.

## 2. Design Principles

1. **Browser-safe** — Zero Node.js dependencies. Must work in Éclair and other browser apps.
2. **Lightweight** — Minimal bundle size. No heavy dependencies.
3. **Type-safe** — Full TypeScript with strict mode.
4. **100% test coverage** — Production quality from day one.
5. **Schema-driven** — Validation against `riviere.schema.json`.

## 3. What We're Building

### Package: `@living-architecture/riviere-query`

**Core API (from POC spec):**

```typescript
class RiviereQuery {
  // Construction
  constructor(graph: RiviereGraph)

  // Basic accessors
  components(): Component[]
  links(): Link[]

  // Finding
  find(predicate: (c: Component) => boolean): Component | undefined
  findAll(predicate: (c: Component) => boolean): Component[]
  componentById(id: string): Component | undefined
  componentsInDomain(domain: string): Component[]
  componentsByType(type: ComponentType): Component[]
  search(text: string): Component[]  // Full-text search

  // Entry points
  entryPoints(): Component[]  // UI, API, EventHandler with no incoming links

  // Entity analysis
  entities(): Entity[]
  operationsFor(entity: string): DomainOp[]
  statesFor(entity: string): string[]
  transitionsFor(entity: string): StateTransition[]
  businessRulesFor(entity: string): BusinessRule[]

  // Domain analysis
  domains(): DomainSummary[]
  crossDomainLinks(): CrossDomainLink[]
  domainConnections(): DomainConnection[]

  // Event analysis
  publishedEvents(): EventWithSubscribers[]
  eventHandlers(): HandlerWithSubscriptions[]

  // Flow tracing
  traceFlow(componentId: string, direction?: 'forward' | 'backward'): FlowTrace

  // Validation
  validate(): ValidationResult
  detectOrphans(): Component[]
}
```

**Validation:**
- Schema validation using bundled `riviere.schema.json`
- Structural validation (orphan detection, broken links)
- Version compatibility checking

**Types:**
- All component types (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)
- Link types (sync, async)
- Entity, StateTransition, BusinessRule
- Query result types

### Documentation

API documentation auto-generated from TSDoc comments.

## 4. What We're NOT Building

- Builder functionality (Phase 6)
- CLI (Phase 7)
- Visualization (Éclair, separate)

## 5. Success Criteria

- [ ] All POC query functionality implemented
- [ ] Works in browser (verified with simple HTML test page)
- [ ] Works in Node.js
- [ ] 100% test coverage
- [ ] Bundle size < 50KB (minified)
- [ ] API documentation generated
- [ ] Schema bundled at build time
- [ ] Validates example graphs correctly
- [ ] TypeScript strict mode, no `any`
- [ ] Passes lint with strict ESLint config

## 6. Reference

**POC Implementation (specification, not to copy):**
- `~/code/riviere/riviere/poc/client/src/query.ts` — RiviereQuery class
- `~/code/riviere/riviere/poc/client/src/types.ts` — Type definitions

**POC Documentation:**
- `~/code/riviere/riviere/client/docs/api/riviere-query.md` — API reference

**Schema:**
- `./schema/riviere.schema.json` — The contract (in this repo)

## 7. Open Questions

1. **Validation library** — Use `ajv` for JSON Schema validation? It's the standard but adds bundle size.
2. **Tree-shaking** — Ensure unused query methods can be tree-shaken for smaller bundles.

---

## Dependencies

**Blocks:**
- Phase 6 (Builder) — Builder depends on Query
- Phase 7 (CLI) — CLI depends on Query
- Éclair migration — Éclair needs Query package to replace POC imports
