# riviere-role-enforcement role inventory

**Status:** Draft working output for PRD todo item 1

This document captures the first-pass output for the PRD todo item: identify the repository-wide role inventory needed for 100% coverage.

It is intentionally practical rather than final. The goal is to give the team a concrete starting point for classification, ambiguity review, and rollout planning.

This inventory also records a practical rollout stance:

- final target: 100% coverage for the agreed in-scope repository code
- phase 1 should define the ideal role model first, then move code to match it
- current folder names are evidence, not authority

---

## 1. Mandatory Top-Level Layers

Every in-scope class, static method, or standalone function must first belong to one of these layers:

- `shell`
- `entrypoint`
- `command`
- `query`
- `domain`
- `infra`

No role may bypass this top-level classification.

---

## 2. First-Pass Role Inventory

### 2.0 Phase 3 Branch Scope Lock

This inventory uses the same final Phase 3 branch scope as the PRD.

Included roots:

- `packages/riviere-cli/src/**`
- `packages/riviere-builder/src/**`
- `packages/riviere-extract-config/src/**`
- `packages/riviere-extract-ts/src/**`
- `packages/riviere-query/src/**`
- `packages/riviere-role-enforcement/src/**`
- `tools/dev-workflow/src/**`
- `tools/dev-workflow-v2/src/**`

Excluded roots:

- `packages/riviere-schema/src/**`
- `packages/riviere-extract-conventions/src/**`
- `apps/eclair/**`

Excluded file classes:

- `*.spec.*`
- `__fixtures__/**`
- `fixtures/**`
- snapshot files
- generated outputs
- barrel-only files such as `index.ts` that declare no target symbols

The following packages are expected to remain excluded from the final branch scope unless the PRD is revised again:

- `packages/riviere-schema`
- `packages/riviere-extract-conventions`

Reasoning:

- they are primarily schema or convention libraries rather than operational layered packages
- they do not model the repository's main application/package layering as clearly as the operational packages do
- forcing them into this branch would blur the architectural rules we are trying to make explicit

### 2.1 shell

Likely roles:

- `cli-shell`
- `cli-package-json-parser`

Observed examples:

- `packages/riviere-cli/src/shell/cli.ts`
- `tools/dev-workflow-v2/src/shell/cli.ts`

Current rollout note:

- `packages/riviere-cli/src/shell/cli.ts` also exports `parsePackageJson`; for the first rollout slice, treat that helper as `cli-package-json-parser` rather than forcing it into `cli-shell`

### 2.2 entrypoint

Likely roles:

- `cli-entrypoint`

Observed examples:

- `packages/riviere-cli/src/features/extract/entrypoint/extract.ts`
- `packages/riviere-cli/src/features/query/entrypoint/components.ts`
- `packages/riviere-cli/src/features/builder/entrypoint/add-component.ts`
- `tools/dev-workflow-v2/src/entrypoint/workflow-cli.ts`

Guidance:

- `tools/dev-workflow-v2/src/entrypoint/workflow-cli.ts` currently looks like a specialized CLI entrypoint, not a separate top-level role
- create a dedicated `workflow-entrypoint` role only if its deterministic rules differ from normal CLI entrypoints

### 2.3 command

Likely roles:

- `command-use-case`
- `write-use-case`
- `workflow-command`

Observed examples:

- `packages/riviere-cli/src/features/extract/commands/run-extraction.ts`
- `packages/riviere-cli/src/features/builder/commands/add-component.ts`

### 2.4 query

Likely roles:

- `query-service`
- `query-facade`

Observed examples:

- `packages/riviere-query/src/features/querying/queries/RiviereQuery.ts`
- `packages/riviere-query/src/features/querying/queries/component-queries.ts`
- `packages/riviere-query/src/features/querying/queries/compare-by-code-point.ts`

Updated naming direction:

- use `query-service` as the canonical read-side function role
- `query-service` must live in `queries/` and must remain read-only
- keep `query-facade` as a separate query-layer role for class-based query APIs such as `RiviereQuery`
- helper functions such as `compare-by-code-point.ts` should stay under `query-service` rather than creating a separate `query-calculation` role

### 2.5 domain

Likely roles:

