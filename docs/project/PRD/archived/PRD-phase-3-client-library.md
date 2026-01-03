# PRD: Phase 3 — Rivière Client Library
**Status:** Accepted

---

## Problem

Developers want to create Rivière graphs of their codebase, but they aren't familiar with the Rivière schema. The schema has 7 node types, multiple edge types, ID conventions, sourceLocation requirements, and domain metadata structures. Without guidance, developers either:
- Miss capabilities the schema offers
- Make mistakes that only surface at validation time
- Give up due to complexity

## Solution

**A client library** that simplifies the experience and guides users in the right direction, allowing them to exploit the full potential of the schema.

**An AI wrapper** (CLI) that allows AI coding assistants to automatically map a codebase and generate the schema, reducing even further the effort needed by developers.

### Two Paths

| Path | Characteristics | Use Case |
|------|----------------|----------|
| **Client Library** | Low-level, deterministic | Tools like ts-morph, programmatic extraction |
| **AI Wrapper (CLI)** | Easier to use, less deterministic | AI assistants mapping codebases automatically |

Both paths produce the same output: valid Rivière JSON graphs.

## Why Now

Phase 3 is the foundation for:
- **Phase 4:** Extraction tools that programmatically generate graphs
- **Phase 5:** Developer experience for using tools in any codebase
- **Phase 6:** Launch — polished, documented, ready for users

Without the client library, extraction tools would need to generate raw JSON, losing guidance and validation.

## Design Principles

### 1. Guide Users Toward Schema Capabilities
**The library should make the "right thing" easy and the "wrong thing" hard.**

Users unfamiliar with the schema should discover its capabilities through the API:
- Type-specific builders surface required and optional fields
- IDE autocomplete reveals available options
- Validation explains what's wrong AND how to fix it

### 2. Fail Early, Fail Loudly
**Errors should surface immediately with actionable messages.**

When something is wrong, messages should:
- Explain what's wrong
- Suggest how to fix it
- Show similar/related options when relevant

Not just: `"Error: Invalid edge"`

### 3. Two Paths, Same Destination
**Library and CLI produce identical, valid output.**

The CLI wraps the library. Both enforce the same schema. Output is deterministic given the same inputs.

### 4. AI-Friendly CLI
**The CLI is designed for AI coding assistants.**

- Atomic commands (one action per command)
- Clear error messages that enable AI self-correction
- Deterministic output
- `--help` with examples for every command

### 5. Publishable Quality
**This ships to users. Apple-level polish.**

- Comprehensive documentation with examples
- Clear, consistent API naming
- Helpful error messages
- Test coverage for all edge cases

## What We're Building

### 1. TypeScript Client Library

A programmatic API for constructing Rivière graphs.

**Required capabilities:**
- Create and configure graphs (name, description, sources, domains)
- Add nodes of all 7 types with type-specific validation
- Register custom node types with required/optional fields
- Automatic ID generation following schema convention
- Add edges with source/target validation
- Comprehensive error messages with suggestions
- Export validated JSON

**Illustrative example** (design to be validated via POC):
```typescript
// This is demonstrative — actual API to be discussed during implementation

const graph = new RiviereGraph({
  name: 'ecommerce-demo',
  description: 'E-commerce order flow'
});

graph.addDomain('orders', { description: '...', systemType: 'domain' });

const api = graph.addAPI({
  name: 'Place Order',
  domain: 'orders',
  module: 'checkout',
  httpMethod: 'POST',
  path: '/orders',
  sourceLocation: { /* ... */ }
});

const json = graph.toJSON();
```

### 2. CLI Wrapper (AI Interface)

Commands for AI coding assistants and scripting.

**Required capabilities:**
- Initialize graphs
- Add domains, nodes, edges
- Validate graphs
- Export to JSON
- Clear error messages with fix suggestions
- `--help` for every command

**Illustrative example** (design to be validated via POC):
```bash
# This is demonstrative — actual CLI to be discussed during implementation

riviere init --name="ecommerce" --description="..."
riviere add-domain orders --description="..." --system-type=domain
riviere add-node --type=API --name="Place Order" --domain=orders ...
riviere add-edge --from="..." --to="..." --type=invokes --flow=sync
riviere export --output=graph.json
```

### 3. AI System Prompt / Algorithm

For AI to effectively generate graphs, we need to provide:
- **A system prompt** with instructions for AI coding assistants
- **An algorithm to follow** — step-by-step process for mapping a codebase
- **Examples** of expected behavior and output

This is as important as the CLI itself — without guidance, AI won't know how to use the tools effectively.

**Design Decisions:**

