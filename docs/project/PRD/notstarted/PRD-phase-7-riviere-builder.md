# PRD: Phase 7 — Riviere Builder Package

**Status:** Draft

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

  // Finding (for linking)
  findComponent(criteria: FindCriteria): Component | undefined
  findApiByHttpRoute(method: string, path: string): Component | undefined
  getComponents(): Component[]
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
  build(path: string): void  // Validates and writes to file

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

**Error Messages:**
- Actionable: Tell user what's wrong AND how to fix it
- Include near-matches when component not found
- AI-friendly: Enable self-correction

### Documentation

API documentation auto-generated from TSDoc comments.

## 4. What We're NOT Building

- CLI (Phase 7)
- Graph merging (Phase 8)
- Extraction from source code (future)

## 5. Success Criteria

- [ ] All POC builder functionality implemented
- [ ] 5-phase extraction algorithm works as documented
- [ ] ID generation matches spec (deterministic, kebab-case)
- [ ] Error messages are actionable (tested with example errors)
- [ ] Near-match suggestions work for typos
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

## 7. Open Questions

1. **File system dependency** — `build(path)` requires Node.js fs. Should this be in builder or CLI only?
2. **Session persistence** — POC has `serialize()`/`resume()` for draft graphs. Keep this pattern?

---

## Dependencies

**Depends on:**
- Phase 5 (Query) — Builder imports and uses RiviereQuery

**Blocks:**
- Phase 7 (CLI) — CLI wraps Builder
- Phase 8 (Graph merging) — Merging uses Builder
- Éclair migration — After this, Éclair can migrate
