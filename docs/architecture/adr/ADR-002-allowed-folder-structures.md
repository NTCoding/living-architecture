# ADR-002: Allowed Folder Structures

**Status:** Accepted

## Sources of Truth

- **Code placement and layer rules:** [`development-skills:separation-of-concerns`](https://github.com/NTCoding/claude-skillz/blob/main/separation-of-concerns/SKILL.md) skill
- **Dependency enforcement:** `.dependency-cruiser.mjs`

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
│   └── infra/             ← feature-specific infrastructure
│       ├── mappers/       ← persistence/external-client mapping, not entrypoint DTOs
│       ├── middleware/    ← feature-specific middleware
│       └── persistence/   ← repository implementations
│
platform/
├── domain/                ← shared business rules (depends on nothing)
└── infra/                 ← shared technical concerns
    ├── external-clients/  ← third-party service wrappers
    ├── persistence/       ← database clients, connection pools
    ├── http/              ← shared formatters, error handling middleware
    ├── cli/               ← stdin/stdout utilities, CLI I/O helpers
    ├── messaging/         ← queue clients, event bus
    ├── config/            ← configuration loading
    └── logging/           ← structured logging

shell/                     ← thin wiring/routing only (no business logic)
```

All sub-folders within a feature are optional — include only what the feature needs.

### Layer Responsibilities

**entrypoint/** — Contains one folder per external entrypoint: `entrypoint/{entrypoint}/entrypoint.ts`. Opening `entrypoint/` should show the available entrypoints as folders. Entrypoint-specific DTOs, input mappers, and output mappers live under the relevant entrypoint folder. This layer translates between external and internal formats: it parses HTTP requests, CLI arguments, or queue messages into command/query inputs and maps results back to external responses. If you changed protocols (HTTP → CLI), you'd rewrite this layer but keep commands/ and domain/ unchanged. Entrypoints must not import `domain/` or persistence infrastructure directly.

**commands/** — Orchestrates write operations. Loads data, invokes domain logic, persists the result. All business rules delegated to domain/. Each command has a dedicated input type — no sharing of input DTOs, no dependency on external input types.

**queries/** — Reads and returns data without modifying anything. Can query the database directly or load domain objects for their state. No side effects, no state changes.

**domain/** — Business rules with no I/O. Validation, state transitions, invariants, calculations. Never imports from infra/, commands/, queries/, entrypoint/, or shell/.

**infra/** — Feature-specific infrastructure. Repository implementations, persistence mappers, external-client adapters, feature-specific middleware. Implements domain contracts. Feature-specific entrypoint DTOs, input mappers, and output mappers do not belong here; they belong under `entrypoint/{entrypoint}/`. All code must be in sub-folders — no files at the `infra/` root.

**platform/domain/** — Shared business rules used across features. Depends on nothing.

**platform/infra/** — Shared technical concerns used across features. HTTP clients, database wrappers, logging, config, messaging.

For CLI code, platform CLI infrastructure owns shared response-envelope formatting and output side effects. Generic `formatSuccess`/`formatError` style functions are CLI response formatters. Writing to stdout, stderr, files, or exiting belongs to CLI response writers. CLI error handlers are only for uncaught CLI-boundary exceptions and must not handle regular command/query failure control flow.

**shell/** — Wires things together at startup. Registers routes, bootstraps frameworks, connects message brokers. No business logic.

## Library Packages

Libraries use the same `features/` + `platform/` structure as applications. The package is NOT the feature — still wrap in `features/{name}/`. Libraries don't need `shell/` unless they wire an app.

**Entry point:** Libraries use `src/index.ts` as their package entry point — a pure barrel file containing only re-export statements, no logic. `shell/` is for app wiring only, not package exports.

## Local Exceptions

**React applications** extend the standard feature sub-folders with `components/` and `hooks/`. Entrypoints are page components. Shell contains routing and providers.

**Flat packages** too small for internal layering (schemas, config, decorators) use flat `src/` with no features/platform/shell structure.

**Claude Code plugin packages** may keep host-required prompt artifacts outside `src/` when the host loader requires fixed top-level locations. For `tools/dev-workflow-v2`, this includes command and state markdown under `tools/dev-workflow-v2/commands/` and `tools/dev-workflow-v2/states/`, hook scripts under `tools/dev-workflow-v2/hooks/`, and plugin metadata under `tools/dev-workflow-v2/.claude-plugin/`. Runtime TypeScript still belongs under `src/`.
