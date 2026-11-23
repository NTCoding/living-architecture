# PRD: Phase 6 — Éclair Migration

**Status:** Approved

**Depends on:** Phase 5 (Riviere Query) — Complete

---

## 1. Problem

Éclair (the architecture visualizer) currently lives in a separate POC repository and imports from POC code. It needs to:

- **Move to the monorepo** — `apps/eclair/` in `living-architecture`
- **Use production packages** — Import from `@living-architecture/riviere-query` instead of POC paths
- **Maintain all functionality** — No feature regression
- **Improve code quality** — Address tech debt found during migration

The POC has ~150 source files, uses React 19 + Vite + XY-Flow + D3 + Tailwind.

---

## 2. Design Principles

1. **Migration first, quality second** — Get it building and working before refactoring. Don't mix migration commits with improvement commits.

2. **No new features** — Same functionality as POC. Code quality improvements (types, tests, refactoring) are allowed; new capabilities are not.

3. **NX-native patterns** — Follow monorepo conventions (nx:run-commands for Vite, workspace dependencies, etc.)

4. **Tests required for changes** — Any code quality improvements must have test coverage.

---

## 3. What We're Building

### Migration Tasks

1. **Replace shell with POC code**
   - Copy `~/code/riviere/eclair/src/` to `apps/eclair/src/`
   - Copy configuration files (vite.config.ts, tailwind, etc.)
   - Adapt for NX project structure

2. **Update imports**
   ```typescript
   // Before (POC)
   import { RiviereQuery } from '../../../poc/client/src/query'

   // After (package)
   import { RiviereQuery } from '@living-architecture/riviere-query'
   ```

3. **Use package validation functions**
   ```typescript
   // Before (POC - custom validation with copied schema)
   import riviereSchema from '@/lib/riviere.schema.json'
   const ajv = new Ajv(...)
   const validate = ajv.compile(riviereSchema)

   // After (use package exports)
   import {
     isRiviereGraph,        // Type guard
     parseRiviereGraph,     // Parse + validate + throw
     formatValidationErrors // Error formatting
   } from '@living-architecture/riviere-schema'
   ```
   The package already provides AJV-based validation — no need for Éclair to roll its own.

4. **Configure build**
   - Replace current esbuild config with Vite
   - Use `nx:run-commands` executor (like docs app)
   - Configure workspace dependencies on riviere-query and riviere-schema

5. **Verify all features**
   - Graph loading and rendering
   - Flow tracing (click → trace path)
   - Domain filtering
   - Search
   - Tooltips
   - Theme switching
   - Graph comparison (diff view)

6. **Code quality (as found)**
   - Improve types where weak
   - Add tests where missing
   - Refactor messy code
   - Remove dead code

---

## 4. What We're NOT Building

- **New features** — Same functionality as POC
- **Hosting/deployment** — Separate concern after migration
- **Docs site embedding** — Future work
- **Performance optimization** — Unless blocking

---

## 5. Success Criteria

- [ ] Éclair builds with `nx build eclair`
- [ ] Éclair runs with `nx serve eclair`
- [ ] All imports use `@living-architecture/riviere-query`
- [ ] Schema imported from `@living-architecture/riviere-schema`
- [ ] No POC path imports remain
- [ ] All existing features work:
  - [ ] Load graph from file
  - [ ] Load graph from URL
  - [ ] Render full graph visualization
  - [ ] Flow tracing works
  - [ ] Domain filtering works
  - [ ] Search works
  - [ ] Tooltips work
  - [ ] Theme switching works
  - [ ] Graph comparison/diff works
- [ ] Example graphs load and render correctly
- [ ] Tests pass with 100% coverage on new/modified code
- [ ] Lint passes
- [ ] Éclair documentation in docs site:
  - [ ] User guide (7 pages)
  - [ ] Feature reference (5 pages)
  - [ ] Navigation updated

---

## 6. Reference

### POC Location
- `~/code/riviere/eclair/` — Full app to migrate (~150 files)

### Key POC Files
- `src/features/comparison/compareGraphs.ts` — Self-contained diff logic (doesn't use riviere-query's diff)
- `src/lib/validateGraph.ts` — Can be simplified or removed; use `@living-architecture/riviere-schema` validation functions instead
- `src/hooks/useRiviereQuery.ts` — Main query hook (needs import update)

### Package Dependencies
- `@living-architecture/riviere-query` — Query methods, types
- `@living-architecture/riviere-schema` — Validation: `isRiviereGraph`, `parseRiviereGraph`, `formatValidationErrors`

### Monorepo Patterns
- `apps/docs/` — VitePress app using `nx:run-commands` executor (pattern to follow)
- `packages/riviere-query/` — Package Éclair will import from

---

## 7. Milestones

### M1: Éclair builds in monorepo
App structure migrated, builds successfully (may not run yet).