- `entity`
- `value-object`
- `domain-service`
- `domain-event`
- `domain-error`
- `application-error`

Guidance:

- stay lean with domain labels
- do not use a broad domain label when a more accurate role is needed
- if a file does not fit the existing domain labels cleanly, create a better label rather than forcing the wrong one
- do not use `domain-model` as a catch-all label; in this repository, the domain is the whole model, so the role names should be more precise than that

Observed examples:

- `packages/riviere-cli/src/features/extract/domain/detect-connections-per-module.ts`
- `packages/riviere-cli/src/features/extract/domain/enrich-per-module.ts`
- `tools/dev-workflow-v2/src/workflow-definition/domain/output-messages.ts`

Current interpretation:

- `tools/dev-workflow-v2/src/workflow-definition/domain/output-messages.ts` is a pure stateless domain service for now, even though the file name suggests the area may be acting as a dumping ground

### 2.6 infra

Likely roles:

- `external-client`
- `repository`
- `cli-output-writer`
- `cli-formatter`
- `cli-input-mapper`
- `infra-error`

Observed examples:

- `packages/riviere-cli/src/features/extract/infra/mappers/present-extraction-result.ts`
- `packages/riviere-cli/src/features/extract/infra/external-client/create-configured-project.ts`
- `tools/dev-workflow-v2/src/infra/github/get-pr-feedback.ts`
- `tools/dev-workflow-v2/src/infra/cli/git.ts`

Architecture direction:

- external-system wrappers should converge on `infra/external-client/`
- transport-specific CLI boundaries should converge on `infra/cli/input/` and `infra/cli/output/`
- feature-specific CLI output handling should live under `features/{feature}/infra/cli/output/`
- extraction config handling should converge under `infra/persistence/`
- for this repository, code that loads and saves state should use the role `repository`
- `config-loader.ts` is better understood as persistence code than generic config code

Current recommendation:

- `tools/dev-workflow-v2/src/infra/github/get-pr-feedback.ts` behaves like an `external-client`, but its folder should be normalized toward `infra/external-client/`
- `packages/riviere-cli/src/platform/infra/persistence/extraction-config-repository.ts` should stay under `infra/persistence/` and use `repository` plus `data-store` responsibilities explicitly
- `packages/riviere-cli/src/platform/infra/cli/output/extract-output-formatter.ts` should stay under explicit CLI output structure rather than a broad presentation bucket

---

## 3. High-Value Ambiguities To Resolve

These areas likely need explicit discussion before the role catalog is finalized.

### 3.1 CLI parsing and formatting

Questions:

- Are CLI parsers/formatters/presenters entrypoint responsibilities or infra presentation responsibilities?
- Should the repo standardize on transport-first placement such as `infra/cli/presentation/` and `features/*/infra/cli/presentation/`?

### 3.2 Query package conventions

Questions:

- Should `packages/riviere-query/src/features/querying/queries/RiviereQuery.ts` be treated as a single query role or split into more specific query roles?
- Should class-based query APIs keep the `query-facade` label, or should they become a more explicit `query-api` role later?

### 3.3 Domain utility boundaries

Questions:

- Which DDD roles are actually present today and worth enforcing immediately: `entity`, `value-object`, `domain-service`, `domain-event`?
- Should `application-error` remain a domain-level concept or become explicit per-layer roles instead?
- When a pure function in `domain/` has no state, should it default to `domain-service` unless a more precise DDD role exists?

### 3.4 Error classes

Questions:

- Current preferred direction from review:
  - `domain-error`
  - `application-error`
- Current recommendation:
  - start with the simpler distinction between domain and non-domain errors
  - revisit more explicit per-layer error roles only if `application-error` becomes too broad in practice

### 3.5 Infra specialization

Questions:

- Should the ideal infra structure be responsibility-first or transport-first?
- Confirmed direction for extraction-config handling:
  - state-loading and state-saving code belongs in `infra/persistence/`
  - the role for that code is `repository`
- Should external-system wrappers always normalize to `infra/external-client/`, even when the current folder uses a tool-specific name like `infra/github/`?

---

## 4. Suggested First Implementation Slice

To keep the project minimal, the first rollout should probably start with explicit roles for:

