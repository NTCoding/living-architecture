# PRD: Phase 10 — TypeScript Component Extraction

**Status:** Approved

**Depends on:** Phase 9 (Launch)

---

## 1. Problem

Architecture extraction currently relies on AI assistance—slow, non-deterministic, and impractical for CI integration.

We need deterministic TypeScript extraction that:
- Identifies architectural components (APIs, use cases, domain operations, events, handlers)
- Runs in seconds, not minutes
- Produces consistent results on every build
- Works as a library and CLI (can plug into existing workflows)

This phase focuses on components only. Metadata extraction comes in PRD 11, connection detection in PRD 12.

---

## 2. Design Principles

1. **Deterministic and fast** — Extraction runs in seconds. No AI, no network calls. Suitable for CI/every build.

2. **Language-agnostic DSL** — YAML/JSON config, validated by JSON Schema. Can support TypeScript, Java, C# extractors in the future.

3. **Simple detection rules** — `find` (classes/methods/functions) + `where` (predicates with explicit `and`/`or`).

4. **Enforcement as first-class concept** — Config without enforcement is unreliable. We provide simple enforcement for our conventions; document the principle for others.

5. **Module-based config** — Organize extraction rules by path/module at the top level. Single config, single extraction run.

6. **Schema validates everything** — Component types, find targets, predicate names, structure. Errors caught at config validation, not extraction runtime.

7. **Components only** — This phase extracts component nodes. Connections come later.

---

## 3. What We're Building

### Package Structure

| Package | Purpose |
|---------|---------|
| `@living-architecture/riviere-extract-config` | Config format definition (JSON Schema). What makes a valid extraction config. |
| `@living-architecture/riviere-extract-conventions` | Our decorators + default config + ESLint enforcement. |
| `@living-architecture/riviere-extract-ts` | TypeScript extractor. Reads config, extracts components. |

### Dependencies

```text
riviere-extract-ts
└── uses riviere-extract-config

riviere-extract-conventions
└── uses riviere-extract-config

riviere-cli
└── uses riviere-extract-ts
```

### Config DSL

Module-based structure with explicit `and`/`or` logic:

```yaml
modules:
  orders:
    path: 'orders/**'
    API:
      find: methods
      where:
        and:
          - hasDecorator: API
          - inClassWith:
              hasDecorator: APIController
    UseCase:
      find: classes
      where: hasDecorator: UseCase
    Event:
      find: classes
      where: extendsClass: DomainEvent
    DomainOp: notUsed
    EventHandler: notUsed
    UI: notUsed

  shipping:
    path: 'shipping/**'
    API:
      find: methods
      where: hasJSDoc: '@riviere API'
    UseCase:
      find: functions
      where: hasJSDoc: '@riviere UseCase'
    # ... etc
```

### Detection Predicates

| Predicate | Description |
|-----------|-------------|
| `hasDecorator` | Class/method has specified decorator |
| `hasJSDoc` | Has specified JSDoc tag |
| `extendsClass` | Extends specified base class |
| `implementsInterface` | Implements specified interface |
| `nameEndsWith` | Name ends with pattern |
| `nameMatches` | Name matches regex |
| `inClassWith` | Method is in class matching condition |
| `and` | All conditions must match |
| `or` | Any condition must match |

### Decorator References

Can reference decorators from specific packages:

```yaml
hasDecorator:
  from: '@nestjs/common'
  name: Get, Post, Put, Delete
```

### CLI Integration

Added to existing riviere-cli:

```bash
riviere extract --config ./extraction.config.yaml
riviere extract --config ./extraction.config.yaml --dry-run
```

### Output Format

Draft components as JSON. Not a valid Riviere graph (no connections). Implementation detail of CLI/extraction. Format documented in package.

---

## 4. What We're NOT Building

- **Metadata extraction** — Extracting component properties (HTTP paths, state transitions). PRD 11.
- **Connection detection** — Flow linking, event→handler matching. PRD 12.
- **Graph merging** — Combining multiple graphs. PRD 13.
- **Other language extractors** — TypeScript only. Java, C#, Go are future work.
- **Real-time extraction** — On-demand CLI, not file watcher.
- **IDE plugins** — ESLint provides IDE feedback. No custom VS Code extension.
- **Auto-generated enforcement** — We provide simple enforcement for our conventions; others write their own.
- **Config inheritance/extends** — Document the concept, but don't implement in v1.

---

## 5. Success Criteria

1. `riviere-extract-config` package published with JSON Schema
2. `riviere-extract-conventions` package published with decorators + default config + ESLint rule
3. `riviere-extract-ts` package published
4. `riviere extract` command added to CLI
5. Extraction runs in <5 seconds on ecommerce-demo-app
6. With enforcement enabled, 100% component detection (no false negatives)
7. ecommerce-demo-app updated with multi-strategy extraction per domain
8. Architecture docs updated with new packages + extraction principles
9. ADR created for DSL design decisions
10. Public docs updated for deterministic extraction
11. Domain terminology glossary updated

---

## 6. Milestones

### M1: DSL design documented and config schema exists

**Deliverables:**
- **D1.1:** ADR created
  - `docs/architecture/adr/001-extraction-dsl-design.md`
  - Documents: why YAML, predicate design, module-based structure, enforcement philosophy
  - Acceptance: ADR reviewed and approved
  - Verification: File exists, content complete

