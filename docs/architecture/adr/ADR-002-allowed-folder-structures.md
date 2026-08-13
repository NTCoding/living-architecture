# ADR-002: Allowed Folder Structures

**Status:** Accepted

## Sources of Truth

- **Architecture decision:** this ADR
- **Executable enforcement:** [Rivière role enforcement](../../../.riviere/role-definitions/index.md), configured by [`.riviere/role-enforcement.config.ts`](../../../.riviere/role-enforcement.config.ts). Éclair remains outside Rivière role enforcement and is checked separately by [`.dependency-cruiser.frontend.mjs`](../../../.dependency-cruiser.frontend.mjs).

These files must remain aligned. Any change to the architecture must update both.

## Application Structure

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
data-access/                ← repositories shared by multiple features
└── {concept}/

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

**entrypoint/** — Contains one folder per external entrypoint: `entrypoint/{entrypoint}/entrypoint.ts`. Opening `entrypoint/` should show the available entrypoints as folders. Entrypoint-specific DTOs, input mappers, and output mappers live under the relevant entrypoint folder. This layer translates between external and internal formats: it parses HTTP requests, CLI arguments, or queue messages into command/query inputs and maps results back to external responses. If you changed protocols (HTTP → CLI), you'd rewrite this layer but keep commands/ and domain/ unchanged. Entrypoints must not import domain or persistence infrastructure directly. They validate only the primitive shape required by the command/query input contract, then pass those raw primitive values to the use case. The use case parses domain value objects and translates parsing failures into its result type.

For example, the `link-external` CLI accepts `--link-type` as a string. Its entrypoint passes that string straight to `LinkExternalInput`:

```typescript
export interface LinkExternalInput {
  type: string | undefined
}

const result = linkExternal.execute({
  type: options.linkType,
})
```

The command parses it using the domain-owned `LinkType` value object. The value object is the single source of truth for the allowed values and returns the result of Zod's `safeParse`, so the command handles validation without exception control flow:

```typescript
const linkTypeSchema = z.enum(['sync', 'async'])

/** @riviere-role value-object */
export class LinkType {
  declare private readonly brand: 'LinkType'
  readonly value: z.infer<typeof linkTypeSchema>

  private constructor(value: z.infer<typeof linkTypeSchema>) {
    this.value = value
  }

  static parse(value: string) {
    const parsed = linkTypeSchema.safeParse(value)
    return parsed.success
      ? { data: new LinkType(parsed.data), success: true as const }
      : parsed
  }
}

