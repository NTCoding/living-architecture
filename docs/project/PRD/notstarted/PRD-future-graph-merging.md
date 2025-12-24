# PRD: Future — Graph Merging

**Status:** Draft

**Depends on:** Phase 8 (CLI)

## 1. Problem

Real-world systems span multiple repositories. We need to:
- Merge graphs from multiple codebases into a unified view
- Resolve cross-repository references (e.g., event publisher in repo A → handler in repo B)
- Support polyglot systems (different repos, different languages)

## 2. Design Principles

1. **External links first** — Mark cross-repo references during extraction, resolve during merge.
2. **Deterministic** — Same inputs always produce same merged graph.
3. **Conflict detection** — Surface merge conflicts clearly.

## 3. What We're Building

### Builder API Extension

```typescript
// During extraction, mark external references
builder.linkExternal({
  from: component,
  toExternal: {
    event: 'order-placed',  // Match criteria
    expectedDomain: 'shipping'
  },
  type: 'async'
});
```

### Merge Algorithm

```typescript
import { mergeGraphs } from '@living-architecture/riviere-builder';

const merged = mergeGraphs([
  ordersGraph,
  shippingGraph,
  inventoryGraph
], {
  resolveExternalLinks: true,
  conflictStrategy: 'fail' | 'warn' | 'override'
});
```

### CLI Extension

```bash
riviere merge graph1.json graph2.json --output merged.json
riviere merge ./graphs/*.json --output merged.json
```

## 4. What We're NOT Building

- Real-time sync between repos
- Automatic extraction (still manual/AI-assisted per repo)

## 5. Success Criteria

- [ ] External links resolve correctly during merge
- [ ] Conflicts detected and reported
- [ ] CLI merge command works
- [ ] Can merge example multi-domain graphs
- [ ] Documentation covers multi-repo workflow

## 6. Reference

**Design Decisions:**
- `./docs/project/PRD/archived/PRD-phase-3-client-library.md` — Decision #3: Cross-Repository Edge Resolution

## 7. Open Questions

1. **Conflict resolution** — How to handle duplicate component IDs across repos?
2. **Partial merges** — Support merging subsets of graphs?

---

## Dependencies

**Depends on:**
- Phase 6 (Builder) — Merge uses builder internals
- Phase 7 (CLI) — Merge command added to CLI

**Blocks:**
- Multi-repo visualization in Éclair
