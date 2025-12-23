# PRD: Phase 4 — Monorepo Setup

**Status:** Draft

## 1. Problem

The Rivière project has grown organically into multiple packages (schema, client, eclair, demo app) but lacks proper monorepo infrastructure. Current issues:

- **No workspace coordination** — Each package has independent `node_modules`, manual version management
- **Schema copying** — Éclair copies schema in prebuild step instead of importing it
- **Inconsistent tooling** — Each package has its own ESLint, TypeScript, test configs
- **No versioning strategy** — Schema changes don't trigger coordinated releases
- **POC location** — Client library lives in `riviere/poc/client/` instead of proper package location
- **No public presence** — No production-ready README, no unified documentation site

This blocks production releases and makes the project hard to discover and use.

## 2. Design Principles

1. **Schema is the contract** — Schema version drives compatibility. All packages depend on schema.
2. **Unified versioning** — All packages share the same version number. v1.0.3 of builder = v1.0.3 of query.
3. **Atomic changes** — Schema change + consumer updates = one commit, one PR, one release.
4. **Shared tooling** — One ESLint config, one TypeScript base config, one CI pipeline.
5. **Separate concerns** — Query (browser-safe), Builder (Node.js), CLI (Node.js wrapper).
6. **AI-ready structure** — Clear conventions so Claude Code can navigate and modify confidently.
7. **Production-ready from day one** — README, docs, and structure as if already launched.

## 3. What We're Building

### Repository Structure

```
riviere/
├── schema/                     ← Schema at root (prominent, internal)
│   ├── riviere.schema.json
│   ├── CHANGELOG.md
│   └── README.md
│
├── packages/
│   ├── query/                  → @riviere/query
│   │   ├── src/
│   │   │   ├── query.ts        ← RiviereQuery class
│   │   │   ├── validator.ts    ← Schema validation
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── builder/                → @riviere/builder
│   │   ├── src/
│   │   │   ├── builder.ts      ← RiviereBuilder class
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── cli/                    → @riviere/cli
│       ├── src/
│       │   ├── commands/       ← CLI commands
│       │   └── index.ts
│       ├── bin/
│       │   └── riviere.ts      ← CLI entry point
│       ├── package.json
│       └── README.md
│
├── apps/
│   ├── eclair/                 ← Visualizer (not published)
│   │   └── ... (React app)
│   │
│   ├── demo/                   ← ecommerce-demo-app (not published)
│   │   └── ...
│   │
│   └── docs/                   ← Documentation site (VitePress)
│       └── ...
│
├── examples/                   ← Example graphs
│   ├── minimal.json
│   └── ecommerce-complete.json
│
├── docs/
│   └── project/                ← Internal docs (PRDs, decisions)
│       └── prd/
│
├── nx.json                     ← NX configuration
├── .github/
│   └── workflows/              ← CI/CD pipelines
├── package.json                ← Root scripts
├── tsconfig.base.json          ← Shared TypeScript config
├── eslint.config.js            ← Shared ESLint config
├── LICENSE
├── README.md                   ← Production-ready README
├── CONTRIBUTING.md
└── CHANGELOG.md
```

### Package Dependencies

```
schema/ (internal, not published)
    ↑
@living-architecture/riviere-query (standalone, browser-safe)
    ↑
@living-architecture/riviere-builder (depends on query, Node.js)
    ↑
@living-architecture/riviere-cli (depends on builder, Node.js)
```

### Package Details

**`@living-architecture/riviere-query`**
- Query graphs (RiviereQuery)
- Validate against schema
- Browser-safe, lightweight, zero heavy deps
- Schema bundled at build time

**`@living-architecture/riviere-builder`**
- Build graphs (RiviereBuilder)
- Depends on `riviere-query`
- Node.js only

**`@living-architecture/riviere-cli`**
- CLI for AI agents (primary) and humans
- Thin wrapper over builder and query
- Depends on `riviere-builder`
- Commands for both building and querying graphs

### Versioning Strategy

- **Unified versioning** — All packages share same version
- **Semver** — Major.Minor.Patch
- **NX release** — Coordinate releases across packages
- **Schema versioning** — `schemaVersion` field in graphs tracks schema compatibility
- **Pre-1.0** — Start at 0.1.0, breaking changes bump minor

### npm Scope

