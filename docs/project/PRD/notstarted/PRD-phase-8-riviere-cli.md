# PRD: Phase 8 — Riviere CLI

**Status:** Draft

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

## 3. What We're Building

### Package: `@living-architecture/riviere-cli`

**Installation:**
```bash
npm install @living-architecture/riviere-cli
npx riviere --help
```

**Command Structure:**

```
riviere <command> [options]

Graph Management:
  riviere init                    Initialize new graph
  riviere validate [file]         Validate graph
  riviere build                   Finalize and export graph

Metadata:
  riviere add-source              Add source repository
  riviere add-domain              Add domain

Components:
  riviere add-component           Add component (UI, API, UseCase, etc.)

Linking:
  riviere link                    Link two components
  riviere link-http               Link by HTTP route matching
  riviere link-external           Link to external system

Enrichment:
  riviere enrich                  Add state changes, business rules

Query:
  riviere query entry-points      List entry points
  riviere query domains           List domains with stats
  riviere query trace <id>        Trace flow from component
  riviere query orphans           Find orphan components

Utilities:
  riviere checklist               Show component checklist for linking
  riviere check-consistency       Validate graph consistency
  riviere reset-to-draft          Reset built graph to draft
```

**Example Session (AI Agent):**

```bash
# Initialize
riviere init --name "ecommerce" --output .riviere/graph.json

# Add metadata
riviere add-source --name "orders-service" --path "./orders"
riviere add-domain --name "orders" --description "Order management"

# Add components
riviere add-component --type API --name "place-order" --domain orders \
  --http-method POST --http-route "/orders"

riviere add-component --type UseCase --name "PlaceOrder" --domain orders

# Link
riviere link --from "orders:api:place-order" --to "orders:use-case:PlaceOrder" --type sync

# Or link by HTTP route (finds component automatically)
riviere link-http --method POST --route "/orders" \
  --to-type UseCase --to-name "PlaceOrder" --type sync

# Query
riviere query entry-points
riviere query orphans

# Build
riviere validate
riviere build
```

**Command Design:**

Each command:
- Has `--help` with examples
- Returns JSON on success (for AI parsing)
- Returns actionable error messages on failure
- Supports `--json` flag for structured output
- Logs progress to stderr, results to stdout

**AI System Prompt:**

Include a system prompt (`riviere ai-prompt`) that documents:
- The 6-step extraction workflow
- How to use each command
- Error recovery patterns
- Example session

### Documentation

- CLI reference auto-generated from command help text
- AI prompt included in docs

## 4. What We're NOT Building

- Graph merging commands (Phase 8)
- Source code extraction (future)
- Interactive/TUI mode

## 5. Success Criteria

- [ ] All commands from POC implemented
- [ ] Commands mirror library API (thin wrapper)
- [ ] `--help` on every command with examples
- [ ] JSON output mode for AI parsing
- [ ] Error messages include near-match suggestions
- [ ] AI system prompt documented
- [ ] Can recreate example graphs via CLI
- [ ] 100% test coverage
- [ ] TypeScript strict mode
- [ ] Passes lint with strict ESLint config
- [ ] Works with `npx` (no global install required)

## 6. Reference

**POC Implementation (specification, not to copy):**
- `~/code/riviere/riviere/poc/client/src/cli/` — CLI commands
- `~/code/riviere/riviere/poc/client/src/cli/cli-error-formatter.ts` — Error formatting

**POC Documentation:**
- `~/code/riviere/riviere/client/docs/cli/cli-reference.md` — CLI reference
- `~/code/riviere/riviere/client/docs/guide/ai-extraction.md` — AI workflow

## 7. Open Questions

1. **CLI framework** — Use Commander.js, yargs, or Clipanion?
2. **Graph storage** — Single file or directory structure for drafts?
3. **Session state** — How to track draft state between commands?

---

## Dependencies

**Depends on:**
- Phase 5 (Query) — CLI uses query for `query *` commands
- Phase 6 (Builder) — CLI wraps builder for all mutation commands

**Blocks:**
- Phase 8 (Graph merging) — Merging adds CLI commands
- AI extraction workflow — Full workflow available after CLI ships
