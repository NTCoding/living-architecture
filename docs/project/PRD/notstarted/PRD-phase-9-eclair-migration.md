# PRD: Phase 9 — Éclair Migration

**Status:** Draft

**Depends on:** Phase 6 (Riviere Builder) — needs new query package

## 1. Problem

Éclair (the visualizer) currently imports from the POC code. It needs to:
- Migrate to use `@living-architecture/riviere-query`
- Move to the new `living-architecture` repository
- Maintain all existing functionality

## 2. What We're Building

### Migration Tasks

1. **Replace POC imports:**
   ```typescript
   // Before (POC)
   import { RiviereQuery } from '../../../poc/client/src/query';

   // After (package)
   import { RiviereQuery } from '@living-architecture/riviere-query';
   ```

2. **Move to new repo:**
   - Copy Éclair to `apps/eclair/` in `living-architecture` repo
   - Update build configuration for NX
   - Verify all features work

3. **Verify functionality:**
   - Graph loading
   - Flow tracing
   - Domain filtering
   - Search
   - Tooltips
   - Theme switching

### Not Changing

- React components (copy as-is)
- D3/XY-Flow visualization
- Design system
- Features

## 3. Success Criteria

- [ ] Éclair builds in new repo
- [ ] Imports from `@living-architecture/riviere-query`
- [ ] All existing features work
- [ ] Example graphs load and render correctly
- [ ] Tests pass

## 4. Open Questions

1. **Hosting** — Where to deploy Éclair? Vercel? GitHub Pages?
2. **Standalone vs integrated** — Keep as separate app or embed in docs site?

---

## Dependencies

**Depends on:**
- Phase 5 (Query) — Éclair uses RiviereQuery
- Phase 6 (Builder) — Must be complete before migration (query API stable)

**Blocks:**
- Public Éclair hosting
- Documentation site with embedded visualizer
