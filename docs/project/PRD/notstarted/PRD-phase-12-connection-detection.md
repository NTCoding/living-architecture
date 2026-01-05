# PRD: Phase 12 — Connection Detection

**Status:** Not Started

**Depends on:** Phase 11 (Metadata Extraction)

---

## 1. Problem

Components are identified (Phase 10) and enriched with metadata (Phase 11). Now we need to detect connections:
- Syntactic: method calls between components (API → UseCase → DomainOp)
- Semantic: event publisher → event handler matching
- HTTP: client calls matching API endpoints

This produces a complete Riviere graph with nodes and edges.

---

## 2. Design Principles

TBD — To be defined during discovery.

---

## 3. What We're Building

TBD — To be defined during discovery.

---

## 4. What We're NOT Building

TBD — To be defined during discovery.

---

## 5. Success Criteria

TBD — To be defined during discovery.

---

## 6. Open Questions

1. **Cross-file resolution** — How to trace calls across file boundaries?
2. **Event matching** — Match by event name, type, or both?
3. **HTTP client detection** — Recognize fetch, axios, http client patterns?
4. **Confidence levels** — Mark uncertain connections?

---

## 7. Milestones

TBD — To be defined during discovery.

---

## 8. Dependencies

**Depends on:**
- Phase 10 (TypeScript Component Extraction) — Component identification
- Phase 11 (Metadata Extraction) — Metadata for semantic linking

**Blocks:**
- Phase 13 (Graph Merging) — Complete graphs needed for merging