| Aspect | Decision |
|--------|----------|
| **Algorithm strictness** | Provide multiple strategies; AI handles vagueness (that's the benefit) |
| **Discovery approaches** | Document both top-down (entry points) and domain-first; AI chooses based on codebase |
| **Ambiguity handling** | Configurable: user sets preference at extraction start (ask / guess+note / skip+note) |

**Code Pattern Recognition (Guidance, not prescription):**

| TypeScript Pattern | → Node Type |
|-------------------|-------------|
| Express/Fastify route handler | API |
| React component with route | UI |
| Class orchestrating domain logic | UseCase |
| Method on entity class | DomainOp |
| `eventEmitter.emit()` / `publish()` | Event |
| `eventEmitter.on()` / `subscribe()` | EventHandler |

AI has discretion to adapt these patterns to the specific codebase structure.

### 4. External System Links

Links from internal components to external third-party systems (Stripe, FedEx, SendGrid, etc.).

**Use Cases:**
- Payment service calls Stripe API
- Shipping service calls FedEx tracking API
- Notification service sends via SendGrid

**Behavior:**
- Source component must exist in graph
- Target is an external system reference (name, optional domain/repository/url)
- No target component validation (it's external)
- Link type: `sync` or `async`

**Implementation:**
- Library: `linkExternal(source, target, type, options?)` method
- CLI: `link-external --from <id> --name <name> --type <type> [--domain] [--url] [--description]`
- Schema: Separate `externalLinks` array in graph output

### 5. Graph Merging

Combine graphs from multiple repositories or domains.

**Use Cases:**
- **Multi-repo services:** Teams extract their own service graphs, then merge to see cross-service flows
- **Monorepo domains:** Different domains in same repo extracted separately, then combined

**Behavior:**
- ID collision = error (IDs should be globally unique by design)
- External API links resolved to matching APIs by `{domain, httpMethod, path}`
- External event links resolved to matching EventHandlers by `{domain, eventName}`
- Unresolved external links = error with details about what was expected

**Implementation:** Library method + CLI command

### 6. Documentation

- Getting Started guide
- API Reference
- CLI Reference
- AI Integration guide (including the system prompt/algorithm)
- Examples

## What We're NOT Building

- **Extraction tools** — That's Phase 4
- **Visual editor** — Éclair is read-only
- **Code generators** — We generate graphs FROM code, not code from graphs
- **Multi-language libraries** — TypeScript only; other languages use CLI

## Delivery Approach

**Design-first, not code-first:**

1. **POC** — Validate the API design with a proof of concept
2. **Documentation** — Document the validated API design
3. **Implementation** — Build the full library against the documented design

This ensures we don't commit to an API that doesn't work well in practice.

### Deliverables (in order)

1. **API POC** — Minimal implementation to validate library API design
2. **Library Demo** — Show the validated API working
3. **AI System Prompt** — Algorithm for AI to follow when generating graphs
4. **CLI POC** — Validate CLI design (informed by system prompt)
5. **AI CLI Demo** — Prove AI can use it with the system prompt
6. **Full Implementation** — Complete library and CLI
7. **Documentation** — Comprehensive docs

**Pre-tasks (before implementation):**
- Update existing example files to consistent kebab-case ID format
- Update schema documentation to specify kebab-case as the convention
- Simplify edge schema: merge `type` and `flowType` into single `type` field (`sync` | `async`)

## Milestones

### M0: Schema Refinements
- Edge schema simplified to single `type` field
- Example files migrated to new edge format
- Validation code updated for new edge format
- Example files updated to consistent kebab-case IDs
- Schema documentation updated to specify kebab-case convention

### M1: Library POC to Validate API
- Minimal library POC
- Library demo — recreate minimal.json

### M2: Library Documentation
- Library API specification

### M3: AI + CLI POC
- AI system prompt and algorithm
- CLI POC
- AI CLI demo

### M4: AI + CLI Documentation
- CLI specification

### M5: Client Library
- Project Setup: AI-first codebase foundation and best practices template
- Graph creation and configuration
- Domain management
- Node builders for all 7 types with type-specific validation
- Edge management with validation
- Automatic ID generation (kebab-case convention)
- Export to validated JSON
- Error messages with suggestions
- Library test coverage >90%

### M6: AI / CLI
- CLI core commands (init, add-domain, add-node, add-edge, validate, export)
- Help text with examples for every command
- Error messages with fix suggestions
- Session state management
- CLI test coverage >90%

### M7: Cross-Repository Merging
- External link methods
- Merge algorithm
- Merge CLI command

### M8: Product Launch
- Getting Started guide
- API Reference
- CLI Reference
- AI Integration guide
- npm packaging
- CI/CD setup

---

## Deliverable Details

### M0: Schema Refinements — Deliverables

#### Deliverable M0.1: Edge schema simplified to single `type` field

**Implements:** Pre-tasks (edge schema simplification)

##### Read First
- §2 Design Principles — understand "fail early" and error message requirements
- §4.2 API Strictness — edge type values referenced in error example

##### Key Decisions
- Merge `type` (invokes/publishes/subscribes) + `flowType` (sync/async/event) → single `type` field
- New values: `sync` | `async` (not `event` — that's implied by node types)
- Action verbs removed — inferable from source/target node types

##### Delivers
Schema accepts edges with `type: "sync"` or `type: "async"` only. Old fields rejected.

##### Acceptance Criteria
- Schema rejects edges with old `flowType` field → clear error
- Schema rejects edges with old `type` values (invokes/publishes/subscribes) → clear error
- Schema accepts `{ source, target, type: "sync" }` → valid
- Schema accepts `{ source, target, type: "async" }` → valid
- Schema documentation updated with new field

##### Dependencies
- None

##### Related Code
- `/riviere/schema/riviere.schema.json` — edge definition (~lines 245-296)

##### Verification
```bash
cd riviere && npm test
cd riviere && npm run lint
```

---

#### Deliverable M0.2: Example files migrated to new edge format

**Implements:** Pre-tasks (example file migration)

##### Read First
- M0.1 — understand the new edge format

##### Key Decisions
- All edges converted: `type: "invokes", flowType: "sync"` → `type: "sync"`
- All edges converted: `type: "publishes", flowType: "event"` → `type: "async"`
- All edges converted: `type: "subscribes", flowType: "event"` → `type: "async"`

##### Delivers
All 5 example JSON files use new edge format and pass validation.

##### Acceptance Criteria
- `minimal.json` — all edges use `type: sync|async`, no `flowType`
- `node-types.json` — all edges use `type: sync|async`, no `flowType`
- `edge-metadata.json` — all edges use `type: sync|async`, no `flowType`
- `ecommerce-complete.json` — all edges use `type: sync|async`, no `flowType`
- `ecommerce-complete-v2.json` — all edges use `type: sync|async`, no `flowType`
- All files pass: `npm run validate:all`

##### Dependencies
- M0.1 complete (schema updated)

##### Related Code
- `/riviere/examples/*.json` — 5 files to update

##### Verification
```bash
cd riviere && npm run validate:all
```

---

#### Deliverable M0.3: Validation code updated for new edge format

**Implements:** Pre-tasks (validation code)

##### Read First
- M0.1 — understand the new edge format

##### Key Decisions
- TypeScript types updated to reflect new schema
- Tests updated to validate new format
- Tests added to reject old format

##### Delivers
Validation script and tests work with new edge format.

##### Acceptance Criteria
- `Edge` type in validate.ts has `type: 'sync' | 'async'`
- `Edge` type has no `flowType` field
- Existing tests pass
- New tests verify rejection of old format

##### Dependencies
- M0.1 complete (schema updated)

##### Related Code
- `/riviere/scripts/validate.ts` — types and validation logic
- `/riviere/scripts/__tests__/validate.test.ts` — tests

##### Verification
```bash
cd riviere && npm test
cd riviere && npm run validate:all
```

---

### M0 Timeline

- [ ] M0.1: Edge schema simplified
- [ ] M0.2: Example files migrated
- [ ] M0.3: Validation code updated

---

### M1: Library POC + Demo — Deliverables

#### Deliverable M1.1: Minimal library POC

**Implements:** §3.1 TypeScript Client Library (POC validation)

##### Read First
- §2 Design Principles — guide users, fail early, actionable errors
- §4.1 Extraction Workflow Pattern — flexible construction, validate at export
- §4.2 API Strictness — immediate vs deferred validation

##### Key Decisions
- POC validates the API design, not production implementation
- Must support: graph creation, domain addition, all 7 node types, edges, export
- Flexible construction: nodes/edges in any order, forward references allowed
- Validation at export time

##### Delivers
Minimal working library that can construct a graph programmatically and export valid JSON.

##### Acceptance Criteria
- Can create a graph with metadata
- Can add domains with required fields (description, systemType)
- Can add all 7 node types (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)
- Can register and use custom node types
- Can add edges between nodes
- Can export valid Rivière JSON
- Exported JSON passes `npm run validate`

##### Dependencies
- M0 complete (schema cleanup)

##### Related Code
- `/riviere/schema/riviere.schema.json` — schema to conform to
- `/riviere/scripts/validate.ts` — types to reference
- `/riviere/examples/minimal.json` — simple target to recreate

##### Verification
```bash
# POC can recreate minimal.json equivalent
cd riviere-client && npm test
cd riviere && npm run validate path/to/poc-output.json
```

---

#### Deliverable M1.2: Library demo — recreate minimal.json

**Implements:** §3.1 TypeScript Client Library (demo)

##### Read First
- M1.1 — POC must be complete

##### Key Decisions
- Demo proves POC works by recreating an existing example
- Output must match minimal.json structure

##### Delivers
Working demonstration that recreates `minimal.json` using the POC library.

##### Acceptance Criteria
- Demo script uses POC library to build graph
- Output JSON validates against schema
- Output structure matches minimal.json (same nodes, edges, metadata pattern)

##### Dependencies
- M1.1 complete

##### Related Code
- `/riviere/examples/minimal.json` — target to recreate

##### Verification
```bash
cd riviere-client && npm run demo:minimal
cd riviere && npm run validate path/to/demo-output.json
```

---

### M1 Timeline

- [ ] M1.1: Minimal library POC
- [ ] M1.2: Library demo

---

### M2: Library API Documentation — Deliverables

#### Deliverable M2.1: Library API specification

**Implements:** Delivery Approach step 2 (document validated design)

##### Read First
- M1 deliverables — understand what was validated in POC
- §2 Design Principles — principles the API must embody
- §4 Design Decisions — resolved decisions that constrain the API

##### Key Decisions
- This document becomes the spec for full implementation (M5)
- Documents the validated POC API, not a new design
- Includes: public API surface, method signatures, error message formats, ID generation rules

##### Delivers
Specification document that an engineer can implement against without ambiguity.

##### Acceptance Criteria
- Documents all public methods with signatures
- Documents all types/interfaces
- Documents error message format and examples
- Documents ID generation convention
- Documents validation rules (immediate vs deferred)
- No ambiguity — engineer can implement without asking questions

##### Dependencies
- M1 complete (POC validated)

##### Related Code
- POC implementation from M1

##### Verification
Review: Can an engineer implement the full library from this spec alone?

---

### M2 Timeline

- [ ] M2.1: Library API specification

---

### M3: AI System Prompt + CLI POC + Demo — Deliverables

#### Deliverable M3.1: AI system prompt and algorithm

**Implements:** §3.3 AI System Prompt / Algorithm

##### Read First
- §3.3 AI System Prompt — requirements and design decisions
- §2 Design Principles — AI-friendly CLI principle

##### Key Decisions
- Multiple strategies allowed (top-down, domain-first) — AI chooses based on codebase
- Code pattern recognition is guidance, not prescription
- Ambiguity handling configurable: ask / guess+note / skip+note

##### Delivers
Documentation that enables AI to use the CLI to map a codebase.

##### Acceptance Criteria
- Clear algorithm for AI to follow
- Pattern recognition guide (TypeScript patterns → node types)
- Ambiguity handling options documented
- Examples of expected behavior

##### Dependencies
- M2 complete (API spec defines what CLI will wrap)

##### Related Code
- `/ecommerce-demo-app/` — reference codebase for patterns

##### Verification
Review: Does prompt give AI clear enough instructions to proceed?

---

#### Deliverable M3.2: CLI POC

**Implements:** §3.2 CLI Wrapper (POC validation)

##### Read First
- M2.1 — Library API spec (CLI wraps library)
- M3.1 — AI system prompt (CLI must support the algorithm)
- §2.4 AI-Friendly CLI — atomic commands, clear errors, --help

##### Key Decisions
- CLI wraps the library (same validation, same output)
- Commands must be atomic (one action per command)
- Error messages must enable AI self-correction

##### Delivers
Minimal CLI that AI can use to construct graphs.

##### Acceptance Criteria
- `init` command creates graph
- `add-domain` command adds domain
- `add-node` command adds nodes (all 7 types)
- `add-edge` command adds edges
- `validate` command validates current graph
- `export` command exports JSON
- Every command has `--help` with examples
- Error messages explain what's wrong and suggest fixes

##### Dependencies
- M2.1 complete (API spec)
- M3.1 complete (system prompt informs CLI design)

##### Related Code
- Library from M1 (CLI wraps it)

##### Verification
```bash
riviere --help
riviere add-node --help
riviere init --name="test" && riviere validate
```

---

#### Deliverable M3.3: AI CLI demo

**Implements:** §3.2 CLI Wrapper (demo), §3.3 AI System Prompt (validation)

##### Read First
- M3.1 — AI system prompt
- M3.2 — CLI POC

##### Key Decisions
- Proves AI can use CLI + system prompt to generate a graph
- Target: recreate minimal.json via CLI commands

##### Delivers
Demonstration that AI can use CLI with system prompt to build a valid graph.

##### Acceptance Criteria
- AI (Claude) given system prompt + CLI access
- AI executes CLI commands to build graph
- Output JSON validates against schema
- AI can self-correct from error messages

##### Dependencies
- M3.1 complete
- M3.2 complete

##### Related Code
- `/riviere/examples/minimal.json` — target structure

##### Verification
Manual test: New Claude session with system prompt, build minimal.json equivalent using CLI.

---

### M3 Timeline

- [ ] M3.1: AI system prompt and algorithm
- [ ] M3.2: CLI POC
- [ ] M3.3: AI CLI demo

---

### M4: CLI Design Documentation — Deliverables

#### Deliverable M4.1: CLI specification

**Implements:** Delivery Approach step 2 (document validated design) for CLI

##### Read First
- M3 deliverables — understand what was validated in CLI POC
- §2.4 AI-Friendly CLI — principles the CLI must embody

##### Key Decisions
- This document becomes the spec for full CLI implementation (M5)
- Documents the validated CLI POC, not a new design
- Includes: all commands, all flags, all error messages, help text

##### Delivers
Specification document for CLI that an engineer can implement against.

##### Acceptance Criteria
- Documents all commands with full flag specifications
- Documents help text for each command
- Documents error message format and all error cases
- Documents session state management
- No ambiguity — engineer can implement without asking questions

##### Dependencies
- M3 complete (CLI POC validated)

##### Related Code
- CLI POC from M3

##### Verification
Review: Can an engineer implement the full CLI from this spec alone?

---

### M4 Timeline

- [ ] M4.1: CLI specification

---

### M5: Full Implementation — Deliverables

#### Deliverable M5.0: Project Setup

**Goal:** Research best practices for organizing an AI-first codebase. Establish a solid foundation and harness to allow AI to work autonomously while producing high quality code aligned to project principles and objectives.

##### Research Areas
1. AI-first best practices (lint, test coverage, TDD, design principles)
2. CI/CD prep + git hooks, repository validation
3. Output verification approach

##### Delivers
Empty project template that applies all best practices and documents them for future reuse.

##### Acceptance Criteria
- Project template with all tooling configured
- Best practices documented within the template
- Template is reusable for future projects

##### Dependencies
- M4 complete (design validated, ready for implementation)

##### Verification
- AI can start M5.1 using the template
- Guardrails catch quality issues automatically

---

#### Deliverable M5.1: Full library implementation

**Implements:** §3.1 TypeScript Client Library (full)

##### Read First
- M2.1 — Library API specification (build against this)
- §2 Design Principles — all principles must be embodied
- §4 Design Decisions — all decisions must be honored

##### Key Decisions
- Build against M2.1 spec, not POC
- Production quality: test coverage >90%, proper error handling
- Auto ID generation following schema convention

##### Delivers
Production-ready TypeScript library.

##### Acceptance Criteria
- Implements full API from M2.1 spec
- Can recreate `ecommerce-complete.json` programmatically
- TypeScript catches invalid configurations at compile time
- Runtime validation with helpful error messages
- Automatic ID generation: `{domain}:{module}:{type}:{name}`
- Custom type registration with field validation
- Test coverage >90%
- Passes lint

##### Dependencies
- M2.1 complete (API spec)

##### Related Code
- `/riviere/examples/ecommerce-complete.json` — full target

##### Verification
```bash
cd riviere-client && npm test
cd riviere-client && npm run lint
cd riviere-client && npm run test:coverage
cd riviere-client && npm run demo:ecommerce-complete
cd riviere && npm run validate path/to/ecommerce-output.json
```

---

#### Deliverable M5.2: Full CLI implementation

**Implements:** §3.2 CLI Wrapper (full)

##### Read First
- M4.1 — CLI specification (build against this)
- §2.4 AI-Friendly CLI — all principles must be embodied

##### Key Decisions
- Build against M4.1 spec, not POC
- Production quality: all commands, all flags, all help text
- Error messages enable AI self-correction

##### Delivers
Production-ready CLI.

##### Acceptance Criteria
- Implements full CLI from M4.1 spec
- All commands have complete `--help`
- Error messages explain what's wrong, suggest fixes, show alternatives
- CLI output matches library output for same inputs
- Test coverage >90%

##### Dependencies
- M4.1 complete (CLI spec)
- M5.1 complete (CLI wraps library)

##### Related Code
- Library from M5.1

##### Verification
```bash
cd riviere-client && npm run test:cli
riviere --help
# AI can build ecommerce-complete equivalent via CLI
```

---

### M5 Timeline

- [ ] M5.0: Project Setup
- [ ] M5.1: Full library implementation
- [ ] M5.2: Full CLI implementation

---

### M6: Graph Merging — Deliverables

#### Deliverable M6.1: External link methods

**Implements:** §3.4 Graph Merging, §4.3 Cross-Repository Edge Resolution

##### Read First
- §3.4 Graph Merging — use cases and behavior
- §4.3 Cross-Repository Edge Resolution — linking methods and match logic

##### Key Decisions
- Type-safe linking methods: `addExternalApiLink()`, `addExternalEventLink()`
- API links match by: `{domain, httpMethod, path}`
- Event links match by: `{domain, eventName}`

##### Delivers
Library methods for declaring cross-repository edges.

##### Acceptance Criteria
- `addExternalApiLink()` accepts domain, httpMethod, path
- `addExternalEventLink()` accepts domain, eventName
- Methods validate required fields immediately
- Links stored for resolution at merge time

##### Dependencies
- M5.1 complete (full library)

##### Related Code
- Library from M5.1

##### Verification
```bash
cd riviere-client && npm test -- --grep "external link"
```

---

#### Deliverable M6.2: Merge algorithm

**Implements:** §3.4 Graph Merging

##### Read First
- §3.4 Graph Merging — behavior requirements
- §4.3 Cross-Repository Edge Resolution — match logic

##### Key Decisions
- ID collision = error
- External links resolved by field matching
- Unresolved links = error with details

##### Delivers
Library method to merge two graphs.

##### Acceptance Criteria
- `merge(otherGraph)` combines nodes and edges
- ID collision produces clear error
- External API links resolved by exact match on `{domain, httpMethod, path}`
- External event links resolved by exact match on `{domain, eventName}`
- Unresolved links produce error with expected vs actual details

##### Dependencies
- M6.1 complete

##### Related Code
- External link methods from M6.1

##### Verification
```bash
cd riviere-client && npm test -- --grep "merge"
```

---

#### Deliverable M6.3: Merge CLI command

**Implements:** §3.4 Graph Merging (CLI)

##### Read First
- M6.2 — merge algorithm

##### Key Decisions
- CLI command wraps library merge method
- Clear error messages for merge failures

##### Delivers
CLI command to merge graph files.

##### Acceptance Criteria
- `riviere merge graph1.json graph2.json --output=combined.json`
- Success: outputs merged graph
- ID collision: clear error
- Unresolved links: error with details
- `--help` with examples

##### Dependencies
- M5.2 complete (full CLI)
- M6.2 complete (merge algorithm)

##### Related Code
- CLI from M5.2
- Merge algorithm from M6.2

##### Verification
```bash
riviere merge --help
riviere merge graph1.json graph2.json --output=test.json
cd riviere && npm run validate test.json
```

---

### M6 Timeline

- [ ] M6.1: External link methods
- [ ] M6.2: Merge algorithm
- [ ] M6.3: Merge CLI command

---

### M7: End-user Docs + Packaging — Deliverables

#### Deliverable M7.1: Getting Started guide

**Implements:** §3.5 Documentation

##### Read First
- §2.5 Publishable Quality — Apple-level polish

##### Key Decisions
- 5-minute path to first graph
- Covers both library and CLI

##### Delivers
Quick start documentation.

##### Acceptance Criteria
- Installation instructions
- First graph in <5 minutes (library)
- First graph in <5 minutes (CLI)
- Links to full references

##### Dependencies
- M5 complete (full implementation)

##### Related Code
- None

##### Verification
Review: Can a new user create their first graph in 5 minutes?

---

#### Deliverable M7.2: API Reference

**Implements:** §3.5 Documentation

##### Read First
- M2.1 — Library API spec

##### Key Decisions
- Generated from TypeDoc or similar
- All public methods documented

##### Delivers
Complete API reference documentation.

##### Acceptance Criteria
- All public methods documented
- All types/interfaces documented
- Examples for common operations
- Generated from source (stays in sync)

##### Dependencies
- M5.1 complete

##### Related Code
- Library source with JSDoc comments

##### Verification
```bash
cd riviere-client && npm run docs:api
# Review generated docs
```

---

#### Deliverable M7.3: CLI Reference

**Implements:** §3.5 Documentation

##### Read First
- M4.1 — CLI spec

##### Key Decisions
- All commands with all flags
- Examples for each command

##### Delivers
Complete CLI reference documentation.

##### Acceptance Criteria
- All commands documented
- All flags documented
- Examples for each command
- Matches `--help` output

##### Dependencies
- M5.2 complete

##### Related Code
- CLI help text

##### Verification
Review: Does doc match `riviere --help` output for all commands?

---

#### Deliverable M7.4: AI Integration guide

**Implements:** §3.5 Documentation, §3.3 AI System Prompt

##### Read First
- M3.1 — AI system prompt

##### Key Decisions
- How to use system prompt with AI assistants
- Workflow documentation
- Troubleshooting common issues

##### Delivers
Guide for using AI to generate graphs.

##### Acceptance Criteria
- System prompt included or linked
- Step-by-step workflow
- Troubleshooting section
- Examples of AI-generated graphs

##### Dependencies
- M3.1 complete (system prompt)
- M5 complete (full implementation)

##### Related Code
- System prompt from M3.1

##### Verification
Review: Can a user set up AI integration following this guide?

---

#### Deliverable M7.5: npm packaging

**Implements:** §2.5 Publishable Quality

##### Read First
- §2.5 Publishable Quality — npm publishing requirements

##### Key Decisions
- Package ready for npm publish (actual publish in Phase 6)
- Proper exports, bin configuration, README

##### Delivers
Package ready for npm publishing.

##### Acceptance Criteria
- package.json has correct metadata (name, version, description, keywords)
- README provides clear value proposition
- exports configured correctly
- bin configured for CLI
- `npm pack` produces correct package
- `npm publish --dry-run` succeeds

##### Dependencies
- M5 complete
- M7.1-M7.4 complete (docs ready)

##### Related Code
- `/riviere-client/package.json`

##### Verification
```bash
cd riviere-client && npm pack
cd riviere-client && npm publish --dry-run
```

---

#### Deliverable M7.6: CI/CD setup

**Implements:** §5 Non-Functional Requirements

##### Read First
- §5 Non-Functional Requirements — CI/CD prep

##### Key Decisions
- GitHub Actions for test/lint/build on PR
- Publish workflow for releases (used in Phase 6)

##### Delivers
CI/CD pipeline configuration.

##### Acceptance Criteria
- PR validation: test, lint, build
- Release workflow ready (triggered manually or by tag)
- All checks pass on current codebase

##### Dependencies
- M5 complete

##### Related Code
- `/.github/workflows/`

##### Verification
```bash
# Push PR, verify checks run
# All checks pass
```

---

### M7 Timeline

- [ ] M7.1: Getting Started guide
- [ ] M7.2: API Reference
- [ ] M7.3: CLI Reference
- [ ] M7.4: AI Integration guide
- [ ] M7.5: npm packaging
- [ ] M7.6: CI/CD setup

---

## Success Criteria

### Library
- [ ] Can programmatically create graphs equivalent to existing examples
- [ ] Type safety: TypeScript catches invalid configurations at compile time
- [ ] Validation: Runtime catches schema violations with helpful messages
- [ ] ID generation: Automatic, following schema convention
- [ ] Test coverage: >90%

### CLI
- [ ] AI (Claude) can generate the full ecommerce-complete graph using CLI + system prompt
- [ ] Commands are atomic, predictable, well-documented
- [ ] Error messages enable AI self-correction

### AI Integration
- [ ] System prompt provides clear algorithm for AI to follow
- [ ] AI can self-correct based on error messages
- [ ] Generated graphs are valid and match expected structure

### Quality
- [ ] Documentation is comprehensive and approachable
- [ ] Published to npm with proper packaging
- [ ] Passes all lint, test, and build checks
- [ ] Code follows project best practices (TDD, software design principles)

## Design Decisions

### 1. Extraction Workflow Pattern — RESOLVED
**Decision:** Flexible — support both two-pass and streaming patterns.

The library will not enforce a specific extraction workflow. Both programmatic extraction (two-pass: nodes first, then edges) and AI-driven generation (streaming: discover nodes and edges together) are valid patterns.

**Implementation:**
- Allow nodes and edges to be added in any order
- Allow edges to reference node IDs that don't exist yet (forward references)
- Resolve and validate all references at export time
- Provide clear errors for unresolved references

**Rationale:** Research into Graphology, dependency-cruiser, and AI code analysis tools (Aider, Cody, Cursor) shows that successful tools separate construction from validation. Flexible construction with strict export-time validation supports both use cases.

*See: [Extraction Workflow Research](./research/extraction-workflow-api-strictness.md)*

### 2. API Strictness — RESOLVED
**Decision:** Hybrid — immediate validation for schema/type compliance, deferred validation for structural concerns.

| Validation Type | When | Why |
|-----------------|------|-----|
| Schema compliance (required fields, types) | Immediate | Catch typos early, good DX |
| Type-specific rules (e.g., httpMethod for API) | Immediate | Catch invalid values before they propagate |
| ID format validation | Immediate | Catch malformed IDs early |
| Edge targets exist | Deferred (export) | Allow forward references |
| Graph completeness (no orphans) | Deferred (export) | Requires complete graph |

**Error Message Requirements:**
Errors must enable AI self-correction. Each error should:
1. Explain what's wrong
2. Suggest how to fix it
3. Show valid alternatives when relevant
4. Be machine-parseable for programmatic handling

**Example:**
```text
Error: Unknown edge type 'sync'
  Location: edge from 'api-orders-place' to 'uc-orders-place'
  Provided type: 'sync'
  Valid types: sync-call, async-event, data-flow
  Suggestion: Did you mean 'sync-call'?
```

**Rationale:** Research shows AI self-correction requires external feedback (validation errors, test results). Rich, actionable error messages are critical for AI-driven workflows. Immediate validation catches errors early; deferred validation enables flexible construction patterns.

*See: [API Strictness Research](./research/extraction-workflow-api-strictness.md)*

### 3. Cross-Repository Edge Resolution — RESOLVED
**Decision:** Type-safe linking methods with field-based matching at merge time.

Cross-repository edges are declared using explicit, type-safe methods that capture the minimum fields required for unambiguous linking:

| Link Type | Method | Required Fields | Match Logic |
|-----------|--------|-----------------|-------------|
| API → API (sync) | `graph.addExternalApiLink()` | `domain`, `httpMethod`, `path` | Exact match on all three fields |
| Event → Handler (async) | `graph.addExternalEventLink()` | `domain`, `eventName` | Exact match on both fields |
| UI → API (sync) | Same as API → API | `domain`, `httpMethod`, `path` | Exact match on all three fields |

**Merge Behavior:**
- **Exact match found:** Create the edge automatically
- **No match found (library mode):** Error with details about what was expected vs. what exists
- **No match found (AI mode):** Propose closest matches, let AI decide

**Rationale:**
- Type-safe methods make intent explicit and catch errors at compile time
- Minimum required fields prevent over-specification while ensuring unambiguous matches
- Different behavior for library vs. AI mode supports both deterministic tooling and flexible AI-driven workflows

### 4. ID Generation — RESOLVED
**Decision:** Library generates all IDs automatically. Names come from code artifacts, lowercased.

Users provide node properties (domain, module, type, name, etc.); library constructs the ID following these conventions:

| Node Type | ID Format | Example |
|-----------|-----------|---------|
| API | `{domain}:{module}:api:{httpMethod}:{path}` | `orders:checkout:api:post:/orders` |
| UI | `{domain}:{module}:ui:{name}` | `ui:checkout:ui:place-order-form` |
| UseCase | `{domain}:{module}:usecase:{name}` | `orders:checkout:usecase:place-order` |
| DomainOp | `{domain}:{module}:domainop:{entity}.{method}` | `orders:checkout:domainop:order.begin` |
| Event | `{domain}:{module}:event:{event-name}` | `orders:checkout:event:order-placed` |
| EventHandler | `{domain}:{module}:eventhandler:{event-name}` | `shipping:preparation:eventhandler:order-placed` |
| Custom | `{domain}:{module}:{custom-type}:{name}` | `messaging:orders:queue:order-events` |

**Name derivation:** Names reflect code artifacts (file names, class names), lowercased. The library does NOT transform names—if the code file is `place-order-use-case.ts`, the ID uses `place-order`. If the code uses `PlaceOrder`, the ID uses `placeorder`.

**DomainOp notation:** DomainOps use `entity.method` dot notation to clearly show the class and method relationship.

**Collision handling:** If generated ID already exists, append `:lineNumber`. Library detects collision automatically.

### 5. Custom Node Type Registration — RESOLVED
**Decision:** Register-then-use pattern with simple field validation.

Consumers can define custom node types beyond the 7 built-in types. Custom types are registered upfront, then used like any built-in type.

**Mechanism:**
```typescript
graph.registerNodeType('Queue', {
  requiredFields: ['queueName', 'messageType'],
  optionalFields: ['dlqEnabled']
});

// Then use like any built-in type
graph.addNode({
  type: 'Queue',
  domain: 'messaging',
  module: 'orders',
  queueName: 'order-events',
  messageType: 'OrderPlaced'
});
```

**Validation:**
- Required fields must be present
- Field types validated (string, number, boolean, etc.)
- No complex validation rules

**Rationale:** Upfront registration enables IDE autocomplete and early validation. Simple field validation keeps the API predictable without over-engineering.

### 6. Graph State Model (Draft → Valid) — RESOLVED
**Decision:** Graph is in Draft state during building, transitions to Valid only when `build()` succeeds.

| State | Description |
|-------|-------------|
| **Draft** | Graph under construction. No guarantees about validity. |
| **Valid** | `build()` succeeded. Graph is complete, consistent, and schema-compliant. |

**Implications:**
- All add/link/enrich commands operate on draft state
- `check-consistency` (CLI) / `validate()` (library) is optional mid-build diagnostic
- `build()` is the only path to valid output

**Rationale:** Clear mental model. No guarantees until explicit finalization. Matches builder pattern.

### 7. Two-Level Validation — RESOLVED
**Decision:** Validation has two distinct checks, both run by `build()`:

| Check | What It Validates | When |
|-------|-------------------|------|
| **Consistency** | Internal references (dangling refs, unknown domains) | Runs first |
| **Schema** | Output matches Rivière JSON Schema | Runs second |

**CLI Commands:**
- `check-consistency` — runs consistency check only (mid-build diagnostic)
- `build` — runs both checks, produces output if valid

**Rationale:** Different failure modes, different fixes. Consistency is structural, schema is format. Separating them provides clearer error messages.

### 8. Runtime Schema Validation — RESOLVED
**Decision:** `build()` validates output against JSON Schema at runtime using ajv (safety net).

**Implementation:**
```typescript
build(): RiviereGraph {
  const validation = this.validate()  // consistency check
  if (!validation.valid) {
    throw new Error(`Consistency check failed:\n${validation.errors.join('\n')}`)
  }

  const graph = { version, metadata, nodes, edges }
  this.validateAgainstSchema(graph)  // schema validation
  return graph
}
```

**Implications:**
- `ajv` + `ajv-formats` are library dependencies
- Schema validation errors are build-time failures, not runtime surprises
- Catches any drift between TypeScript types and JSON Schema

**Rationale:** TypeScript types should guarantee schema compliance, but runtime validation catches drift between types and schema. Defense in depth.

### 9. CLI Mirrors Library API — RESOLVED
**Decision:** CLI commands map 1:1 to library methods where possible.

| CLI Command | Library Method |
|-------------|----------------|
| `check-consistency` | `validate()` |
| `build` | `build()` |

**Rationale:** Symmetry reduces cognitive load. CLI is thin wrapper, not separate abstraction. Changes in one should be reflected in the other.

### 10. Checklist-Driven Workflow — RESOLVED
**Decision:** AI generates checklist → reads component IDs from checklist → uses IDs in subsequent commands.

**Workflow:**
1. AI adds components (IDs are generated, returned in output)
2. AI runs `component-checklist` to get markdown list of all component IDs
3. AI reads the checklist file to get exact IDs
4. AI uses those IDs in `link --from <id>` and `enrich --component <id>` commands

**Rationale:** AI doesn't know IDs upfront. IDs are generated by the library based on component properties. The checklist provides a reliable way for AI to discover and use correct IDs.

### 11. Link Command Asymmetry — RESOLVED
**Decision:** `--from` takes exact component ID (from checklist), `--to-*` takes lookup criteria.

```bash
riviere builder link \
  --from "orders:checkout:usecase:placeorder" \    # Exact ID from checklist
  --to-type DomainOp --to-domain orders --to-name "Order.begin()" \  # Lookup criteria
  --type sync
```

| Parameter | Input | How It Works |
|-----------|-------|--------------|
| `--from` | Component ID | Direct lookup by ID |
| `--to-*` | Type, domain, name | Criteria-based search |

**Rationale:** Source component is known (AI read it from checklist). Target is discovered by criteria (AI knows what it's looking for but not the exact ID). This matches how AI naturally works through the codebase.

### 12. Single File with DRAFT Prefix — RESOLVED
**Decision:** One file at a time. DRAFT prefix indicates building phase.

| Phase | File | Format |
|-------|------|--------|
| Building | `.riviere/DRAFT-{name}.json` | Session state |
| After `build` succeeds | `.riviere/{name}.json` | Schema format |

**Behavior:**
- `new-graph` creates `DRAFT-{name}.json`
- All add/link/enrich commands update `DRAFT-{name}.json`
- `build` success → creates `{name}.json`, deletes `DRAFT-*`
- `build` failure → draft remains, no output created

**Rationale:** Single file is simpler mental model. DRAFT prefix makes status obvious. No ambiguity about which file is the "real" output.

---

## CLI POC Acceptance Criteria

These criteria apply to the CLI POC (M3.2) and full implementation (M5.2):

### Build Command
- [ ] `build` output opens successfully in Eclair
- [ ] `build` writes nothing on failure (draft remains)
- [ ] `build` deletes DRAFT file on success
- [ ] `build` fails with clear error if consistency check fails
- [ ] `build` fails with clear error if schema validation fails
- [ ] Error messages distinguish "Consistency check failed" vs "Schema validation failed"

### Check-Consistency Command
- [ ] `check-consistency` passes even if schema validation would fail
- [ ] `check-consistency` only validates internal references (dangling refs, unknown domains)
- [ ] `check-consistency` reports orphan warnings

### File Management
- [ ] Only one graph file exists at any time (DRAFT-* or final)
- [ ] DRAFT prefix clearly indicates building phase
- [ ] Final output has no prefix

### Validation
- [ ] Schema validation catches TypeScript/schema drift
- [ ] Build output passes `npm run validate`

---

## Open Questions

None. All design decisions resolved.

*(This section maintained during Draft status. Removed when Approved.)*

---

## Non-Functional Requirements

1. AI-first best practices: lint, test coverage, TDD, software design principles
2. CI/CD prep + git hooks, repository validation
3. Output verification: tests confirming client output matches existing schema files

## References

### Research
- `/docs/project/prd/research/extraction-workflow-api-strictness.md` — Research on extraction patterns, API design, and AI tool analysis

### Schema & Code
- `/riviere/schema/riviere.schema.json` — Authoritative JSON Schema
- `/riviere/scripts/validate.ts` — Existing TypeScript types and validation
- `/riviere/examples/ecommerce-complete.json` — Target output example
- `/ecommerce-demo-app/` — Reference implementation

### Project Documentation
- `/docs/project/prd/rivere-p3.md` — Original rough notes
- `/docs/project/overview.md` — Project vision and phases
