# ADR-003: riviere-cli Architecture

**Status:** Accepted
**Date:** 2026-01-27
**Deciders:** @ntcoding

## Context

riviere-cli is the command-line interface for building and querying Riviere architecture graphs. It wraps three libraries:
- `riviere-builder` - Graph construction
- `riviere-query` - Graph querying
- `riviere-extract-ts` - Component extraction from TypeScript source

The current structure has several issues:
- No clear separation between entrypoint, orchestration, and infrastructure
- Type validation logic duplicated in CLI instead of living in schema/builder packages
- Command handlers mix CLI parsing, orchestration, file I/O, and output formatting
- Shared code scattered across root-level files
- No consistent pattern for dependency injection (static imports make testing difficult)

## Decision

### 1. CLI Has No Domain Layer

The CLI is an **application layer** that exposes domain functionality. It has no domain of its own.

All domain logic lives in the library packages:
- Business rules → `riviere-builder`, `riviere-query`
- Schema validation → `riviere-schema`
- Extraction logic → `riviere-extract-ts`

The CLI's job is: parse input → orchestrate library calls → format output.

### 2. Package Structure

```text
packages/riviere-cli/src/
├── features/
│   ├── builder/
│   │   ├── entrypoint/       # CLI command definitions
│   │   └── commands/         # Write operation handlers
│   ├── extract/
│   │   ├── entrypoint/
│   │   └── commands/
│   └── query/
│       ├── entrypoint/
│       └── queries/          # Read operation handlers
├── platform/
│   └── infra/
│       ├── graph-persistence/    # Load/save graph files
│       ├── cli-presentation/     # Output formatting, error codes
│       └── config-loading/       # Extraction config resolution
└── shell/
    └── cli.ts                    # Composition root, wiring
```

**No `platform/domain/`** - The CLI delegates all domain logic to library packages.

### 3. Commands and Queries (Not Use-Cases)

Replace the generic "use-cases" concept with explicit **commands** (write operations) and **queries** (read operations).

| Type | Purpose | Can Write? |
|------|---------|------------|
| Command | Mutates state (add component, link, extract) | Yes |
| Query | Reads state (list, search, trace) | No |

This distinction:
- Makes intent explicit
- Enables simpler rules per side
- Prevents read operations from accidentally mutating state

### 4. Standard Handler Pattern

All commands and queries use dependency injection with a single `execute` method:

```typescript
export class AddComponentCommand {
  constructor(
    private graphLoader: GraphLoader,
    private graphSaver: GraphSaver
  ) {}

  async execute(input: AddComponentInput): Promise<AddComponentResult> {
    const graph = await this.graphLoader.load(input.graphPath)
    const builder = RiviereBuilder.resume(graph)
    const componentId = builder.addComponent({
      type: input.type,
      name: input.name,
      domain: input.domain,
      module: input.module,
    })
    await this.graphSaver.save(input.graphPath, builder.serialize())
    return { componentId }
  }
}
```

```typescript
export class ListComponentsQuery {
  constructor(private graphLoader: GraphLoader) {}

  async execute(input: ListComponentsInput): Promise<ComponentOutput[]> {
    const graph = await this.graphLoader.load(input.graphPath)
    const query = new RiviereQuery(graph)
    return query.allComponents().map(toComponentOutput)
  }
}
```

**Rules:**
- Dependencies injected via constructor (no static imports for infrastructure)
- Input and output types defined in the same file as the handler
- Single `execute` method with typed input/output

### 5. Entrypoint Responsibilities

Entrypoints define CLI interface and delegate to handlers:

```typescript
export function createListComponentsCommand(query: ListComponentsQuery): Command {
  return new Command('components')
    .option('--graph <path>')
    .option('--json')
    .action(async (options) => {
      const input = { graphPath: resolveGraphPath(options.graph) }
      const result = await query.execute(input)
      console.log(formatOutput(result, options.json))
    })
}
```

**Entrypoint can:**
- Define CLI options and arguments
- Parse CLI input into typed input objects
- Call command/query handlers
- Format output for display

**Entrypoint cannot:**
- Import from `platform/infra/` (enforced by lint rule)
- Contain orchestration logic
- Directly call library code (must go through handler)

### 6. Shell Owns Composition

The shell wires dependencies and passes them to entrypoints:

```typescript
// shell/cli.ts
const graphLoader = new FileSystemGraphLoader()
const graphSaver = new FileSystemGraphSaver()

const listComponentsQuery = new ListComponentsQuery(graphLoader)
const addComponentCommand = new AddComponentCommand(graphLoader, graphSaver)

program.addCommand(createListComponentsCommand(listComponentsQuery))
program.addCommand(createAddComponentCommand(addComponentCommand))
```

### 7. Dependency Inversion for External Dependencies

The extraction library (`riviere-extract-ts`) defines ports for file operations. The CLI provides adapters.

```typescript
// Port defined in riviere-extract-ts
interface ConfigReader {
  read(path: string): Promise<string>
  exists(path: string): Promise<boolean>
}

// Adapter provided by CLI
const fsConfigReader: ConfigReader = {
  read: (path) => fs.readFile(path, 'utf-8'),
  exists: (path) => fs.access(path).then(() => true).catch(() => false)
}
```

This keeps the extraction library decoupled from Node.js file system specifics.

### 8. Migration: Move Type Validation to Libraries

Current CLI contains validation logic that belongs in library packages:

| Current Location | Move To |
|------------------|---------|
| `component-types.ts` | `riviere-builder` or `riviere-schema` |
| `validation.ts` | `riviere-builder` or `riviere-schema` |
| Type-specific error classes | Co-locate with validation |

The CLI should call library validation, not implement it.

## Consequences

### Positive

- Clear separation: entrypoint (CLI) → handler (orchestration) → library (domain)
- Testable handlers via dependency injection
- Consistent patterns across all commands and queries
- No domain logic duplication between CLI and libraries
- Lint rules can enforce architectural boundaries

### Negative

- More files (separate entrypoint and handler for each command)
- Wiring boilerplate in shell
- Migration effort to restructure existing code

### Mitigations

- Handler classes are small and focused
- Shell wiring is straightforward dependency injection
- Migration can be incremental (one command at a time)

## Lint Rules

Enforce architectural boundaries:

1. **`entrypoint/` cannot import from `platform/infra/`**
   - Forces orchestration through command/query handlers

2. **`queries/` cannot import write infrastructure**
   - Prevents queries from mutating state

## Alternatives Considered

### Keep use-cases instead of commands/queries

**Why rejected:** "Use-case" is vague and doesn't distinguish read from write operations. Commands/queries make intent explicit and enable clearer rules.

### Allow queries to be called directly from entrypoint

**Why rejected:** Creates a loophole. If entrypoints can do orchestration for queries, they'll eventually do it for commands too. Consistency prevents shortcuts.

### Put validation logic in CLI

**Why rejected:** Creates two sources of truth. Validation rules belong with the domain (riviere-builder/riviere-schema). CLI should call library validation.

## Open Issues

The following issues were identified but are out of scope for this ADR:

1. **Duplicate link invariant** - `RiviereBuilder.link()` doesn't prevent duplicate links (riviere-builder concern)
2. **Value object consistency** - Some types use value objects, others use primitives (riviere-builder/schema concern)
3. **Link type semantic validation** - No validation that link types are valid for component type pairs (riviere-builder concern)

These should be addressed in separate ADRs for the respective packages.
