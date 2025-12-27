# PRD: Phase 8 — Riviere CLI

**Status:** Approved

**Depends on:** Phase 7 (Riviere Builder)

## 1. Problem

We need a CLI (`@living-architecture/riviere-cli`) that:
- Enables AI agents to extract architecture graphs from codebases
- Provides atomic, predictable commands for graph construction
- Supports both building and querying graphs
- Is AI-first but human-usable

The POC CLI exists but will be rewritten from scratch using the POC as a specification.

## 2. Design Principles

1. **AI-first** — Designed for AI coding assistants as primary users.
2. **Atomic commands** — Each command does one thing. Composable.
3. **Predictable** — Same inputs always produce same outputs.
4. **Self-documenting** — Comprehensive `--help` with examples.
5. **Error recovery** — Near-match suggestions when things go wrong.
6. **Thin wrapper** — CLI mirrors library API. No CLI-specific logic.
7. **Integration tests only** — CLI tests verify correct interaction with the underlying TypeScript library (`riviere-builder`, `riviere-query`). Domain logic is already tested in those packages—CLI tests should not duplicate that coverage.

## 3. What We're Building

### Package: `@living-architecture/riviere-cli`

**CLI Framework:** Commander.js

**Installation:**
```bash
npm install @living-architecture/riviere-cli
npx riviere --help
```

**Command Structure:**

Commands are organized into two groups mirroring the underlying libraries:

```
riviere builder <subcommand>    # → @living-architecture/riviere-builder
riviere query <subcommand>      # → @living-architecture/riviere-query
```

### Builder Commands

```
riviere builder init                    Initialize new graph
riviere builder add-source              Add source repository
riviere builder add-domain              Add domain
riviere builder add-component           Add component (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)
riviere builder link                    Link two components
riviere builder link-http               Link by HTTP route matching
riviere builder link-external           Link to external system
riviere builder enrich                  Add state changes, business rules
riviere builder validate                Validate graph against schema
riviere builder finalize                Export final graph
riviere builder component-summary       Generate component summary report
riviere builder component-checklist     Generate checklist for linking/enrichment
riviere builder check-consistency       Check for orphans and structural issues
```

### Query Commands

```
riviere query entry-points              List entry points (APIs, UIs, EventHandlers)
riviere query domains                   List domains with stats
riviere query trace <id>                Trace flow from component
riviere query orphans                   Find orphan components
riviere query components                List components (filterable by --domain, --type)
riviere query search <term>             Search components by name
```

### Graph Storage

Graphs are stored in `.riviere/` directory:
```
.riviere/
├── graph.json                 # Current graph (draft or finalized)
└── config/                    # Extraction config (managed by workflow, not CLI)
```

The CLI auto-detects the current graph by looking for `.riviere/graph.json`. Commands operate on this file by default. Use `--graph <path>` to specify a different file.

**Session persistence:** Each command reads the graph via `RiviereBuilder.resume()`, performs its operation, and writes back via `builder.serialize()`.

### Component ID Format

IDs follow the pattern: `{domain}:{type}:{name}` in kebab-case.

| Type | Example ID |
|------|------------|
| API | `orders:api:place-order` |
| UseCase | `orders:use-case:place-order` |
| DomainOp | `orders:domain-op:order-place` |
| Event | `orders:event:order-placed` |
| EventHandler | `orders:event-handler:send-confirmation` |
| UI | `checkout:ui:checkout-page` |
| Custom | `orders:message-queue:order-queue` |

### Example Session (AI Agent)

```bash
# Initialize with required sources and domains (variadic flags)
riviere builder init --name "ecommerce" \
  --domain orders "Order management" \
  --domain payments "Payment processing" \
  --source git https://github.com/org/orders-service ./orders

# Add more metadata later if needed
riviere builder add-source git https://github.com/org/payments-service ./payments
riviere builder add-domain shipping "Shipping and logistics"

# Add components
riviere builder add-component --type API --name "place-order" --domain orders \
  --http-method POST --http-path "/orders"

riviere builder add-component --type UseCase --name "PlaceOrder" --domain orders

# Link
riviere builder link --from "orders:api:place-order" \
  --to-type UseCase --to-domain orders --to-name "PlaceOrder" \
  --link-type sync

# Query
riviere query entry-points
riviere query orphans

# Validate and finalize
riviere builder validate
riviere builder finalize
```

### Output Format

All commands support `--json` flag for structured output.

