# ADR-002: Allowed Folder Structures

**Status:** Accepted

## Sources of Truth

- **Architecture decision:** this ADR
- **Executable enforcement:** [Rivière role enforcement](../../../.riviere/role-definitions/index.md), configured by [`.riviere/role-enforcement.config.ts`](../../../.riviere/role-enforcement.config.ts)

The ADR and executable configuration implement the same rules and must change together.

## Package Placement

Every package declared by `pnpm-workspace.yaml` must have exactly one role-enforcement configuration or be explicitly listed as unassigned.

```text
apps/
└── {app}/

packages/
└── {subdomain}/
    ├── domain-model/
    ├── published-language/
    └── use-cases/

tools/
└── {tool}/
```

Only a complete path segment named `{subdomain}` creates a subdomain boundary. Other placeholders, including `{tool}` and `{boundary}`, are ordinary path placeholders and never receive subdomain semantics. A package rule may allow imports within the same captured subdomain or across subdomains. Location rules cannot override package rules.

The executable package assignments are exactly:

```typescript
'apps/': app,
'packages/{subdomain}/domain-model': domainModel,
'packages/{subdomain}/published-language': publishedLanguage,
'packages/{subdomain}/use-cases': useCases,
'tools/': app,
```

Keys ending in `/` assign a configuration to each direct package beneath that directory. Therefore apps and tools are direct packages, while the three subdomain package types must live beneath `packages/{subdomain}/`.

The repository currently allows these package dependencies:

- An app may import use-case packages from any subdomain.
- A domain-model package may import published-language packages.
- A published-language package may not import another workspace package.
- A use-case package may import its own subdomain's domain model and published-language packages.
- No package may import an app.

A tool is an app. Its domain-model, published-language, and use-case packages live under `packages/{subdomain}/`; they cannot be nested under `tools/{tool}/`.

## App Packages

```text
src/
├── features/
│   └── {feature}/
│       └── entrypoint/
│           ├── {entrypoint}/
│           └── _platform/
│               └── cli/
├── infra/
│   └── cli/
│       └── presentation/
└── shell/
```

Features are isolated. Code in one feature cannot import another feature. A feature may import root `infra` and commands or queries exposed by subdomain use-case packages.

An entrypoint translates an external protocol into a command or query input and translates the result back into that protocol. It performs primitive shape validation only. Domain validation belongs in the command or query.

For example, an entrypoint passes a raw string through the command input:

```typescript
export interface LinkExternalInput {
  type: string | undefined
}

const result = linkExternal.execute({ type: options.linkType })
```

The command parses the value through the domain-owned value object. The value object remains the single source of truth for the allowed values:

```typescript
const parsedType = input.type === undefined ? undefined : LinkType.parse(input.type)
if (parsedType !== undefined && !parsedType.success) {
  return failure('VALIDATION_ERROR', parsedType.error)
}
```

Do not duplicate the domain's allowed values in an entrypoint union or validator.

`entrypoint/_platform` contains entrypoint code shared only within that feature's entrypoint location. The `_platform` location is importable anywhere within its parent location and nowhere outside it.

Root `infra` contains generic technical code. It cannot import application or domain code. CLI presentation formats or writes generic responses. CLI input parsing remains in the entrypoint layer, including shared parsers under a feature's private `entrypoint/_platform/cli` location.

`shell` wires the application. It may construct external clients and adapters, then pass them into app entrypoints or subdomain use cases. It contains no business decisions.

## Domain-Model Packages

```text
src/
└── domain/
    └── ...
```

A domain-model package contains one isolated subdomain model. Its internal domain folders are unrestricted. It has no features, entrypoints, use cases, data access, adapters, infra, or shell.

Domain code owns business state, rules, invariants, value objects, aggregates, domain services, domain events, and domain ports. A domain model does not import another domain model.

Ports and adapters are preferred for technical capabilities. External-package imports are not globally blocked because valid domain code includes Zod value objects and domains built around libraries such as `ts-morph`. Node capabilities such as `node:path` and `node:perf_hooks` should normally be represented by domain ports.