- `cli-shell`
- `cli-entrypoint`
- `command-use-case`
- `query-service`
- `query-facade`
- `entity`
- `value-object`
- `domain-service`
- `domain-error`
- `application-error`
- `external-client`
- `repository`
- one explicit CLI presentation role family after section 3.1 is resolved
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

---

## 6. Concrete Role Catalog Draft

This section turns the reviewed inventory into a concrete first-pass catalog draft that can drive the first Oxlint spike.

### 6.1 Scope For Phase 3 Final Branch Coverage

Included roots:

- `packages/riviere-cli/src/**`
- `packages/riviere-builder/src/**`
- `packages/riviere-extract-config/src/**`
- `packages/riviere-extract-ts/src/**`
- `packages/riviere-query/src/**`
- `packages/riviere-role-enforcement/src/**`
- `tools/dev-workflow/src/**`
- `tools/dev-workflow-v2/src/**`

Excluded roots:

- `apps/eclair/**`
- `packages/riviere-schema/src/**`
- `packages/riviere-extract-conventions/src/**`

Excluded file classes:

- `*.spec.*`
- `__fixtures__/**`
- `fixtures/**`
- snapshot files
- generated outputs
- barrel-only files such as `index.ts` that declare no target symbols

### 6.2 Proposed DSL Shape

```yaml
roles:
  - name: cli-shell
    targets: [function]
    allowedLocation:
      - 'packages/*/src/shell/**/*.ts'
      - 'tools/*/src/shell/**/*.ts'
    nameMatches: '^(createProgram|main|runCli|createCli)$'
    markdownSpec: 'docs/architecture/roles/cli-shell.md'
```

The role definitions below use the same shape.

### 6.3 Role Definitions

