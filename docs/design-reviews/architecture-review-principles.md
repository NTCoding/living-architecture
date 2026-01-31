# Architecture Review Principles

Key principles established during architecture reviews. Apply these to all future reviews.

## Application vs Library Structure

### Applications (CLI, APIs)

```text
features/
├── <feature>/
│   ├── entrypoint/     # External interface (CLI commands, HTTP routes)
│   ├── commands/       # Write operations
│   ├── queries/        # Read operations
│   └── domain/         # Feature-specific domain (if needed)
platform/
├── domain/             # Shared domain logic
└── infra/              # External clients, persistence
shell/
└── index.ts            # Composition root, wiring
```

### React Applications

Adapted for React conventions:

```text
features/
├── <feature>/
│   ├── entrypoint/     # Page components (route entry points)
│   ├── components/     # UI presentation components
│   ├── hooks/          # React hooks for this feature
│   ├── queries/        # Read operations (data transformation)
│   ├── commands/       # Write operations (if any)
│   └── domain/         # Domain logic decoupled from UI (if needed)
platform/
├── domain/             # Shared domain logic
└── infra/              # Contexts, browser APIs, utilities
shell/
├── App.tsx             # Routing, providers
└── components/         # Layout: AppShell, Header, Sidebar
```

### Domain Libraries

Libraries that provide domain logic (builders, extractors). They ARE the domain.

```text
src/
├── domain/             # All domain logic, split by concept
├── platform/           # Shared utilities
└── index.ts            # Public API exports
```

### Query Libraries

Libraries that provide read-only query capabilities over external data. No domain of their own.

```text
src/
├── queries/            # All query logic
├── platform/           # Shared utilities, test fixtures
└── index.ts            # Public API exports
```

## Commands and Queries (Not Use-Cases)

Replace `use-cases/` with explicit `commands/` and `queries/`:

| Type | Purpose | Can Write? |
|------|---------|------------|
| Command | Mutates state | Yes |
| Query | Reads state | No |

**Standard handler pattern:**
```typescript
export class XxxCommand {
  constructor(private dependency: Dependency) {}
  async execute(input: XxxInput): Promise<XxxOutput> { }
}
```

- Dependencies injected via constructor
- Single `execute` method with typed input/output
- Input/output types defined in same file

## Dependency Rules

1. **Entrypoint cannot import from platform/infra/** - forces orchestration through commands/queries
2. **Queries cannot import write infrastructure** - prevents accidental mutations
3. **Shell owns composition** - wires dependencies, passes to entrypoints

## Domain Isolation

### No Infrastructure in Domain

Libraries must be pure domain. No:
- File system operations (Node.js `fs`)
- Network calls
- Database access

Callers handle infrastructure. If convenience helpers are needed, accept dependencies via injection.

### Private State

Aggregate state must be private. Public fields allow bypassing invariant protection.

```typescript
// BAD: external code can mutate directly
public graph: BuilderGraph

// GOOD: invariants protected
private graph: BuilderGraph
```

## Immutable Patterns

Prefer immutable operations. Create new objects, replace atomically.

```typescript
// BAD: partial failure leaves inconsistent state
component.field1 = value1
component.field2 = value2  // throws - field1 already changed

// GOOD: atomic replacement
const updated = { ...component, field1: value1, field2: value2 }
this.replace(component.id, updated)
```

## File Organization

### 400 Line Limit

No file over 400 lines. Large classes become facades that delegate to smaller classes.

### Co-locate Types and Errors

No monolithic `types.ts` or `errors.ts` spanning multiple concerns. Co-locate with usage:

```text
domain/
├── construction/
│   ├── graph-construction.ts
│   ├── construction-types.ts
│   └── construction-errors.ts
├── enrichment/
│   ├── graph-enrichment.ts
│   └── enrichment-errors.ts
```

### Generic Utilities in platform/

Generic algorithms (string similarity, deduplication) go to `platform/`. Domain-specific logic stays with features.

## Validation

### Fail Fast

Validate at boundaries. `resume()` methods should validate input before restoring state. Don't let malformed data corrupt internal state.

### Value Objects

Use value objects for domain concepts. `generateComponentId()` returns `ComponentId`, not `string`. Format defined in one place.

## Review Checklist

When reviewing a package:

1. **Is it an application or library?** Structure differs.
2. **Does it have infrastructure in domain?** Remove or inject.
3. **Are there files over 400 lines?** Split into facade + delegates.
4. **Is internal state exposed?** Make private.
5. **Are there monolithic types.ts/errors.ts?** Split by concept.
6. **Are there generic utilities mixed with domain?** Extract to platform/.
7. **Does it use mutation patterns?** Consider immutable alternatives.
8. **Does resume/load validate input?** Add validation.