- **D1.2:** Domain terminology updated
  - Add terms: Extraction Config, Detection Predicate, Convention, Enforcement
  - Acceptance: Terms added to glossary
  - Verification: Terms in `definitions.glossary.yml`

- **D1.3:** `riviere-extract-config` package created
  - JSON Schema defining the DSL
  - Validates: modules, paths, component types, find targets, predicates
  - All 6 standard component types required (can be `notUsed`)
  - Package CLAUDE.md with principles
  - Acceptance: Invalid configs rejected with clear errors
  - Verification: Unit tests for valid/invalid configs, 100% coverage

---

### M2: Conventions package provides decorators and enforcement

**Deliverables:**
- **D2.1:** `riviere-extract-conventions` package created
  - Decorators: `@API`, `@UseCase`, `@DomainOp`, `@Event`, `@EventHandler`, `@UI`
  - Package CLAUDE.md with principles
  - Acceptance: Decorators can be applied to classes/methods
  - Verification: Unit tests, 100% coverage

- **D2.2:** Default config file
  - Uses our decorators
  - Ready-to-use for teams adopting our conventions
  - Acceptance: Config validates against schema
  - Verification: Schema validation test

- **D2.3:** ESLint enforcement rule
  - Rule: "every class must have a component decorator"
  - Clear error message guiding developer
  - Acceptance: Unannotated classes produce lint errors
  - Verification: ESLint rule tests

- **D2.4:** Domain terminology updated
  - Add term: Draft Component
  - Acceptance: Term added to glossary
  - Verification: Term in `definitions.glossary.yml`

---

### M3: TypeScript extractor identifies components

**Deliverables:**
- **D3.1:** `riviere-extract-ts` package created
  - Uses ts-morph for AST parsing
  - Reads config file
  - Package CLAUDE.md with principles
  - Acceptance: Package builds and exports extractor
  - Verification: Package compiles

- **D3.2:** All predicates implemented
  - `hasDecorator`, `hasJSDoc`, `extendsClass`, `implementsInterface`
  - `nameEndsWith`, `nameMatches`, `inClassWith`
  - `and`, `or` composable logic
  - Acceptance: Each predicate works correctly
  - Verification: Unit tests per predicate, 100% coverage

- **D3.3:** Draft component output
  - JSON format documented
  - Contains: component type, name, location (file, line), domain (from module path)
  - Acceptance: Output is valid JSON with all fields
  - Verification: Output schema tests

- **D3.4:** Architecture overview updated
  - `docs/architecture/overview.md` updated with new packages
  - Extraction principles documented (especially enforcement)
  - Acceptance: Developer understands extraction architecture
  - Verification: Review doc content

---

### M4: CLI command available

**Deliverables:**
- **D4.1:** `riviere extract` command
  - Added to riviere-cli
  - Accepts config file path
  - Outputs draft components JSON
  - Acceptance: Command executes successfully
  - Verification: CLI integration tests

- **D4.2:** Dry-run mode
  - `--dry-run` flag shows component counts without full output
  - Acceptance: Useful for validation
  - Verification: Test dry-run output

- **D4.3:** CLI docs updated
  - `apps/docs/reference/cli/` includes `riviere extract` command
  - Acceptance: Command documented with examples
  - Verification: Docs exist

- **D4.4:** Root CLAUDE.md updated
  - New packages added to package list
  - Acceptance: CLAUDE.md is current
  - Verification: Review file

---

### M5: Demo app and public docs complete

**Deliverables:**
- **D5.1:** ecommerce-demo-app updated
  - Each domain uses different extraction strategy:
    - orders: decorators
    - shipping: JSDoc
    - inventory: custom decorator mapping
    - payments: naming convention
  - Single config file with module-based rules
  - Acceptance: All domains annotated/configured
  - Verification: Config file exists, code annotated

- **D5.2:** Extraction validated on demo
  - Runs in <5 seconds
  - 100% components found (with enforcement enabled)
  - Acceptance: Extraction complete and accurate
  - Verification: Run extraction, verify counts

- **D5.3:** Public docs updated
  - `apps/docs/extract/` explains deterministic vs AI-assisted extraction
  - Getting started guide for extraction
  - Acceptance: Developer can follow docs to extract
  - Verification: Follow guide on fresh setup

---

## 7. Dependencies

**Depends on:**
- Phase 9 (Launch) — Packages published, CLI available

**Blocks:**
- Phase 11 (Metadata Extraction)
- Phase 12 (Connection Detection)
- Phase 13 (Graph Merging)

---

## 8. Reference

### Inspiration

- **sequence-mapper** (`/Users/nicktune/code/employee-management/tools/sequence-mapper`) — DSL-based extraction with ts-morph, detection strategies, field extractors
- **Research on existing DSLs:** ESLint selectors, TSQuery, ASTQ, Semgrep, CodeQL

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Config format | YAML/JSON | Language-agnostic, easy to validate with JSON Schema |
| AST parser | ts-morph | TypeScript-native, full type information |
| Detection | Decorators + ESLint | Guarantees accuracy over heuristics |
| Output | Draft JSON | Components only, connections in later PRD |