```yaml
roles:
  - name: cli-shell
    targets: [function]
    allowedLocation:
      - 'packages/*/src/shell/**/*.ts'
      - 'tools/*/src/shell/**/*.ts'
    nameMatches: '^(createProgram|main|runCli|createCli)$'
    markdownSpec: 'docs/architecture/roles/cli-shell.md'

  - name: cli-entrypoint
    targets: [function]
    allowedLocation:
      - 'packages/*/src/features/*/entrypoint/**/*.ts'
      - 'tools/*/src/entrypoint/**/*.ts'
      - 'tools/*/features/*/entrypoint/**/*.ts'
    nameMatches: '^(create[A-Z].*Command|execute[A-Z].*|preToolUseHandler)$'
    markdownSpec: 'docs/architecture/roles/cli-entrypoint.md'

  - name: command-use-case
    targets: [function]
    allowedLocation:
      - 'packages/*/src/features/*/commands/**/*.ts'
      - 'tools/*/features/*/commands/**/*.ts'
    nameMatches: '^(add|run|execute|respond|push|merge|complete|handle)[A-Z].*'
    markdownSpec: 'docs/architecture/roles/command-use-case.md'

  - name: query-service
    targets: [function]
    allowedLocation:
      - 'packages/*/src/features/*/queries/**/*.ts'
      - 'packages/*/src/features/*/queries/*.ts'
    nameMatches: '^(query|find|get|search|trace|validate)[A-Z].*|^[a-z].*For[A-Z].*|^[a-z].*By[A-Z].*|^[a-z].*In[A-Z].*'
    markdownSpec: 'docs/architecture/roles/query-service.md'

  - name: query-facade
    targets: [class]
    allowedLocation:
      - 'packages/*/src/features/*/queries/**/*.ts'
    nameMatches: '^.*Query$'
    allowedPublicMethods:
      - components
      - links
      - validate
      - detectOrphans
      - find
      - findAll
      - componentById
      - search
      - componentsInDomain
      - componentsByType
      - domains
      - operationsFor
      - entities
      - businessRulesFor
      - transitionsFor
      - statesFor
      - entryPoints
      - traceFlow
      - diff
      - publishedEvents
      - eventHandlers
      - flows
      - searchWithFlow
      - crossDomainLinks
      - domainConnections
      - stats
      - nodeDepths
      - externalLinks
      - externalDomains
    markdownSpec: 'docs/architecture/roles/query-facade.md'

  - name: entity
    targets: [class]
    allowedLocation:
      - 'packages/*/src/features/*/domain/**/*.ts'
      - 'tools/*/src/**/domain/**/*.ts'
      - 'tools/*/platform/domain/**/*.ts'
    nameMatches: '^.*(Entity|Workflow)$'
    markdownSpec: 'docs/architecture/roles/entity.md'

  - name: value-object
    targets: [class]
    allowedLocation:
      - 'packages/*/src/features/*/domain/**/*.ts'
      - 'tools/*/src/**/domain/**/*.ts'
      - 'tools/*/platform/domain/**/*.ts'
    nameMatches: '^(ConventionalCommitTitle|NearMatch|.*Id|.*Name|.*State|.*Location)$'
    markdownSpec: 'docs/architecture/roles/value-object.md'

  - name: domain-service
    targets: [function, class]
    allowedLocation:
      - 'packages/*/src/features/*/domain/**/*.ts'
      - 'packages/*/src/platform/domain/**/*.ts'
      - 'tools/*/src/**/domain/**/*.ts'
      - 'tools/*/platform/domain/**/*.ts'
    nameMatches: '^(parse|resolve|detect|extract|evaluate|validate|format|apply|get)[A-Z].*|^.*(Builder|Inspection|Linking|Enrichment|Construction)$'
    markdownSpec: 'docs/architecture/roles/domain-service.md'

  - name: domain-error
    targets: [class]
    allowedLocation:
      - 'packages/*/src/features/*/domain/**/*.ts'
      - 'packages/*/src/platform/domain/**/*.ts'
      - 'tools/*/src/**/domain/**/*.ts'
      - 'tools/*/platform/domain/**/*.ts'
    nameMatches: '^.*Error$'
    markdownSpec: 'docs/architecture/roles/domain-error.md'

  - name: application-error
    targets: [class]
    allowedLocation:
      - 'packages/*/src/features/*/entrypoint/**/*.ts'
      - 'packages/*/src/features/*/commands/**/*.ts'
      - 'packages/*/src/features/*/queries/**/*.ts'
      - 'packages/*/src/features/*/infra/**/*.ts'
      - 'packages/*/src/platform/infra/**/*.ts'
      - 'tools/*/src/entrypoint/**/*.ts'
      - 'tools/*/src/infra/**/*.ts'
      - 'tools/*/features/*/commands/**/*.ts'
      - 'tools/*/platform/infra/**/*.ts'
    nameMatches: '^.*Error$'
    markdownSpec: 'docs/architecture/roles/application-error.md'

  - name: external-client
    targets: [function, class]
    allowedLocation:
      - 'packages/*/src/features/*/infra/external-client/**/*.ts'
      - 'packages/*/src/platform/infra/external-client/**/*.ts'
      - 'packages/*/src/platform/infra/git/**/*.ts'
      - 'tools/*/src/infra/external-client/**/*.ts'
      - 'tools/*/src/infra/github/**/*.ts'
      - 'tools/*/platform/infra/external-client/**/*.ts'
    nameMatches: '^(create|get|load|run)[A-Z].*|^.*(Client|Runner)$'
    markdownSpec: 'docs/architecture/roles/external-client.md'

  - name: repository
    targets: [function, class]
    allowedLocation:
      - 'packages/*/src/features/*/infra/persistence/**/*.ts'
      - 'packages/*/src/platform/infra/persistence/**/*.ts'
      - 'packages/*/src/platform/infra/graph-persistence/**/*.ts'
      - 'packages/*/src/platform/infra/persistence/**/*.ts'
    markdownSpec: 'docs/architecture/roles/repository.md'

  - name: cli-input-mapper
    targets: [function]
    allowedLocation:
      - 'packages/*/src/platform/infra/cli/input/**/*.ts'
      - 'packages/*/src/features/*/infra/cli/input/**/*.ts'
      - 'tools/*/platform/infra/cli/**/*.ts'
    nameMatches: '^(parse|validate)[A-Z].*'
    markdownSpec: 'docs/architecture/roles/cli-input-mapper.md'

  - name: cli-output-formatter
    targets: [function]
    allowedLocation:
      - 'packages/*/src/platform/infra/cli/output/**/*.ts'
      - 'packages/*/src/features/*/infra/cli/output/**/*.ts'
      - 'tools/*/platform/infra/cli/**/*.ts'
    nameMatches: '^(format|categorize)[A-Z].*'
    markdownSpec: 'docs/architecture/roles/cli-output-formatter.md'

  - name: cli-output-writer
    targets: [function]
    allowedLocation:
      - 'packages/*/src/platform/infra/cli/output/**/*.ts'
      - 'packages/*/src/features/*/infra/cli/output/**/*.ts'
    nameMatches: '^(present|write|output)[A-Z].*|^format(Error|Success)$'
    markdownSpec: 'docs/architecture/roles/cli-output-writer.md'
```

