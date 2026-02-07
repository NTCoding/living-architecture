# ADR-002: Allowed Folder Structures

**Status:** Accepted

## Sources of Truth

- **Code placement and layer rules:** [`development-skills:separation-of-concerns`](https://github.com/NTCoding/claude-skillz/blob/main/separation-of-concerns/SKILL.md) skill
- **Dependency enforcement:** `.dependency-cruiser.mjs`

## Standard Structure

```text
features/
├── {feature}/
│   ├── entrypoint/        ← thin translation layer
│   ├── commands/          ← write operations, strict layering
│   ├── queries/           ← read operations, minimal layering
│   ├── domain/            ← business rules (required if commands exist)
│   └── infra/             ← feature-specific infrastructure
│       ├── mappers/       ← response/format mapping
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

**entrypoint/** — Translates between external and internal formats. Parses HTTP requests, CLI arguments, or queue messages into command/query inputs. Maps results back to external responses. If you changed protocols (HTTP → CLI), you'd rewrite this layer but keep commands/ and domain/ unchanged.

**commands/** — Orchestrates write operations. Loads data, invokes domain logic, persists the result. All business rules delegated to domain/. Each command has a dedicated input type — no sharing of input DTOs, no dependency on external input types.

**queries/** — Reads and returns data without modifying anything. Can query the database directly or load domain objects for their state. No side effects, no state changes.

**domain/** — Business rules with no I/O. Validation, state transitions, invariants, calculations. Never imports from infra/, commands/, queries/, entrypoint/, or shell/.

**infra/** — Feature-specific infrastructure. Repository implementations, response mappers, format adapters, feature-specific middleware. Implements domain contracts. All code must be in sub-folders — no files at the `infra/` root.

**platform/domain/** — Shared business rules used across features. Depends on nothing.

**platform/infra/** — Shared technical concerns used across features. HTTP clients, database wrappers, logging, config, messaging.

**shell/** — Wires things together at startup. Registers routes, bootstraps frameworks, connects message brokers. No business logic.

## Local Exceptions

**React applications** extend the standard feature sub-folders with `components/` and `hooks/`. Entrypoints are page components. Shell contains routing and providers.

**Domain libraries** are the domain — no features/shell structure. Only `domain/` and `platform/`.

**Query libraries** provide read-only query capabilities — no features/shell structure. Only `queries/` and `platform/`.

**Flat packages** too small for internal layering (schemas, config, decorators) use flat `src/` with no features/platform/shell structure.

**tools/dev-workflow** uses `shell/index.ts` as a package public API surface (re-exports for NX targets), not a traditional composition root.