- Organization: `@living-architecture`
- Packages:
  - `@living-architecture/riviere-query`
  - `@living-architecture/riviere-builder`
  - `@living-architecture/riviere-cli`

### Naming Convention

- **Project/Repository:** Living Architecture
- **Schema:** Rivière (`riviere.schema.json`)
- **Visualizer:** Éclair
- **Classes:** `RiviereBuilder`, `RiviereQuery`

### Tooling

- **NX** — Monorepo orchestration, build caching, task running
- **pnpm** — Package manager
- **Vitest** — Testing (already in use)
- **TypeScript** — Shared base config, per-package extensions
- **ESLint** — Shared config

---

## 4. README (Production-Ready)

The root `README.md` should present Rivière as a launched product:

```markdown
# Rivière

**Extract living architecture from code.**

Rivière generates interactive flow-based architecture graphs directly from your codebase. See how operations flow through your system — from UI to API to domain logic to events — without manual diagramming.

## Why Rivière?

Modern distributed systems are hard to understand:
- Static documentation gets outdated immediately
- Dependency graphs show imports, not operational flow
- Manual diagrams take hours and drift from reality

Rivière extracts what actually happens when code runs, and keeps it synchronized with your codebase.

## Quick Start

### AI-Assisted Extraction (Recommended)

```bash
npm install @living-architecture/riviere-cli
npx riviere init
```

Point your AI coding assistant at the codebase. It will analyze your code and generate a Rivière graph using the CLI.

### Programmatic Extraction

```typescript
import { RiviereBuilder } from '@living-architecture/riviere-builder';

const builder = RiviereBuilder.new({ name: 'my-system' });

builder.addApi({
  name: 'place-order',
  domain: 'orders',
  httpMethod: 'POST',
  httpRoute: '/orders',
});

builder.addUseCase({
  name: 'PlaceOrder',
  domain: 'orders',
});

builder.link({
  from: builder.findComponent({ name: 'place-order' }),
  to: builder.findComponent({ name: 'PlaceOrder' }),
  type: 'sync',
});

const graph = builder.build();
```

### Query & Analyze

```typescript
import { RiviereQuery } from '@living-architecture/riviere-query';

const query = new RiviereQuery(graph);

// Find entry points
const entryPoints = query.entryPoints();

// Trace a flow
const flow = query.traceFlow('orders:api:place-order');

// Find cross-domain connections
const connections = query.crossDomainLinks();
```

### Visualize

Open your graph in [Éclair](https://riviere.dev/eclair), the interactive visualizer:
- Trace flows end-to-end
- Filter by domain
- Search components
- Click through to source code

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [@living-architecture/riviere-query](./packages/query) | Query and validate graphs. Browser-safe. | `npm i @living-architecture/riviere-query` |
| [@living-architecture/riviere-builder](./packages/builder) | Build graphs programmatically. | `npm i @living-architecture/riviere-builder` |
| [@living-architecture/riviere-cli](./packages/cli) | CLI for AI-assisted extraction. | `npm i @living-architecture/riviere-cli` |

## Documentation

**[riviere.dev/docs](https://riviere.dev/docs)** — Full documentation

- [Getting Started](https://riviere.dev/docs/guide/getting-started)
- [AI Extraction Guide](https://riviere.dev/docs/guide/ai-extraction)
- [Schema Reference](https://riviere.dev/docs/schema)
- [API Reference](https://riviere.dev/docs/api)
- [CLI Reference](https://riviere.dev/docs/cli)

## How It Works

```
Your Code                    Rivière Graph               Éclair Visualizer
   │                              │                            │
   ▼                              ▼                            ▼
┌─────────┐    extract    ┌──────────────┐    load    ┌──────────────┐
│ Source  │ ───────────▶  │    JSON      │ ────────▶  │ Interactive  │
│  Code   │   (AI/CLI)    │    Graph     │            │    Graph     │
└─────────┘               └──────────────┘            └──────────────┘
```

Rivière represents operational flow, not dependencies:
- **UI** → User-facing routes and screens
- **API** → HTTP endpoints
- **UseCase** → Application-level orchestration
- **DomainOp** → Domain logic and entity operations
- **Event** → Async events published
- **EventHandler** → Event subscribers

## Example

See the [ecommerce demo](./apps/demo) for a complete multi-domain example with:
- 7 domains (orders, shipping, inventory, payments, notifications, analytics, UI)
- Cross-domain event flows
- Entity state machines
- Full source location mapping

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup.

## License

MIT
```

