# riviere-role-enforcement role inventory

**Status:** Draft working output for PRD todo item 1

This document captures the first-pass output for the PRD todo item: identify the repository-wide role inventory needed for 100% coverage.

It is intentionally practical rather than final. The goal is to give the team a concrete starting point for classification, ambiguity review, and rollout planning.

This inventory also records a practical rollout stance:

- final target: 100% coverage for the in-scope repository code
- phase 1 may explicitly exclude small schema/convention packages that do not follow the main architecture model
- if phase 1 exclusions exist, they must be recorded as rollout scope, not implied silently

---

## 1. Mandatory Top-Level Layers

Every in-scope class or standalone function must first belong to one of these layers:

- `shell`
- `entrypoint`
- `command`
- `query`
- `domain`
- `infra`

No role may bypass this top-level classification.

---

## 2. First-Pass Role Inventory

### 2.0 Phase 1 Scope Notes

Likely phase 1 exclusions:

- `packages/riviere-schema`
- `packages/riviere-extract-config`
- `packages/riviere-extract-conventions`

Reasoning:

- these packages are mostly schema, config, or convention infrastructure
- they do not necessarily follow the main vertical-slice application architecture
- forcing them into the same model on day one may add noise rather than clarity

Important:

- this is a rollout sequencing decision, not a change to the final target
- if the team adopts these exclusions, the PRD should treat them as explicit phase 1 scope only

### 2.1 shell

Likely roles:

- `cli-shell`
- `app-shell`
- `workflow-shell`

Observed examples:

- `tools/dev-workflow-v2/src/shell/cli.ts`

### 2.2 entrypoint

Likely roles:

- `cli-entrypoint`
- `http-entrypoint`
- `page-entrypoint`
- `workflow-entrypoint`
- `cli-args-parser`
- `cli-output-formatter`
- `cli-error-presenter`

Observed examples:

- `packages/riviere-cli/src/features/extract/entrypoint/extract.ts`
- `packages/riviere-cli/src/features/query/entrypoint/components.ts`
- `packages/riviere-cli/src/features/builder/entrypoint/add-component.ts`
- `tools/dev-workflow-v2/src/entrypoint/workflow-cli.ts`
- `apps/eclair/src/features/overview/entrypoint/OverviewPage.tsx`
- `apps/eclair/src/features/domain-map/entrypoint/DomainMapPage.tsx`

### 2.3 command

Likely roles:

- `command-orchestrator`
- `write-use-case`
- `workflow-command`

Observed examples:

- `packages/riviere-cli/src/features/extract/commands/run-extraction.ts`
- `packages/riviere-cli/src/features/builder/commands/add-component.ts`

### 2.4 query

Likely roles:

- `query-reader`
- `query-facade`
- `graph-query`
- `comparison-query`
- `domain-details-query`

Observed examples:

- `packages/riviere-query/src/features/querying/queries/RiviereQuery.ts`
- `packages/riviere-query/src/features/querying/queries/component-queries.ts`
- `apps/eclair/src/features/domains/queries/extract-domain-details.ts`
- `apps/eclair/src/features/comparison/queries/compare-graphs.ts`

### 2.5 domain

Likely roles:

- `entity`
- `value-object`
- `domain-model`
- `domain-rule`
- `domain-calculation`
- `domain-state-transition`
- `domain-error`

Guidance:

- stay lean with domain labels
- do not use a broad domain label when a more accurate role is needed
- if a file does not fit the existing domain labels cleanly, create a better label rather than forcing the wrong one

Observed examples:

- `packages/riviere-cli/src/features/extract/domain/detect-connections-per-module.ts`
- `packages/riviere-cli/src/features/extract/domain/enrich-per-module.ts`
- `apps/eclair/src/features/full-graph/domain/graph-focusing/filterByNodeType.ts`

### 2.6 infra

Likely roles:

- `mapper`
- `feature-external-client`
- `platform-external-client`
- `persistence-implementation`
- `cli-utility`
- `infra-error`
- `github-client`
- `git-client`
- `graph-loader`
- `logging-adapter`

Observed examples:

- `packages/riviere-cli/src/features/extract/infra/mappers/present-extraction-result.ts`
- `packages/riviere-cli/src/features/extract/infra/external-clients/create-configured-project.ts`
- `tools/dev-workflow-v2/src/infra/github/get-pr-feedback.ts`
- `tools/dev-workflow-v2/src/infra/cli/git.ts`

---

## 3. High-Value Ambiguities To Resolve

These areas likely need explicit discussion before the role catalog is finalized.

### 3.1 CLI parsing and formatting

Questions:

- Are `cli-args-parser`, `cli-output-formatter`, and `cli-error-presenter` all `entrypoint` roles?
- Do any shared CLI utilities belong under `platform/infra/cli/` rather than feature `entrypoint/`?

### 3.2 UI components and hooks in `apps/eclair`

Questions:

- Are React components in `features/*/components/` in scope for v1?
- If yes, do they need dedicated roles such as `ui-component`, `ui-modal`, `ui-filter`, `ui-hook`?
- Or should v1 scope stay limited to classes and standalone functions in architectural layers only?

### 3.3 Query package conventions

Questions:

- Should `packages/riviere-query/src/features/querying/queries/RiviereQuery.ts` be treated as a single query role or split into more specific query roles?
- Do query helper files like `compare-by-code-point.ts` deserve their own roles or inherit a broader query role?

### 3.4 Domain utility boundaries

Questions:

- When does a pure domain helper become a distinct role such as `domain-calculation` versus staying under a general `domain-rule` role?
- Do we want multiple domain roles in v1 or a smaller initial domain catalog?
- When should a domain type be called `domain-model` instead of `entity` or `value-object`?

### 3.5 Error classes

Questions:

- Should we explicitly classify error classes instead of excluding them?
- Current recommended direction:
  - `domain-error` -> only in `domain/`
  - `infra-error` -> only in `infra/`
- Avoid a vague `application-error` role unless we can define a clear allowed location for it.

### 3.6 Infra specialization

Questions:

- Which infra subfolders need explicit roles on day one?
- Should we start with `mapper`, `external-client`, `git-client`, `github-client`, `graph-loader`, and `infra-error` only?
- Should feature `infra/` and platform `infra/` roles be separate when behavior differs?
- In packages like `riviere-extract-config`, are these files really infra roles at all, or are they outside the main architecture convention scope?

---

## 4. Suggested First Implementation Slice

To keep the project minimal, the first rollout should probably start with explicit roles for:

- `cli-shell`
- `cli-entrypoint`
- `cli-args-parser`
- `cli-output-formatter`
- `cli-error-presenter`
- `command-orchestrator`
- `query-reader`
- `query-facade`
- `domain-rule`
- `domain-error`
- `mapper`
- `external-client`
- `git-client`
- `github-client`
- `graph-loader`
- `infra-error`

Then expand only where ambiguity or repeated mistakes justify more specificity.

---

## 5. Why This Exists

This inventory exists so the team can:

- assign owners to ambiguous areas
- decide which roles are required for 100% coverage
- keep the first rollout minimal
- give `riviere-role-classifier` a clear catalog to use

It should be treated as working output for the first todo item in `docs/project/PRD/notstarted/PRD-riviere-role-enforcement.md`.
