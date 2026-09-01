# Problem Definition: Phase 13 Extraction Workflows

**Status:** Approved

---

## Approved inputs

**Section approval:** Approved

- Who: developers and platform teams combining architecture facts from multiple codebases, EventCatalog, AsyncAPI, and bounded AI-assisted discovery.
- What: they must manually run and coordinate several commands, import external specifications without supported tooling, combine outputs, diagnose failures, and repeat the sequence whenever inputs change.
- Where: local development and CI for repositories whose architecture graph has more than one source of truth.
- When: when a single direct TypeScript extraction command no longer describes the complete system.
- Why: the manual sequence is error-prone, cannot be reproduced reliably in CI, and requires users to understand internal extraction ordering and merge behaviour.

## Problem statement

**Section approval:** Approved

Riviere extraction today is a sequence of manual CLI commands. Extracting a complete architecture graph from a real system requires running extraction per codebase with the correct configuration, importing facts from external specifications without supported tooling, identifying gaps, applying AI assistance manually, combining all outputs, and repeating the sequence when code changes. For a team with three microservices, an EventCatalog, and an AsyncAPI specification, this means five or more coordinated steps per refresh. A failure can leave users uncertain whether the graph is complete, stale, or partially updated. The workflow is not a dependable CI boundary and requires knowledge that should belong to Riviere rather than each customer.