#### Deliverables
- **D1.1:** Project structure created
  - Copy source files from POC
  - Configure package.json with Vite scripts
  - Add NX project configuration
  - Acceptance: `nx build eclair` succeeds
  - Verification: Build output exists in dist/

- **D1.2:** Dependencies resolved
  - Add workspace dependency on riviere-query
  - Add workspace dependency on riviere-schema
  - Update all POC imports to use packages
  - Replace `src/lib/validateGraph.ts` with riviere-schema exports (`isRiviereGraph`, `parseRiviereGraph`)
  - Remove prebuild schema copy script and `riviere.schema.json` file
  - Acceptance: No POC path imports remain, no file copy scripts, no local schema file
  - Verification: grep for '../poc' and '../riviere' returns nothing

---

### M2: Éclair runs and displays graphs
App serves locally, can load and render a graph.

#### Deliverables
- **D2.1:** Dev server works
  - Configure Vite dev server
  - Acceptance: `nx serve eclair` starts successfully
  - Verification: Browser opens to running app

- **D2.2:** Graph loading works
  - Load example graph from file
  - Render in visualization
  - Acceptance: Graph nodes and edges visible
  - Verification: Load ecommerce-complete.json, see visualization

---

### M3: All features verified working
Complete feature parity with POC.

#### Deliverables
- **D3.1:** Flow tracing works
  - Click node → see connected flow highlighted
  - Acceptance: Same behavior as POC
  - Verification: Manual test with example graph

- **D3.2:** Domain filtering works
  - Show/hide domains
  - Acceptance: Domains toggle visibility
  - Verification: Manual test

- **D3.3:** Search works
  - Search bar finds components
  - Acceptance: Case-insensitive search across name/domain/type
  - Verification: Manual test

- **D3.4:** Tooltips work
  - Hover shows component details
  - Acceptance: Same info as POC
  - Verification: Manual test

- **D3.5:** Theme switching works
  - Light/dark mode toggle
  - Acceptance: Theme persists
  - Verification: Manual test

- **D3.6:** Graph comparison works
  - Compare two graphs, see diff
  - Acceptance: Shows added/removed/modified
  - Verification: Load two versions of same graph

---

### M4: Tests passing
Test suite migrated and passing.

#### Deliverables
- **D4.1:** Test infrastructure configured
  - Vitest config for apps/eclair
  - Acceptance: `nx test eclair` runs
  - Verification: Command executes

- **D4.2:** Existing tests pass
  - Migrate POC test files
  - Fix any broken tests
  - Acceptance: All tests green
  - Verification: `nx test eclair` passes

- **D4.3:** Coverage meets standard
  - 100% coverage on new/modified code
  - Acceptance: Coverage report shows compliance
  - Verification: Coverage output

---

### M5: Code quality improvements
Tech debt addressed (optional scope based on findings).

#### Deliverables
- **D5.1:** Types improved
  - Replace any `any` types found
  - Add missing type annotations
  - Acceptance: No `any` in modified code
  - Verification: Strict TypeScript passes

- **D5.2:** Dead code removed
  - Remove unused imports, functions, files
  - Acceptance: No eslint unused warnings
  - Verification: Lint passes

---

### M6: Éclair documentation
User guide and feature reference added to docs site.

#### Deliverables
- **D6.1:** Docs site navigation updated
  - Add "Éclair" section to nav bar
  - Add sidebar with Éclair pages
  - Acceptance: Navigation works, links resolve
  - Verification: `nx serve docs`, click through nav

- **D6.2:** User guide written
  - `eclair/index.md` — Overview: what Éclair is, when to use it
  - `eclair/getting-started.md` — Loading graphs (file upload, URL)
  - `eclair/exploring-graphs.md` — Navigation, zoom, pan, select
  - `eclair/tracing-flows.md` — Click to trace, understand flow paths
  - `eclair/filtering.md` — Domain filtering, show/hide
  - `eclair/searching.md` — Search bar, finding components
  - `eclair/comparing-graphs.md` — Diff view, before/after
  - Acceptance: Clear instructions with screenshots
  - Verification: Follow guide with example graph

- **D6.3:** Feature reference written
  - `eclair/features/full-graph-view.md` — Main visualization
  - `eclair/features/domain-map.md` — Domain-level view
  - `eclair/features/entity-browser.md` — Entity exploration
  - `eclair/features/event-browser.md` — Event flow view
  - `eclair/features/comparison.md` — Diff feature details
  - Acceptance: Each feature documented with purpose and usage
  - Verification: Review against actual app

---

## 8. Dependencies

**Depends on:**
- Phase 5 (riviere-query) — Must be complete. Éclair imports from it.
- riviere-schema package — Must export schema for validation

**Blocks:**
- Public Éclair hosting (future)
- Documentation site integration (future)
