# ADR-002: Allowed Folder Structures

**Status:** Accepted

## Sources of Truth

- **Architecture decision:** this ADR
- **Executable enforcement:** [`.riviere/role-enforcement.config.ts`](../../../.riviere/role-enforcement.config.ts)

These files must remain aligned. Any change to the architecture must update both.

## Standard Structure

```text
features/
├── {feature}/
│   ├── entrypoint/        ← one folder per external entrypoint
│   │   └── {entrypoint}/
│   │       ├── entrypoint.ts
│   │       └── ...         ← entrypoint-specific DTOs, input mappers, output mappers
│   ├── commands/          ← write operations, strict layering
│   ├── queries/           ← read operations, minimal layering
│   ├── domain/            ← business rules (required if commands exist)
│   │   └── ...            ← unrestricted domain organisation, including ports
│   ├── data-access/       ← aggregate repositories and query-model loaders
│   └── adapters/          ← implementations of domain ports
│       └── {adapter}/
│
platform/
├── adapters/              ← shared implementations of shared domain ports
│   └── {adapter}/
├── domain/                ← shared domain-aware code
└── infra/                 ← generic technical concerns; imports only infra
    ├── external-clients/
    │   └── {client}/      ← cohesive third-party tool/service clients
    └── cli/
        ├── input/         ← generic CLI input parsing
        └── presentation/  ← generic CLI response formatting and writing

shell/                     ← thin wiring/routing only (no business logic)
```

All sub-folders within a feature are optional — include only what the feature needs.

### Layer Responsibilities

**entrypoint/** — Contains one folder per external entrypoint: `entrypoint/{entrypoint}/entrypoint.ts`. Opening `entrypoint/` should show the available entrypoints as folders. Entrypoint-specific DTOs, input mappers, and output mappers live under the relevant entrypoint folder. This layer translates between external and internal formats: it parses HTTP requests, CLI arguments, or queue messages into command/query inputs and maps results back to external responses. If you changed protocols (HTTP → CLI), you'd rewrite this layer but keep commands/ and domain/ unchanged. Entrypoints must not import their feature's `domain/` or persistence infrastructure directly. They may import shared domain-aware values and behaviour from `platform/domain/`.

Feature-level `entrypoint/_platform/` contains private entrypoint code shared by entrypoints within that feature.

The `_platform/` convention applies inside any location. It is importable only from within its parent location, including the parent's other sublocations. Code outside that parent location must not import it. Code shared across features belongs in `platform/domain/` when it is domain-aware, or `platform/infra/cli/presentation/` when it is generic presentation code.

**commands/** — Orchestrates write operations. Loads data, invokes domain logic, persists the result. All business rules delegated to domain/. Each command has a dedicated input type — no sharing of input DTOs, no dependency on external input types.

**queries/** — Reads and returns data without modifying anything. Can query the database directly or load domain objects for their state. No side effects, no state changes.

**domain/** — Business rules with no I/O. Validation, state transitions, invariants, calculations, and domain-owned capability contracts. Its internal folder structure is unrestricted. Ports and adapters are preferred for technical capabilities, but direct external-package imports are reviewed rather than globally blocked because valid domain packages include `zod` for value objects and `ts-morph` where TypeScript analysis is the domain. Node capabilities such as `node:path` and `node:perf_hooks` should normally sit behind domain ports.

**data-access/** — Aggregate repositories and query-model loaders. This layer inherently knows the application state it reconstructs or persists. It is separate from generic infrastructure and must not become a home for domain behaviour.

**adapters/** — Narrow implementations of domain ports. A domain-port adapter translates between one domain port and one generic client API. It contains no domain decisions, application orchestration, direct Node API calls, third-party package calls, or coordination across multiple clients. Node and third-party calls belong to the separately enforced generic external-client role; otherwise the adapter would bypass that client contract and combine translation with external I/O. See the [`domain-port-adapter` role definition](../../../.riviere/role-definitions/domain-port-adapter.md) for the concrete Oxlint and GitHub examples.

**platform/domain/** — Shared domain-aware code used across features. It must not import other locations.

**platform/adapters/** — Shared implementations of ports owned by `platform/domain/` or a separate domain-only package. They may import their domain port and generic external-client roles, but they must not call external packages directly.

**platform/infra/** — Shared generic technical concerns used across features. It may depend only on other `platform/infra/` code and external libraries. It must not import entrypoint, use-case, domain, or unclassified internal application code.

Only configured infra sublocations are permitted. Backend and CLI packages currently permit `external-clients/{client}`, `cli/input`, and `cli/presentation`. Additions require an ADR and matching enforcement-config change. Each external client stays cohesive under `platform/infra/external-clients/{client}/`. It exposes capabilities and types belonging to the external system, knows nothing about application domain types, and can be extracted into a separate library without taking application code with it.

For CLI code, platform CLI infrastructure owns shared response-envelope formatting and output side effects. Generic `formatSuccess`/`formatError` style functions are CLI response formatters. Writing to stdout, stderr, files, or exiting belongs to CLI response writers. CLI error handlers are only for uncaught CLI-boundary exceptions and must not handle regular command/query failure control flow.

**shell/** — Wires things together at startup. It constructs generic clients and domain-port adapters, then passes them into entrypoints or use cases. No business logic and no separate `composition-root` role.

## Enforced Location Semantics

- Locations and sublocations are unrestricted by default.
- `subLocations` is the complete list of folders permitted directly inside a location.
- `allowAnySubLocations: true` permits arbitrary folders and cannot be combined with `subLocations`.
- Dependency restrictions apply to the whole location subtree. A sublocation inherits its parent rules and may tighten them, but cannot bypass them.
- Feature instances cannot import sibling feature instances. They may import `platform/**`.
- `platform/**` cannot import feature code.
- `platform/infra/**` may import only within its own infra subtree and external packages.
- `_platform` is importable only from within its parent location.
- Circular imports are rejected by RLE's Oxlint runner.

## Library Packages

Libraries use the same `features/` + `platform/` structure as applications. The package is NOT the feature — still wrap in `features/{name}/`. Libraries don't need `shell/` unless they wire an app.

**Entry point:** Libraries use `src/index.ts` as their package entry point — a pure barrel file containing only re-export statements, no logic. `shell/` is for app wiring only, not package exports.

## Local Exceptions

**React applications** extend the standard feature sub-folders with `components/` and `hooks/`. Entrypoints are page components. Shell contains routing and providers.

**Flat packages** too small for internal layering (schemas, config, decorators) use flat `src/` with no features/platform/shell structure.

**Claude Code plugin packages** may keep host-required prompt artifacts outside `src/` when the host loader requires fixed top-level locations. For `tools/dev-workflow-v2`, this includes command and state markdown under `tools/dev-workflow-v2/commands/` and `tools/dev-workflow-v2/states/`, hook scripts under `tools/dev-workflow-v2/hooks/`, and plugin metadata under `tools/dev-workflow-v2/.claude-plugin/`. Runtime TypeScript still belongs under `src/`.