---

## 5. Documentation Strategy

### One Unified Documentation Site

All documentation lives in one site at **riviere.dev/docs** (or similar):

```
apps/docs/                      ← VitePress site
├── .vitepress/
│   └── config.ts
├── public/
│   └── schema/
│       └── riviere.schema.json  ← Schema served as static file
├── guide/
│   ├── index.md                 ← Getting started
│   ├── quick-start.md
│   ├── ai-extraction.md
│   ├── programmatic-extraction.md
│   └── concepts/
│       ├── components.md
│       ├── links.md
│       ├── domains.md
│       └── versioning.md
├── schema/
│   ├── index.md                 ← Schema overview
│   ├── components.md            ← Component types reference
│   ├── links.md                 ← Link types reference
│   └── full-schema.md           ← Rendered JSON Schema (beautiful display)
├── api/
│   ├── index.md
│   ├── query.md                 ← @riviere/query API (auto-generated)
│   └── builder.md               ← @riviere/builder API (auto-generated)
├── cli/
│   ├── index.md
│   ├── commands.md              ← CLI reference (auto-generated)
│   └── ai-prompt.md             ← System prompt for AI agents
├── eclair/
│   ├── index.md                 ← Visualizer guide
│   ├── features.md
│   └── hosting.md               ← Self-hosting Éclair
├── extraction/
│   ├── index.md                 ← Future: extraction tool docs
│   ├── typescript.md
│   └── patterns.md
└── changelog.md                 ← Version history
```

### Documentation Sources

| Section | Source | Generation |
|---------|--------|------------|
| Guide | Hand-written | Manual |
| Schema reference | `schema/riviere.schema.json` | Auto-generated from JSON Schema |
| API reference | TypeScript source + TSDoc | Auto-generated (TypeDoc or similar) |
| CLI reference | CLI source + help text | Auto-generated |
| Changelog | `CHANGELOG.md` | From changesets |

### Schema Display

The schema page (`/schema/full-schema.md`) should beautifully render the JSON Schema:
- Collapsible sections for each type
- Syntax-highlighted examples
- Cross-linked type references
- Version badge showing current schema version

Options for rendering:
- **json-schema-for-humans** — Generates HTML from JSON Schema
- **Custom VitePress component** — More control over styling
- **Docusaurus JSON Schema plugin** — If we switch to Docusaurus

### Versioned Documentation

Documentation should show version:
- Current version displayed in header
- Version selector dropdown (future)
- Schema version clearly indicated
- API docs tied to package versions

### Deployment Options

| Platform | Pros | Cons |
|----------|------|------|
| **Vercel** | Free, automatic deploys, good DX | Requires account |
| **Netlify** | Free, automatic deploys | Similar to Vercel |
| **GitHub Pages** | Free, no extra account | Manual setup, slower |
| **Cloudflare Pages** | Free, fast | Requires Cloudflare account |

**Recommendation:** Vercel or Netlify with automatic deploys from `main` branch.

### Domain

- **riviere.dev** — If available, register this
- **riviere.github.io** — Free fallback
- **getriviere.dev** — Alternative if riviere.dev taken

---

## 6. Deliverables

- [ ] **NX workspace setup** — `nx.json`, workspace configuration
- [ ] **Package scaffolds** — Empty `packages/query`, `packages/builder`, `packages/cli`
- [ ] **Shared configs** — `tsconfig.base.json`, shared ESLint, Vitest
- [ ] **Schema setup** — `/schema/riviere.schema.json` with imports configured
- [ ] **Examples** — `/schema/examples/*.json` validated against schema
- [ ] **Apps scaffolds** — Empty `apps/eclair`, `apps/docs` placeholders
- [ ] **Production README** — Go-live quality README at root (see Section 4)
- [ ] **CI/CD** — GitHub Actions for lint, test, build
- [ ] **CLAUDE.md** — Monorepo commands, POC references, PRD organization
- [ ] **Convention docs** — `docs/conventions/` from skill templates
- [ ] **Documentation site** — Set up VitePress in `apps/docs`, migrate content from `~/code/riviere/riviere/client/docs/`

## 7. What We're NOT Building