### 6.4 Concrete File Mapping For The Draft Catalog

| File                                                                                        | Layer        | Role                |
| ------------------------------------------------------------------------------------------- | ------------ | ------------------- |
| `packages/riviere-cli/src/shell/cli.ts`                                                     | `shell`      | `cli-shell`         |
| `tools/dev-workflow-v2/src/shell/cli.ts`                                                    | `shell`      | `cli-shell`         |
| `packages/riviere-cli/src/features/builder/entrypoint/add-component.ts`                     | `entrypoint` | `cli-entrypoint`    |
| `tools/dev-workflow-v2/src/entrypoint/workflow-cli.ts`                                      | `entrypoint` | `cli-entrypoint`    |
| `packages/riviere-cli/src/features/extract/commands/run-extraction.ts`                      | `command`    | `command-use-case`  |
| `tools/dev-workflow/features/merge-and-cleanup/commands/merge-and-cleanup.ts`               | `command`    | `command-use-case`  |
| `packages/riviere-query/src/features/querying/queries/flow-queries.ts`                      | `query`      | `query-service`     |
| `packages/riviere-query/src/features/querying/queries/compare-by-code-point.ts`             | `query`      | `query-service`     |
| `packages/riviere-query/src/features/querying/queries/RiviereQuery.ts`                      | `query`      | `query-facade`      |
| `packages/riviere-builder/src/features/building/domain/riviere-builder.ts`                  | `domain`     | `domain-service`    |
| `tools/dev-workflow-v2/src/workflow-definition/domain/output-messages.ts`                   | `domain`     | `domain-service`    |
| `packages/riviere-builder/src/features/building/domain/construction/construction-errors.ts` | `domain`     | `domain-error`      |
| `packages/riviere-cli/src/platform/infra/errors/errors.ts`                                  | `infra`      | `application-error` |
| `tools/dev-workflow-v2/src/infra/github/get-pr-feedback.ts`                                 | `infra`      | `external-client`   |
| `packages/riviere-cli/src/platform/infra/persistence/extraction-config-repository.ts`       | `infra`      | `repository`        |
| `packages/riviere-cli/src/platform/infra/graph-persistence/query-graph-loader.ts`           | `infra`      | `repository`        |
| `packages/riviere-cli/src/platform/infra/cli/input/domain-input-parser.ts`                  | `infra`      | `cli-input-mapper`  |
| `packages/riviere-cli/src/platform/infra/cli/output/extract-output-formatter.ts`            | `infra`      | `cli-formatter`     |

### 6.5 Final Decisions Before Implementation

These are the final decisions captured for the first Oxlint implementation.

1. `entity` vs `value-object` vs `domain-service`
   - Decision: keep all three roles in the first pass. These are established DDD concepts in this repository and should be enforced from the start.

2. `repository` naming strictness
   - Decision: keep the role name `repository`, but do not enforce repository-style naming in v1 because current code uses names like `config-loader` and `query-graph-loader`.

3. CLI presentation split
   - Recommendation: keep `cli-input-mapper`, `cli-output-formatter`, and `cli-output-writer` as separate roles, but allow the first implementation to scope them to known existing folders rather than forcing all current files to move first.

### 6.6 Recommended First Oxlint Slice

For the first working implementation, prioritize these roles only:

- `cli-shell`
- `cli-entrypoint`
- `command-use-case`
- `query-service`
- `query-facade`
- `entity`
- `value-object`
- `domain-service`
- `domain-error`
- `application-error`
- `external-client`
- `repository`
- `cli-input-mapper`
- `cli-formatter`
- `cli-output-writer`

This keeps the first Oxlint version focused on the agreed v1 role set without inventing extra query roles.