**Default (human-readable):**
- Progress/status to stderr
- Results to stdout

**JSON mode (`--json`):**
- All output to stdout as JSON
- Consistent schema per command

**Success output example:**
```json
{
  "success": true,
  "data": { ... },
  "warnings": []
}
```

**Error output example:**
```json
{
  "success": false,
  "error": {
    "code": "COMPONENT_NOT_FOUND",
    "message": "Component 'orders:api:place-ordr' not found",
    "suggestions": [
      "orders:api:place-order",
      "orders:api:get-order"
    ]
  }
}
```

### Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| `COMPONENT_NOT_FOUND` | Referenced component doesn't exist | Check suggestions, verify ID format |
| `DOMAIN_NOT_FOUND` | Domain not registered | Run `add-domain` first |
| `DUPLICATE_COMPONENT` | Component with same ID exists | Use different name or check existing |
| `INVALID_LINK` | Link violates constraints | Check component types are linkable |
| `VALIDATION_ERROR` | Schema validation failed | Fix reported issues |
| `GRAPH_NOT_FOUND` | No graph in `.riviere/` | Run `init` first |
| `GRAPH_CORRUPTED` | Graph file is invalid JSON | Restore from git or re-extract |

Near-match suggestions use fuzzy matching (Levenshtein distance) on component names within the same domain.

### Command Design

Each command:
- Has `--help` with usage examples
- Returns structured JSON with `--json` flag
- Logs progress to stderr, results to stdout
- Includes near-match suggestions on errors
- Uses consistent flag naming across commands

### Documentation

- CLI reference auto-generated from Commander.js command definitions
- Published to docs site at `/cli/reference`
- AI extraction workflow at `/guide/extraction/`

## 4. What We're NOT Building

- Graph merging commands (future phase)
- Source code extraction (future)
- Interactive/TUI mode
- Workflow orchestration (stays in docs)

## 5. Success Criteria

**Functionality:**
- [ ] All builder commands work: `init`, `add-source`, `add-domain`, `add-component`, `link`, `link-http`, `link-external`, `enrich`, `validate`, `finalize`, `component-summary`, `component-checklist`, `check-consistency`
- [ ] All query commands work: `entry-points`, `domains`, `trace`, `orphans`, `components`, `search`
- [ ] Graph persistence via `.riviere/graph.json`
- [ ] Can complete full extraction workflow (steps 1-6) using only CLI commands

**AI-First:**
- [ ] `--json` flag on all commands with consistent schema
- [ ] Error messages include near-match suggestions
- [ ] All error codes documented and returned in JSON

**Quality:**
- [ ] `--help` on every command with at least one example
- [ ] 100% test coverage
- [ ] TypeScript strict mode, no `any`
- [ ] Passes lint with strict ESLint config

**Distribution:**
- [ ] Works with `npx` (no global install required)
- [ ] Binary named `riviere`

## 6. Reference

**POC Implementation (specification, not to copy):**
- `~/code/riviere/riviere/poc/client/src/cli/` — CLI commands
- `~/code/riviere/riviere/poc/client/src/cli/cli-error-formatter.ts` — Error formatting

**POC Documentation:**
- `~/code/riviere/riviere/client/docs/cli/cli-reference.md` — CLI reference
- `~/code/riviere/riviere/client/docs/guide/ai-extraction.md` — AI workflow

## 7. Resolved Questions

1. **CLI framework** — Commander.js. Simple, popular, good TypeScript support.

2. **Graph storage** — Single file at `.riviere/graph.json`. Builder's `serialize()`/`resume()` handles persistence. CLI manages file location.

3. **Session state** — The graph file is the state. Each command reads, modifies, writes. No separate session tracking.

4. **`init` command syntax** — Uses variadic flags for sources and domains: `--domain <name> <description>` and `--source <type> <url> [path]`. Repeat flags for multiples. At least one of each is required (matches RiviereBuilder.new() requirements).

5. **`link-http` implementation** — This is CLI orchestration, not a thin wrapper. It finds API components by HTTP path using query methods, then creates a link using `builder.link()`. Acceptable divergence from "thin wrapper" principle since it only composes existing library calls.

---

## 8. Milestones

### M1: CLI scaffolding works

Commander.js setup, `riviere --help` works, command routing in place.

#### Deliverables
- **D1.1:** Package setup with Commander.js
  - Acceptance: `npx riviere --help` shows command list
  - Verification: Manual test
