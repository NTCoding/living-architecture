# riviere-cli Design Analysis

## Current Structure

```text
packages/riviere-cli/src/
├── bin.ts                    # CLI entry point
├── cli.ts                    # Program assembly (shell)
├── cli.spec.ts
├── index.ts                  # Public exports
├── errors.ts                 # Error classes (mixed concerns)
├── error-codes.ts            # Error code enum
├── output.ts                 # CLI output formatting
├── component-types.ts        # Type validation & constants
├── validation.ts             # Input validators
├── graph-path.ts             # Graph path resolution
├── file-existence.ts         # File existence check
├── command-test-fixtures.ts  # Test fixtures
├── commands/
│   ├── builder/
│   │   ├── add-component.ts
│   │   ├── add-domain.ts
│   │   ├── add-source.ts
│   │   ├── check-consistency.ts
│   │   ├── component-checklist.ts
│   │   ├── component-summary.ts
│   │   ├── define-custom-type.ts
│   │   ├── enrich.ts
│   │   ├── finalize.ts
│   │   ├── init.ts
│   │   ├── link.ts
│   │   ├── link-external.ts
│   │   ├── link-http.ts
│   │   ├── link-infrastructure.ts  # Shared builder utilities
│   │   ├── add-component-fixtures.ts
│   │   └── validate.ts
│   ├── extract/
│   │   ├── extract.ts
│   │   ├── config-loader.ts
│   │   └── expand-module-refs.ts
│   └── query/
│       ├── components.ts
│       ├── component-output.ts
│       ├── domains.ts
│       ├── entry-points.ts
│       ├── load-graph.ts          # Shared query utilities
│       ├── orphans.ts
│       ├── search.ts
│       └── trace.ts
```

## Separation of Concerns Checklist

### 1. Verify features/, platform/, shell/ exist at the root of the package

**FAIL**: The package uses `commands/` structure organized by command group (builder, extract, query) rather than the mandatory `features/`, `platform/`, `shell/` structure.

### 2. Verify platform/ contains only domain/ and infra/

**FAIL**: No `platform/` directory exists.

### 3. Verify each feature contains only entrypoint/, use-cases/, domain/

**FAIL**: No feature-based structure exists. Commands mix entrypoint logic (CLI parsing), use-case orchestration, and domain logic in single files.

### 4. Verify shell/ contains no business logic

**FAIL**: `cli.ts` serves as shell but `bin.ts` has error handling logic. `cli.ts` itself is clean (just wiring).

### 5. Verify code belonging to one feature is in features/[feature]/

**FAIL**: Features are grouped by command type (builder, extract, query) not by capability. Cross-cutting concerns like graph loading appear in multiple places.

### 6. Verify shared business logic is in platform/domain/ and no dependencies between features

**FAIL**: Shared logic scattered across root-level files (`validation.ts`, `component-types.ts`, etc.) and within command directories (`load-graph.ts`, `link-infrastructure.ts`).

### 7. Verify external service wrappers are in platform/infra/

**FAIL**: File system operations are inlined in commands. No centralized infrastructure layer.

### 8. Verify custom folders (steps/, handlers/) are inside domain/, not use-cases/

**FAIL**: Structure does not follow this pattern.

### 9. Verify each function relies on same state as others in its class/file and name aligns

**PARTIAL**: Most files have cohesive functions. `component-types.ts` mixes component types, system types, API types, and link types (different domains).

### 10. Verify each file name relates to other files in its directory

**PARTIAL**: Within `commands/builder/`, names relate to builder operations. Root-level files are less cohesive.

### 11. Verify each directory name describes what all files inside have in common

**PARTIAL**: `builder/`, `extract/`, `query/` describe command groups. Root files lack organizational principle.

### 12. Verify use-cases/ contains only use-case files

**N/A**: No use-cases/ directory exists.

### 13. Verify no generic type-grouping files (types.ts, errors.ts, validators.ts) spanning multiple capabilities

**FAIL**: `errors.ts` contains error classes for multiple unrelated capabilities (package loading, config parsing, component types). `validation.ts` validates multiple unrelated concerns.

### 14. Verify entrypoint/ is thin and never imports from domain/

**FAIL**: Command files mix CLI parsing (entrypoint) with orchestration logic and direct use of domain libraries.

---

## Principle Violations

### Principle 1: Separate external clients from domain-specific code

**Violation**: File system operations (`readFile`, `writeFile`, `existsSync`) are used directly in command handlers.

Files affected:
- `commands/builder/add-component.ts:3-4` - uses `readFile`, `writeFile`
- `commands/builder/init.ts:4-5` - uses `mkdir`, `writeFile`
- `commands/extract/extract.ts:1-2` - uses `existsSync`, `readFileSync`
- `commands/extract/config-loader.ts:5-6` - uses `existsSync`, `readFileSync`

### Principle 2: Separate feature-specific from shared capabilities

**Violation**: Graph loading appears in multiple forms.

- `commands/query/load-graph.ts` - provides `withGraph()` for query commands
- `commands/builder/link-infrastructure.ts` - provides `loadGraphBuilder()` and `withGraphBuilder()` for builder commands

Both load and parse graphs but serve different command groups. The capability should be unified in `platform/`.

**Violation**: Component type validation exists in multiple files.

- `component-types.ts` - contains `isValidComponentType`, `normalizeComponentType`
- `validation.ts` - wraps these with CLI error formatting

### Principle 3: Separate intent from execution

**Violation in add-component.ts**: The action handler (lines 331-380) mixes:
- Input validation (type checking)
- Graph path resolution
- File existence checking
- Graph loading and parsing
- Component creation delegation
- Graph serialization
- Output formatting