const type = input.type === undefined ? undefined : LinkType.parse(input.type)
if (type !== undefined && !type.success) {
  return failure('VALIDATION_ERROR', `Invalid link type: ${input.type}`)
}
```

Do not repeat the allowed domain values in an entrypoint input union or entrypoint validator. That would couple the external boundary to the domain rule and create a second list that can drift when the domain changes.

Feature-level `entrypoint/_platform/` contains private entrypoint code shared by entrypoints within that feature.

The `_platform/` convention applies inside any location. It is importable only from within its parent location, including the parent's other sublocations. Code outside that parent location must not import it. Code shared across features belongs in `platform/domain/` when it is domain-aware, or `platform/infra/cli/presentation/` when it is generic presentation code.

**commands/** — Orchestrates write operations. Loads data, invokes domain logic, persists the result. All business rules delegated to domain/. Each command has a dedicated input type — no sharing of input DTOs, no dependency on external input types.

**queries/** — Reads and returns data without modifying anything. Can query the database directly or load domain objects for their state. No side effects, no state changes.

**domain/** — Business rules with no I/O. Validation, state transitions, invariants, calculations, and domain-owned capability contracts. Its internal folder structure is unrestricted. Ports and adapters are preferred for technical capabilities, but direct external-package imports are reviewed rather than globally blocked because valid domain packages include `zod` for value objects and `ts-morph` where TypeScript analysis is the domain. Node capabilities such as `node:path` and `node:perf_hooks` should normally sit behind domain ports.

**data-access/** — Aggregate repositories and query-model loaders. This layer inherently knows the application state it reconstructs or persists. It is separate from generic infrastructure and must not become a home for domain behaviour.

Feature-owned data access lives under `features/{feature}/data-access/{concept}/`. When one aggregate is used by multiple features in the same application package, its single repository lives under package-level `data-access/{concept}/`; do not duplicate the repository or make one feature import another feature's private data-access location.

**adapters/** — Narrow implementations of domain ports. A domain-port adapter translates between one domain port and one generic client API. It contains no domain decisions, application orchestration, direct Node API calls, third-party package calls, or coordination across multiple clients. Node and third-party calls belong to the separately enforced generic external-client role; otherwise the adapter would bypass that client contract and combine translation with external I/O. See the [`domain-port-adapter` role definition](../../../.riviere/role-definitions/domain-port-adapter.md) for the concrete Oxlint and GitHub examples.

**platform/domain/** — Shared domain-aware code used across features. It must not import other locations.

**platform/adapters/** — Shared implementations of ports owned by `platform/domain/` or a separate domain-only package. They may import their domain port and generic external-client roles, but they must not call external packages directly.

**platform/infra/** — Shared generic technical concerns used across features. It may depend only on other `platform/infra/` code and external libraries. It must not import entrypoint, use-case, domain, or unclassified internal application code.

Only configured infra sublocations are permitted. Backend and CLI packages currently permit `external-clients/{client}`, `cli/input`, and `cli/presentation`. Additions require an ADR and matching enforcement-config change. Each external client stays cohesive under `platform/infra/external-clients/{client}/`. It exposes capabilities and types belonging to the external system, knows nothing about application domain types, and can be extracted into a separate library without taking application code with it.

For CLI code, platform CLI infrastructure owns shared response-envelope formatting and output side effects. Generic `formatSuccess`/`formatError` style functions are CLI response formatters. Writing to stdout, stderr, files, or exiting belongs to CLI response writers. CLI error handlers are only for uncaught CLI-boundary exceptions and must not handle regular command/query failure control flow.

**shell/** — Wires things together at startup. It constructs generic clients and domain-port adapters, then passes them into entrypoints or use cases. No business logic and no separate `composition-root` role.

## Enforced Location Semantics

- Locations and sublocations are unrestricted by default.
- Explicit `.subLocation()` entries are the complete list of folders permitted directly inside a location.
- `allowAnySubLocations: true` permits arbitrary folders and cannot be combined with explicit sublocations.
- Imports are unrestricted until a location declares `importRules`.
- A location with import rules may import its own subtree, locations inherited from its parent, and locations listed in `allow`. Every other location is forbidden.
- A sublocation inherits its parent's import rules by default. `inheritParentImportRules: false` explicitly disables that inheritance.
- `siblingOrRoot` allows configured locations with that name when they are either a sibling or a package-root location in the same package. It does not permit another package.
- Location globs express other import relationships. Cross-package globs begin with `**/`.
- Allowing a location allows its whole subtree. Allowing one sibling does not allow any other sibling.
- Feature instances cannot import sibling feature instances. They may import `platform/**`.
- Feature domain may import shared `platform/domain`; feature isolation prevents it importing another feature's domain.
- `platform/domain` cannot import any other location. Imports within its own concrete location remain allowed.
- `platform/**` cannot import feature code.
- `platform/infra/**` may import only within its own infra subtree and external packages.
- `_platform` is importable only from within its parent location.
- Circular imports are rejected by the role-enforcement Oxlint runner.

## Package Configurations

Every source package must be assigned to one Rivière role-enforcement configuration or explicitly listed as unassigned. This prevents a new package silently escaping architecture enforcement.

### Application

Application packages use the `features/`, optional package-level `data-access/`, `platform/`, and optional `shell/` structure above. A feature cannot import another feature. Shared application code belongs in package-level `data-access/` when it reconstructs an aggregate used by multiple features, or in `platform/` when it is shared domain-aware code, a port adapter, or generic infrastructure.

### Domain Model

A domain-model package contains one isolated domain model under `src/domain/`:

```text
domain/
└── ...                    ← unrestricted domain organisation
```

It has no `features/`, `platform/`, or `shell/` locations. Its domain cannot import another domain model. It may import a published-language package because the published language defines the interoperable structures the domain consumes or produces.

### Published Language

A published-language package defines an interoperable language under `src/published-language/`:

```text
published-language/
└── ...                    ← schemas, data structures, unions, parsers and value objects
```

Only the roles in `publishedLanguageRoles` plus `value-object` are permitted there. A published language cannot import another internal location. A package whose published annotations have associated ESLint integration may also contain `src/eslint/`; it is outside the published language and cannot contain role-bearing exports.

### Package Entry Points

Published packages use `src/index.ts` only as their package entry point. It contains explicit public exports pointing directly to the files that own those declarations; do not add nested barrel files. `shell/` is app wiring, not a package-export location.

## Local Exceptions

**Éclair** is not assigned to Rivière role enforcement yet. Its existing boundaries remain checked by `.dependency-cruiser.frontend.mjs`; adding it to role enforcement requires an approved configuration that honestly describes and enforces its roles and locations.

**Claude Code plugin packages** may keep host-required prompt artifacts outside `src/` when the host loader requires fixed top-level locations. For `tools/dev-workflow-v2`, this includes command and state markdown under `tools/dev-workflow-v2/commands/` and `tools/dev-workflow-v2/states/`, hook scripts under `tools/dev-workflow-v2/hooks/`, and plugin metadata under `tools/dev-workflow-v2/.claude-plugin/`. Runtime TypeScript still belongs under `src/`.