## Use-Case Packages

```text
src/
├── features/
│   └── {feature}/
│       ├── commands/
│       ├── queries/
│       ├── data-access/
│       │   └── {concept}/
│       └── adapters/
│           └── {adapter}/
└── infra/
    └── external-clients/
        └── {client}/
```

Features are isolated. A feature cannot import another feature.

Commands orchestrate write operations. They accept raw command input, parse domain value objects, load aggregates, invoke domain behaviour, and persist the result. Command input factories belong at the app entrypoint, not in commands.

Queries perform read use cases. A query may call multiple methods on the same query model, compose results from multiple query-model methods, map known loader failures into query-use-case errors, or coordinate multiple loaders when the concrete read genuinely needs them.

A query model is designed for a concrete query use case. For example, `list invalid components` may load an `InvalidComponents` query model, and `show graph statistics` may load `GraphStatistics`. Do not invent a generic `GraphQueryModel` merely because both read the same graph file.

Data access lives at `data-access/{concept}`. Aggregate repositories reconstruct and persist aggregates. Query-model loaders load the concrete query model needed by a query. Data-access failures are `data-access-error`; they are not domain errors.

Data access may import only aggregate and value-object roles from its own domain model. Domain services must not be called from data access. Parsing that protects an aggregate invariant belongs on the aggregate or value object and returns a clear result for the repository to handle.

Adapters implement domain ports. An adapter may import only domain-port roles from its own domain model and generic clients from root infra. It translates between the port and client APIs; it does not own business decisions or instantiate shared clients.

External clients contain generic interaction with a tool, service, filesystem, runtime, or third-party package. They do not import domain code.

## Published-Language Packages

```text
src/
└── published-language/
    ├── ...
    └── eslint-plugin/     ← optional; role enforcement disabled inside this integration
```

A published language is a minimal, stable contract intended for consumers across a boundary. It may contain published-language schemas, data structures, unions, parsers, field names, annotations, and value objects.

A published-language parser parses the published language and returns either its declared successful schema shape or its declared failure shape. Application behaviour does not belong in the published language.

## Location Rules

- Locations and imports are unrestricted until a location declares rules.
- Explicit sublocations are the only direct folders permitted inside a location.
- `allowAnySubLocations: true` permits arbitrary domain organisation and cannot be combined with explicit sublocations.
- A location with `importRules` may import its own subtree and the locations listed in `allow`. Every other location is forbidden.
- A sublocation inherits its parent's import rules unless it explicitly disables inheritance.
- Allowing a location allows its entire subtree.
- `sibling` means a configured location under the same concrete parent location.
- `root` means a configured root location in the same package.
- `ownSubdomain` means a location in another package with the same value captured from a complete `{subdomain}` path segment.
- `anySubdomain` means the named location in any package with a value captured from a complete `{subdomain}` path segment.
- A string allows every role in the named location. An object with a role list allows only those roles.
- `_platform` with `importableFrom: 'withinParentLocation'` is private to its parent location.
- Circular imports are rejected.
- Production code cannot import files excluded by `ignorePatterns`. Tests are exempt from production import rules so they can assemble fixtures across boundaries.

Package configuration keys ending in `/` apply the configuration to each direct package beneath that directory. For example, `'apps/': app` assigns the app configuration to every direct package under `apps/`; it does not assign nested packages.

## Package Entry Points

Published packages use `src/index.ts` only as their package entry point. It contains explicit exports from the files that own declarations. Nested barrel files are not allowed.

## Local Exceptions

`apps/docs` is exempt from role enforcement.

Éclair is explicitly unassigned until it has an approved configuration that honestly describes and enforces its architecture. Its existing Dependency Cruiser rules remain active.

Host-required plugin artefacts may live outside `src` when the host mandates their locations. This does not exempt runtime TypeScript from package assignment and role enforcement.
