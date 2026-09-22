---
status: approved
dateAdded: 2026-09-05
systemAreas:
  - global
  - riviere-query
  - riviere-builder
architectureConcepts:
  - boundary-placement
  - domain-modeling
  - trade-off-reasoning
source: "conversation: Pull Request Architecture Diffs subdomain decision"
---

# Case study: the boundary for architecture diffs for pull requests

We were planning **architecture diffs for pull requests** in `docs/project/PRD/pull-request-diffs/ARCH.md`, based on the approved `PRD.md` and `solution-exploration.md` in that folder. The question was which Rivière subdomain should own the capability.

Query initially seemed to fit because the capability queried graphs. However, it provided architectural insights rather than generic querying. The user rejected adding that specific responsibility to the generic tool: **“Don’t put something specific on top of a generic query tool.”** It also did not align with the Builder subdomain, where the query code lived.

A separate Diff subdomain was considered next. That proposal had turned a feature into a subdomain without examining broader concepts. Applying **“broaden the narrow scope”** brought architecture into consideration as a home for multiple related capabilities, rather than just architecture diffs.

Architecture then raised the opposite concern: its scope might be too broad. Applying **“narrow the scope with a more precise name”** produced `architecture-insights` as an alternative. The user’s gut feeling nevertheless favoured `architecture` because it was shorter and better. The domain could evolve and split later.

The user selected **`riviere-architecture`**, which would provide architectural insights based on Rivière graphs and other Rivière concepts.

## How the heuristics affected this decision

- **Don’t put something specific on a generic query tool.** Querying graphs made Query a plausible home, but architectural insights were a more specific responsibility. This distinction ruled out treating “it queries a graph” as sufficient justification.
- **Broaden the narrow scope.** Moving from **Diff → Architecture** changed the proposed boundary from one feature to a home for multiple related capabilities.
- **Narrow with a more precise name.** Testing **Architecture → Architecture Insights** exposed the risk that Architecture was too broad. The user still preferred the shorter name, Architecture, while accepting that it could evolve and split later.