- **D1.2:** Command routing for `builder` and `query` subcommands
  - Acceptance: `riviere builder --help` and `riviere query --help` work
  - Verification: Manual test

---

### M2: Builder commands work

All graph construction commands operational.

#### Deliverables
- **D2.1:** `init` creates new graph in `.riviere/graph.json`
  - Acceptance: Creates directory and valid graph file
  - Verification: Test file creation and content
- **D2.2:** `add-source`, `add-domain` add metadata
  - Acceptance: Metadata appears in graph, rejects duplicates
  - Verification: Tests for valid and invalid inputs
- **D2.3:** `add-component` adds all 7 component types
  - Acceptance: Each type created with correct fields, ID generated
  - Verification: Tests for each type
- **D2.4:** `link`, `link-http`, `link-external` create connections
  - Acceptance: Links created with correct types, validates source exists
  - Verification: Tests for each link type
- **D2.5:** `enrich` adds state changes and business rules
  - Acceptance: Enrichment attached to DomainOp components
  - Verification: Tests for enrichment
- **D2.6:** `validate` checks schema compliance
  - Acceptance: Returns validation result with errors
  - Verification: Tests with valid and invalid graphs
- **D2.7:** `finalize` exports completed graph
  - Acceptance: Validates and writes final graph
  - Verification: Test export
- **D2.8:** `component-summary` generates report
  - Acceptance: Outputs component counts by domain/type
  - Verification: Test output format
- **D2.9:** `component-checklist` generates work list
  - Acceptance: Outputs markdown checklist, supports `--type` filter
  - Verification: Test output format
- **D2.10:** `check-consistency` finds structural issues
  - Acceptance: Reports orphans, dangling references
  - Verification: Tests with problematic graphs

---

### M3: Query commands work

All graph inspection commands operational.

#### Deliverables
- **D3.1:** `entry-points` lists APIs, UIs, EventHandlers
  - Acceptance: Returns entry point components
  - Verification: Test with graph containing entry points
- **D3.2:** `domains` lists domains with stats
  - Acceptance: Returns domain list with component counts
  - Verification: Test output
- **D3.3:** `trace <id>` traces flow from component
  - Acceptance: Returns downstream components in order
  - Verification: Test with linked graph
- **D3.4:** `orphans` finds disconnected components
  - Acceptance: Returns components with no links
  - Verification: Test with graph containing orphans
- **D3.5:** `components` lists components with filters
  - Acceptance: Supports `--domain` and `--type` filters
  - Verification: Tests for filtering
- **D3.6:** `search <term>` finds components by name
  - Acceptance: Returns matching components
  - Verification: Tests for partial matches

---

### M4: Error handling with near-match suggestions

Actionable errors for AI recovery.

#### Deliverables
- **D4.1:** Error codes implemented for all failure modes
  - Acceptance: Each error returns structured code + message
  - Verification: Tests for each error code
- **D4.2:** Near-match suggestions on component not found
  - Acceptance: Suggests similar components when ID wrong
  - Verification: Tests with typos
- **D4.3:** JSON error format consistent across commands
  - Acceptance: All errors follow schema
  - Verification: Test error output format

---

### M5: JSON output mode

Structured output for AI parsing.

#### Deliverables
- **D5.1:** `--json` flag on all commands
  - Acceptance: Every command outputs valid JSON with flag
  - Verification: Tests for each command
- **D5.2:** Consistent success/error schema
  - Acceptance: All JSON follows documented schema
  - Verification: Schema validation tests

---

### M6: CLI reference docs generated

Documentation auto-generated from code.

#### Deliverables
- **D6.1:** Help text for all commands with examples
  - Acceptance: Every command has `--help` with at least one example
  - Verification: Manual review
- **D6.2:** CLI reference generated and published
  - Acceptance: Docs site has `/cli/reference` page
  - Verification: Build produces docs
- **D6.3:** Extraction workflow docs updated with final command names
  - Acceptance: Steps 1-6 use correct `riviere builder`/`riviere query` commands
  - Verification: Manual review

---

## 9. Dependencies

**Depends on:**
- Phase 5 (Query) — CLI uses RiviereQuery for `query *` commands
- Phase 7 (Builder) — CLI wraps RiviereBuilder for all mutation commands

**Blocks:**
- Future: Graph merging — Merging would add CLI commands
- AI extraction workflow — Full workflow available after CLI ships
