# Codebase Structure

## Monorepo Layout

```text
living-architecture/
├── apps/                    # Deployable applications
│   └── <app-name>/
│       ├── src/
│       │   ├── features/
│       │   │   └── <feature>/
│       │   │       ├── entrypoint/   # API/CLI interface
│       │   │       ├── commands/     # Write operations
│       │   │       ├── queries/      # Read operations
│       │   │       └── domain/       # Domain model (if needed)
│       │   ├── platform/
│       │   │   ├── domain/           # Shared domain logic
│       │   │   └── infra/            # External clients, persistence
│       │   ├── shell/                # Composition root
│       │   └── main.ts               # Application entry point
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.lib.json
│       ├── tsconfig.spec.json
│       └── vitest.config.ts
├── packages/                # Shared libraries (publishable)
│   └── <pkg-name>/
│       ├── src/
│       │   └── index.ts          # Public exports
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.lib.json
│       └── tsconfig.spec.json
├── docs/                    # Documentation
├── nx.json                  # NX configuration
├── tsconfig.base.json       # Shared TypeScript config
├── tsconfig.json            # Root references (for editor)
├── eslint.config.mjs        # Shared ESLint config
└── pnpm-workspace.yaml      # Workspace definition
```

## Enforcement

Structural and dependency rules are enforced by [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) via `.dependency-cruiser.mjs`. Run `pnpm depcruise` to check violations. This runs automatically as part of `pnpm verify`.

## Principles

**Apps vs Packages.** Apps are deployable units (APIs, CLIs, workers). Packages are shared code published to npm and consumed by apps or other packages.

**Feature-first, layer-second.** Within each app, group by business capability, then by architectural layer.

**Dependencies point inward.** Domain depends on nothing. Application depends on domain. Infra depends on application and domain.

**No generic folders.** Every folder has domain meaning. Forbidden: `utils/`, `helpers/`, `common/`, `shared/`, `core/`, `lib/`.

**Organize by usage, not by type.** Files that are used together should live together. Avoid grouping by category (types/, models/, assertions/, validators/). Instead, co-locate related code within features or individual units.

❌ **Avoid:**
```text
feature/
├── types/
│   ├── user.ts
│   └── order.ts
├── validators/
│   ├── user-validator.ts
│   └── order-validator.ts
└── services/
    ├── user-service.ts
    └── order-service.ts
```

✅ **Prefer:**
```text
feature/
├── user/
│   ├── user.ts           # type + validator + service together
│   └── user.test.ts
└── order/
    ├── order.ts
    └── order.test.ts
```

**Priority:** Feature boundaries → Individual units → Type grouping (last resort)

**Exception:** Shared test fixtures used across multiple test files may be grouped (e.g., `test-fixtures.ts`).

**Cross-project imports use package names.** Import from `@living-architecture/[pkg-name]`, not relative paths like `../../packages/[pkg-name]`.

**Add workspace dependencies explicitly.** When importing from another project, add `"@living-architecture/[pkg-name]": "workspace:*"` to package.json.

## Layer Responsibilities

| Layer | Contains | Depends On |
|-------|----------|------------|
| entrypoint | API controllers, CLI commands, request/response mapping | commands, queries |
| commands | Write operation handlers (mutate state) | domain, infra |
| queries | Read operation handlers (return data) | domain, infra (read-only) |
| domain | Entities, value objects, domain services, domain events | Nothing |
| infra | Repositories, external clients, framework adapters | domain |

**Commands vs Queries:**
- **Commands** orchestrate write operations: load → mutate via domain → persist
- **Queries** orchestrate read operations: load → query → return
- Entrypoint calls commands or queries, never domain or infra directly
- Commands and queries use dependency injection (constructor injection, single `execute` method)

## Package Guidelines

**When to create a package:**
- Code is used by 2+ apps
- Code represents a distinct domain concept
- Code needs to be published to npm

**Package types:**
- **Domain packages:** Pure domain logic, no external dependencies
- **Feature packages:** Complete vertical slice (domain + application + infra)
- **Utility packages:** Technical utilities (logging, http-client wrappers)

**Naming:**
- Use domain language, not technical jargon
- `@living-architecture/order-processing` not `@living-architecture/order-utils`

## Per-Project Configuration

Each app/package needs a 3-file tsconfig structure:

**tsconfig.json** (editor entry point):
```json
{
  "extends": "../../tsconfig.base.json",
  "files": [],
  "references": [
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

**tsconfig.lib.json** (production build):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"],
  "references": []
}
```

**tsconfig.spec.json** (tests):

See `packages/riviere-schema/tsconfig.spec.json` for the canonical example. This uses the expanded pattern with full vitest ecosystem support (`types: ["vitest/globals", "vitest/importMeta", "vite/client", "node", "vitest"]`) and comprehensive include patterns for `.test.*`, `.spec.*`, config files, and `.d.ts` files.

The `references` array may include additional project references for test dependencies. The eclair app includes React-specific additions (jsx, lib, testing-library types).

> **Maintenance note:** When modifying test tsconfigs, verify changes against the canonical file. If `packages/riviere-schema/tsconfig.spec.json` changes, update this documentation or ensure all packages follow the new pattern.

The `references` arrays are automatically maintained by `pnpm nx sync`.

## Adding Projects

Use NX generators - don't create project folders manually.

**Add application:**
```bash
pnpm nx g @nx/node:application apps/[app-name]
```

**Add publishable package:**
```bash
pnpm nx g @nx/js:library packages/[pkg-name] --publishable --importPath=@living-architecture/[pkg-name]
```

After generation:
1. Verify/update package.json name: `@living-architecture/[project-name]`
2. Create 3-file tsconfig structure (see above)
3. Add vitest.config.ts with 100% coverage thresholds
4. Run `pnpm nx sync`
5. Update CLAUDE.md "Current packages" section

**Adding dependencies between projects:**
```json
{
  "dependencies": {
    "@living-architecture/[pkg-name]": "workspace:*"
  }
}
```
Then run `pnpm install` and `pnpm nx sync`.
