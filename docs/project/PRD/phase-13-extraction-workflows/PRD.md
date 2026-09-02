# PRD: Phase 13 Extraction Workflows

**Status:** Approved

**PRD approval:** Approved

---

## 1. Problem Summary

Users composing architecture facts from multiple codebases, EventCatalog, AsyncAPI, and AI assistance currently coordinate five or more manual steps for every refresh. The sequence is error-prone, not a dependable CI boundary, and can leave users uncertain whether a failed run produced a complete, stale, or partial graph.

## 2. Product Decision

Ship a purpose-built, sequential Riviere Workflow as the primary interface when a graph has more than one source of truth. A file-addressed workflow composes strict built-in stages into one validated run, produces one final graph, and returns enough structured progress and state to diagnose every transition. Direct extraction remains the shortest path for one TypeScript codebase.

## 3. Users and Use Cases

- Application developer: compose several TypeScript extraction configs into one graph.
- Platform team: make EventCatalog and AsyncAPI facts authoritative over lower-priority code-derived scalar values.
- Architecture maintainer: use bounded AI extraction and enrichment to fill deliberate gaps without overwriting deterministic facts.
- CI owner: validate and execute the complete workflow non-interactively and reject nondeterministic or partial output.
- Existing extraction user: keep direct extraction unchanged or receive safe migration guidance rather than an automatic conversion.

## 4. Product Requirements

- A workflow YAML file declares `apiVersion`, graph identity, output, sources, domains, and an ordered list of uniquely named built-in stages.
- The built-in stage language contains exactly `code-extraction`, `eventcatalog-import`, `asyncapi-import`, `ai-extract`, `ai-enrich`, and `schema-validate` in Phase 13.
- Stage behaviour lives in strict referenced config files whose paths resolve relative to the declaring file.
- Workflow validation loads the complete definition and reports structural, compatibility, path, mapping, unresolved-diagnostic, and active-runtime prerequisite failures without mutating graph state.
- Workflow execution starts fresh accumulated graph state, runs active stages sequentially, stops on the first failure, and atomically replaces final output only after success.
- EventCatalog and AsyncAPI imports support the narrow documented concepts, canonical mappings, and strict or lenient unmapped-item outcomes.
- AI stages invoke a user-configured CLI, use strict response schemas, remain additive, and never expose provider credentials or AI SDK configuration to Riviere.
- `--skip-ai` removes AI stages from the active plan; `--dry-run` returns prompts without invocation or application. Both modes still load and validate AI config structure.
- Every run result returns structured events, diagnostics, one immutable initial state snapshot, and one immutable accumulated-state snapshot after each completed active stage.
- Transition state contains components, internal Link occurrences, external Links, and Workflow diagnostics.
- `schema-validate` is non-mutating, so its before and after state is identical.
- Greenfield initialization creates a valid starter workflow only when no existing extraction configuration is detected. Existing configurations cause a no-write refusal with migration guidance.
- The ecommerce demo app exercises the full customer journey while preserving its existing deterministic extraction path.

## 5. Non-Goals

- Generic workflow engine features, custom stages, plugins, arbitrary commands, branching, parallelism, retries, and workflow composition.
- Cross-repository orchestration or linking.
- Changes to deterministic extraction rules or direct extraction output.
- Persisted workflow checkpoints, partial success, incremental caching, or execution history.
- Automated conversion of existing extraction configs.
- AI SDKs, credentials, provider configuration, cost controls, retries, prompt caching, or AI-inclusive idempotency guarantees.
- OpenAPI, GraphQL, Protobuf, Backstage, AsyncAPI request/reply, or broad EventCatalog semantics.

## 6. Success Criteria

- One file-addressed command produces the exact valid ecommerce demo graph from code, EventCatalog, AsyncAPI, and bounded AI stages.
- Direct extraction remains output-compatible after Workflow integration.
- Invalid workflows fail before unsafe execution and never replace a prior output graph.
- The closed stage language is exhaustively handled throughout schemas, domain behaviour, presentation, and tests.
- AI stages preserve every deterministic scalar and Riviere has no AI SDK or credential surface.
- Result transitions exactly match generated demo fixtures for initial state and every completed stage.
- Two unchanged `--skip-ai` demo runs produce byte-identical canonically serialized output.
- The complete workflow log and summary identify stage timing, skips, overwrites, additions, diagnostics, and failures.
- Existing demo extraction verification continues to pass unchanged.
- Phase 13 completes only after a final issue verifies the complete documented `ecommerce-demo-app` customer journey. If that verification identifies a defect, it creates focused bugfix work and repeats the complete journey after the fixes before the Phase 13 PRD workstream closes.

## 7. Open Product Questions

No open product questions.

## 8. Architecture Questions

No open architecture questions. The approved answers are recorded in `ARCH.md`.

## 9. Source Traceability

- Problem definition: `problem-definition.md`
- Solution exploration: `solution-exploration.md`
- Consolidated detailed reference: `../active/PRD-phase-13-extraction-workflows.md`
- Key source sections: active reference §§1-5 for the customer problem, workflow language, stage behaviour, diagnostics, exclusions, and success criteria.