- **Full library implementation** — That's Phase 5
- **Full CLI implementation** — That's Phase 6
- **Graph merging** — That's Phase 7
- **Auto-generated API docs** — That's after Phase 5/6 (need the code first)
- **Actual npm publishing** — Just the infrastructure
- **Extraction tools** — Future phases

## 8. Success Criteria

- [ ] NX workspace configured and working
- [ ] All packages build from workspace root: `nx run-many -t build`
- [ ] All packages test from workspace root: `nx run-many -t test`
- [ ] Query package works in browser (no Node.js deps)
- [ ] Builder package imports from query correctly
- [ ] CLI package imports from builder correctly
- [ ] Schema imported (not copied) by all packages
- [ ] Unified version across all packages
- [ ] CI passes for all packages
- [ ] Production README in place
- [ ] Documentation site structure in place (content can be placeholder)
- [ ] Existing functionality preserved (nothing breaks)
- [ ] CLAUDE.md updated with new commands and structure

## 9. Migration Guide (Fresh Repository)

We're starting with a new repository, not restructuring the old one.

### Execution

This phase will be executed using the **NX-adapted typescript-backend-project-setup skill**. The skill will be enhanced to support NX monorepo scaffolding.

Once the new repository is set up:
- PRDs migrate from this repo to `living-architecture`
- This repo (`riviere`) becomes archived reference
- All future work happens in the new repo

### Phase 4.1: Repository Creation

1. **Create GitHub repo:** `living-architecture`
2. **Clone locally**
3. **Run NX-adapted typescript-backend-project-setup skill**
4. Skill handles: NX init, package scaffold, configs, CLAUDE.md, hooks, CI/CD

### Phase 4.2: Project Scaffold

Using NX generators, create the structure:

```bash
# Create packages
nx g @nx/js:library riviere-query --directory=packages/query --publishable --importPath=@living-architecture/riviere-query
nx g @nx/js:library riviere-builder --directory=packages/builder --publishable --importPath=@living-architecture/riviere-builder
nx g @nx/js:library riviere-cli --directory=packages/cli --publishable --importPath=@living-architecture/riviere-cli

# Create apps
nx g @nx/react:app eclair --directory=apps/eclair
nx g @nx/js:app docs --directory=apps/docs
```

Manually create:
- `/schema/` — Copy `riviere.schema.json` from old repo (this is stable, not POC)
- `/examples/` — Copy example graphs from old repo
- `/docs/project/` — Internal docs structure

### Phase 4.3: Configuration Files

Following the TypeScript Backend Project Setup skill, configure:

**Root level:**
- `tsconfig.base.json` — Strict TypeScript (from skill)
- `eslint.config.mjs` — Strict linting (from skill, adapted for NX)
- `vitest.config.ts` — Or NX test runner config
- `.gitignore`

**Per-package:**
- `tsconfig.json` — Extends base
- `package.json` — Package-specific config
- `vitest.config.ts` — 100% coverage thresholds

### Phase 4.4: Claude Code Integration

Create following the skill pattern:

**CLAUDE.md** (adapted for monorepo):
```markdown
# Living Architecture

Rivière schema and tools for extracting living architecture from code.

Before starting any task, read `docs/project/project-overview.md`.

## Architecture

- **packages/query** — `@living-architecture/riviere-query` — Query and validate graphs (browser-safe)
- **packages/builder** — `@living-architecture/riviere-builder` — Build graphs programmatically
- **packages/cli** — `@living-architecture/riviere-cli` — CLI for AI-assisted extraction
- **apps/eclair** — Interactive visualizer
- **apps/docs** — Documentation site
- **schema/** — Rivière JSON Schema (internal)

Key documents:
- `docs/project/project-overview.md` — Vision and phases
- `docs/project/PRD/active/` — Current PRD
- `schema/riviere.schema.json` — The schema contract

## Reference: POC Repository

The POC code in `~/code/riviere` serves as the specification for Phases 5-7.

**Use as specification, NOT code to copy:**
- Query POC: `~/code/riviere/riviere/poc/client/src/query.ts`
- Builder POC: `~/code/riviere/riviere/poc/client/src/builder.ts`
- CLI POC: `~/code/riviere/riviere/poc/client/src/cli/`
- Types: `~/code/riviere/riviere/poc/client/src/types.ts`

Rewrite from scratch following the specification.

## Commands

Build all: `nx run-many -t build`
Test all: `nx run-many -t test`
Lint all: `nx run-many -t lint`
Verify (full gate): `nx run-many -t verify`

Build single package:
nx build riviere-query

Test single package:
nx test riviere-builder

Run affected (changed packages only):
nx affected -t test

## PRD Organization

PRDs are organized by status in `docs/project/prd/`:
- `active/` — Current focus (check at session start)
- `notstarted/` — Planned
- `archived/` — Done

## Task Workflow

[Link to task workflow convention]

## Testing

100% coverage required. Follow `docs/conventions/testing.md`.

## Code Conventions

Follow `docs/conventions/software-design.md`.

## Security

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration

## General Guidelines

- Do not modify eslint, tsconfig, or vitest configuration without asking
- Do not use `--no-verify`, `--force`, or `--hard` flags
```

