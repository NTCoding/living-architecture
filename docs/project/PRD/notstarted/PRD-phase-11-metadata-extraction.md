# PRD: Phase 11 — Metadata Extraction

**Status:** Not Started

**Depends on:** Phase 10 (TypeScript Component Extraction)

---

## 1. Problem

Phase 10 extracts component identity (type, name, location). We now need to extract component metadata:
- API: HTTP method, path, parameters
- DomainOp: entity, operation name, state transitions
- Event: event name, schema
- EventHandler: subscribed events

This metadata enriches the draft components from Phase 10 into more complete component definitions.

*IDEA*: Use these commands as part of a pull-request. Extract only the entities, events, apis (components) modified in the pull request and provide a diff of how the model has changed. As part of this PRD it can just be structure - e.g. entity has new/updated method, new event added. With the next PRD it could also include connections. Specialised CLI commands and UI may be needed.

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

1. **Metadata sources** — Decorators, JSDoc, type annotations, runtime reflection?
2. **Partial metadata** — Handle components with incomplete metadata?
3. **Output format** — Extend draft component format or new structure?

---

## 7. Milestones

TBD — To be defined during discovery.

---

## 8. Dependencies

**Depends on:**
- Phase 10 (TypeScript Component Extraction) — Component identification

**Blocks:**
- Phase 12 (Connection Detection) — Metadata needed for semantic linking
