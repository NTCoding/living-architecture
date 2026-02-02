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

**Apps vs Packages.** Apps are deployable units (APIs, CLIs, workers). Packages are shared code published to npm and consumed by apps or other packages.

## CS-001: Feature-First, Layer-Second

Within each app, group by business capability, then by architectural layer.

## CS-002: Dependencies Point Inward

Domain depends on nothing. Application depends on domain. Infra depends on application and domain.

## CS-003: No Generic Folders

Every folder has domain meaning. Forbidden: `utils/`, `helpers/`, `common/`, `shared/`, `core/`, `lib/`.

## CS-004: Organize by Usage, Not by Type

Files that are used together should live together. Avoid grouping by category (types/, models/, assertions/, validators/). Instead, co-locate related code within features or individual units.

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

## CS-005: Cross-Project Imports Use Package Names

Import from `@living-architecture/[pkg-name]`, not relative paths like `../../packages/[pkg-name]`.

## CS-006: Add Workspace Dependencies Explicitly

When importing from another project, add `"@living-architecture/[pkg-name]": "workspace:*"` to package.json.

## CS-007: Per-Project Configuration

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

## CS-008: Adding Projects

Use NX generators - don't create project folders manually.

**When to create a package:**
- Code is used by 2+ apps
- Code represents a distinct domain concept
- Code needs to be published to npm

**Package types:**
- **Domain packages:** Pure domain logic, no external dependencies
- **Feature packages:** Complete vertical slice (domain + application + infra)
- **Utility packages:** Technical utilities (logging, http-client wrappers)

**Package naming:**
- Use domain language, not technical jargon
- `@living-architecture/order-processing` not `@living-architecture/order-utils`

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

## CS-009: Vertical Slice Organization

Files must be organized by usage, not by type. Type-based grouping violates CS-004.

**Forbidden patterns:**
- Folders named: `types/`, `models/`, `validators/`, `assertions/`, `schemas/`, `interfaces/`
- Files named: `types.ts`, `models.ts`, `validators.ts`, `assertions.ts`, `schemas.ts`, `interfaces.ts`
- Any folder or file that groups items by category rather than by what uses them together

**Exception:** Test fixtures shared across multiple test files.

## CS-010: Layer Responsibility Alignment

Files in a layer directory MUST perform that layer's responsibility. Being called from that layer is irrelevant — call-site proximity is not a placement criterion.

| Layer | The file MUST... |
|-------|------------------|
| `commands/` | Orchestrate a write: load state, mutate via domain, persist |
| `queries/` | Orchestrate a read: load, transform, return |
| `domain/` | Express business rules with no I/O |
| `entrypoint/` | Wire request to command/query, map response |
| `infra/` | Adapt an external system behind an interface |

**Commands vs Queries:**
- **Commands** orchestrate write operations: load → mutate via domain → persist
- **Queries** orchestrate read operations: load → query → return
- Entrypoint calls commands or queries, never domain or infra directly
- Commands and queries use dependency injection (constructor injection, single `execute` method)

### No helpers in commands/ or queries/

`commands/` and `queries/` contain ONLY command and query files respectively. They are not dumping grounds for helpers, utilities, loaders, formatters, or any supporting logic. If code is not itself a command or query, it does not belong in these directories. Supporting logic belongs in `domain/`, `platform/domain/`, `platform/infra/`, or `infra/` depending on what it does — use the development-skills:separation-of-concerns skill to make the right choice.

### Naming principle

**`commands/` files must be named as actions (verb-object).** A command does something — its name should say what. If the filename is a noun or noun-phrase, it describes a thing, not an action, and does not belong in `commands/`.

✅ **Good** (verb-object — describes an action):
- `place-order.ts`
- `send-notification.ts`
- `publish-release.ts`

❌ **Bad** (noun/noun-phrase — describes a thing):
- `order-processor.ts`
- `notification-sender.ts`
- `release-publisher.ts`

The same principle applies in reverse to other layers — `queries/` files should describe what they retrieve, `domain/` files should be named for the concept they model.

### Checklist for `commands/` (most common misplacement)

1. Does the file produce a **side effect** (write to disk, send a message, mutate state)?
2. Does it call **domain logic** to decide what to do?
3. If you removed this file, would a **write capability** be lost, or just a read/transform capability?

If any answer is "no", the file does not belong in `commands/`.