**AGENTS.md:**
```markdown
# AGENTS.md

Read and follow all instructions in `CLAUDE.md`.
```

**.claude/settings.json:**
```json
{
  "permissions": {
    "deny": [
      "Edit(./tsconfig.base.json)",
      "Edit(./eslint.config.mjs)",
      "Edit(./.claude/settings.json)",
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

**.claude/hooks/block-dangerous-commands.sh** — From skill

### Phase 4.5: Documentation Structure

```
docs/
├── project/                    ← Internal
│   ├── PRD/
│   │   ├── active/
│   │   ├── notstarted/
│   │   └── archived/
│   └── project-overview.md
├── conventions/
│   ├── codebase-structure.md
│   ├── task-workflow.md
│   ├── testing.md
│   └── software-design.md
└── architecture/
    └── overview.md
```

### Phase 4.6: What to Copy from Old Repo

**Copy (stable artifacts):**
- `schema/riviere.schema.json` — The schema
- `examples/*.json` — Example graphs
- `docs/project/prd/*` — PRDs (reorganize into new structure)
- Design system docs from Éclair (if useful)

**Do NOT copy:**
- `riviere/poc/client/` — POC code (will rewrite in Phase 5/6)
- `riviere/client/` — Old client structure
- Old `node_modules`, `dist`, build artifacts
- Old CLAUDE.md, package.json, configs

**Rewrite from scratch:**
- Query package (Phase 5)
- Builder package (Phase 6)
- CLI (Phase 7)

**Blocked until Phase 5/6 complete:**
- Éclair — Currently coupled to POC code. Cannot migrate until new `@living-architecture/riviere-query` package exists. Will be migrated after Phase 6, using the new packages.

### Phase 4.7: CI/CD Setup

GitHub Actions:
- `.github/workflows/ci.yml` — Lint, test, build on PR
- `.github/workflows/release.yml` — Publish to npm on tag

### Phase 4.8: Production README

Create the production-ready README (see Section 4 of this PRD).

### Phase 4.9: Verification

- [ ] `nx run-many -t build` passes
- [ ] `nx run-many -t test` passes
- [ ] `nx run-many -t lint` passes
- [ ] Schema validates correctly
- [ ] Example graphs validate against schema
- [ ] CLAUDE.md complete and accurate
- [ ] All convention docs in place
- [ ] CI pipeline green

---

## 10. Open Questions

1. **Domain availability** — Is `riviere.dev` or `living-architecture.dev` available?
2. **VitePress vs alternatives** — VitePress, Docusaurus, or Starlight for docs?
3. **NX preset** — Which NX preset to use? `ts`, `integrated`, or custom?

---

## Future Phases (separate PRDs)

- **Phase 5:** [`PRD-phase-5-riviere-query.md`](./PRD-phase-5-riviere-query.md) — Query package
- **Phase 6:** [`PRD-phase-6-riviere-builder.md`](./PRD-phase-6-riviere-builder.md) — Builder package
- **Phase 7:** [`PRD-phase-7-riviere-cli.md`](./PRD-phase-7-riviere-cli.md) — CLI
- **Phase 8:** [`PRD-phase-8-graph-merging.md`](./PRD-phase-8-graph-merging.md) — Graph merging
- **Phase 9:** [`PRD-phase-9-eclair-migration.md`](./PRD-phase-9-eclair-migration.md) — Éclair migration
- **Cross-cutting:** Auto-generated API documentation, schema display, versioned docs
