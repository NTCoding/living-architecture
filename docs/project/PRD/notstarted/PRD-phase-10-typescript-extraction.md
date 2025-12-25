# PRD: Phase 10 — TypeScript Extraction

**Status:** Draft

**Depends on:** Phase 9 (Launch)

---

## 1. Problem

Currently, architecture extraction requires AI-assisted manual work using the CLI. We need automated extraction that can:

- Parse TypeScript codebases to identify architectural patterns
- Automatically detect APIs, use cases, domain operations, events, and handlers
- Generate Rivière graphs without manual intervention
- Reduce extraction time from hours to minutes

The project vision states "Extract software architecture from code as living documentation" — this phase delivers on that promise.

---

## 2. Design Principles

1. **TypeScript first** — Focus on TypeScript/JavaScript. Other languages are future phases.
2. **Pattern-based** — Detect common patterns (NestJS controllers, Express routes, etc.), not magic.
3. **Configurable** — Different codebases use different patterns. Allow customization.
4. **Incremental** — Can re-run on changes without full re-extraction.
5. **Transparent** — Show what was detected and why. No black box.

---

## 3. What We're Building

TBD — Placeholder for discovery phase.

Likely includes:
- TypeScript AST parsing
- Pattern detection for common frameworks
- Configuration file for custom patterns
- Integration with riviere-builder
- CLI commands for automated extraction

---

## 4. What We're NOT Building

- Other language support (Java, Python, Go — future phases)
- Real-time extraction (on file save)
- IDE plugins

---

## 5. Success Criteria

- [ ] Can extract ecommerce-demo-app automatically
- [ ] Matches or exceeds manual extraction quality
- [ ] Extraction completes in under 5 minutes for medium codebase
- [ ] Configuration allows customization for different patterns
- [ ] Documentation covers common framework patterns

---

## 6. Open Questions

1. **Framework support** — Which frameworks to support first? (NestJS, Express, etc.)
2. **Pattern language** — How to define custom patterns?
3. **Incremental updates** — How to detect changes and update graph?
4. **Confidence scores** — Should we show confidence in detections?
5. **Human review** — Workflow for reviewing/correcting automated extraction?

---

## 7. Milestones

TBD — To be defined during discovery.

---

## 8. Dependencies

**Depends on:**
- Phase 9 (Launch) — Need stable packages and CLI

**Blocks:**
- Future language extractors