This should be a single line invoking a use-case.

### Principle 4: Separate functions that depend on different state

**Violation in errors.ts**: Classes depend on different concerns:
- `InvalidPackageJsonError` - package.json parsing
- `ConfigSchemaValidationError` - config validation
- `ModuleRefNotFoundError` - module reference resolution
- `InvalidComponentTypeError` - component type validation

Each should live with its related capability.

**Violation in component-types.ts**: Functions validate unrelated types:
- Component types (UI, API, UseCase, etc.)
- System types (domain, bff, ui, other)
- API types (REST, GraphQL, other)
- Link types (sync, async)

### Principle 5: Separate functions that don't have related names

**Violation in validation.ts**: Contains validators for unrelated concepts:
- `validateComponentType()` - component classification
- `validateLinkType()` - connection semantics
- `validateSystemType()` - system classification
- `validateHttpMethod()` - HTTP protocol

---

## Proposed Structure

```text
packages/riviere-cli/src/
├── features/
│   ├── build-graph/
│   │   ├── entrypoint/
│   │   │   ├── add-component-command.ts
│   │   │   ├── add-domain-command.ts
│   │   │   ├── add-source-command.ts
│   │   │   ├── check-consistency-command.ts
│   │   │   ├── component-checklist-command.ts
│   │   │   ├── component-summary-command.ts
│   │   │   ├── define-custom-type-command.ts
│   │   │   ├── enrich-command.ts
│   │   │   ├── finalize-command.ts
│   │   │   ├── init-command.ts
│   │   │   ├── link-command.ts
│   │   │   ├── link-external-command.ts
│   │   │   ├── link-http-command.ts
│   │   │   └── validate-command.ts
│   │   ├── use-cases/
│   │   │   ├── add-component.ts
│   │   │   ├── add-domain.ts
│   │   │   ├── add-source.ts
│   │   │   ├── init-graph.ts
│   │   │   ├── link-components.ts
│   │   │   └── validate-graph.ts
│   │   └── domain/
│   │       ├── component-adder.ts
│   │       └── custom-property-parser.ts
│   │
│   ├── extract-components/
│   │   ├── entrypoint/
│   │   │   └── extract-command.ts
│   │   ├── use-cases/
│   │   │   └── extract-from-source.ts
│   │   └── domain/
│   │       ├── config-loader.ts
│   │       └── module-ref-expander.ts
│   │
│   └── query-graph/
│       ├── entrypoint/
│       │   ├── components-command.ts
│       │   ├── domains-command.ts
│       │   ├── entry-points-command.ts
│       │   ├── orphans-command.ts
│       │   ├── search-command.ts
│       │   └── trace-command.ts
│       ├── use-cases/
│       │   ├── list-components.ts
│       │   ├── find-orphans.ts
│       │   ├── search-graph.ts
│       │   └── trace-flow.ts
│       └── domain/
│           └── component-output.ts
│
├── platform/
│   ├── domain/
│   │   ├── component-type/
│   │   │   ├── component-type.ts
│   │   │   └── component-type-validator.ts
│   │   ├── system-type/
│   │   │   └── system-type.ts
│   │   ├── api-type/
│   │   │   └── api-type.ts
│   │   ├── link-type/
│   │   │   └── link-type.ts
│   │   ├── http-method/
│   │   │   └── http-method.ts
│   │   └── cli-error/
│   │       ├── cli-error-code.ts
│   │       └── cli-output.ts
│   │
│   └── infra/
│       ├── file-system/
│       │   ├── file-reader.ts
│       │   ├── file-writer.ts
│       │   └── file-existence.ts
│       └── graph-persistence/
│           ├── graph-loader.ts
│           └── graph-saver.ts
│
└── shell/
    ├── bin.ts
    └── cli.ts
```

---

## Key Design Improvements

### 1. Thin Entrypoints

Each command file becomes a thin adapter:

```typescript
export function createAddComponentCommand(): Command {
  return new Command('add-component')
    .description('Add a component to the graph')
    .requiredOption('--type <type>', 'Component type')
    .requiredOption('--name <name>', 'Component name')
    .action(async (options: AddComponentOptions) => {
      const input = parseAddComponentInput(options)
      const result = await addComponent(input)
      console.log(formatResult(result))
    })
}
```

### 2. Use Cases Orchestrate

```typescript
export async function addComponent(input: AddComponentInput): Promise<AddComponentResult> {
  const graph = await graphLoader.load(input.graphPath)
  const builder = RiviereBuilder.resume(graph)
  const adder = createComponentAdder(builder)
  const componentId = adder.add(input)
  await graphSaver.save(input.graphPath, builder.serialize())
  return { componentId }
}
```

### 3. Unified Graph Loading

Single `platform/infra/graph-persistence/` handles all graph I/O, eliminating duplication between builder and query commands.

### 4. Domain-Specific Errors

Error classes live with their domain:
- `platform/domain/component-type/invalid-component-type-error.ts`
- `features/extract-components/domain/module-ref-not-found-error.ts`

### 5. Split Type Validators

Each type domain gets its own module:
- `platform/domain/component-type/` - UI, API, UseCase, etc.
- `platform/domain/system-type/` - domain, bff, ui, other
- `platform/domain/link-type/` - sync, async

---

## Migration Priority

1. **High**: Create `platform/infra/graph-persistence/` to unify graph loading
2. **High**: Split `errors.ts` into domain-specific modules
3. **Medium**: Create `platform/domain/` for shared type validators
4. **Medium**: Extract use-cases from command handlers
5. **Low**: Rename `commands/` to `features/` and restructure directories
